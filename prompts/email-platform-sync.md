# Email Platform Auto-Sync — Claude Code Prompt

Copy everything below and paste into Claude Code:

---

cd ~/trivia-app && cat << 'PROMPT'

## Task: Email Platform API Auto-Sync

Replace the "Coming Soon" placeholder in the Email Platform Auto-Sync section of IntegrationsTab with a fully functional integration system. When a new subscriber signs up via the `<gstreet-subscribe>` widget, their email is automatically synced to the site owner's email marketing platform.

### Architecture

```
Widget subscriber signup
  → INSERT into subscribers table
  → DB trigger calls Edge Function
  → Edge Function reads email_integrations config
  → Edge Function POSTs to Mailchimp/ConvertKit/Beehiiv/Webhook
  → Logs result to sync_logs table
```

### Step 1: Database Migration

Create migration file `supabase/migrations/email_integrations.sql`:

```sql
-- Email platform integration configs per community
CREATE TABLE IF NOT EXISTS email_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('mailchimp', 'convertkit', 'beehiiv', 'webhook')),
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',
  -- config shape per platform:
  -- mailchimp:   { "api_key": "xxx-us21", "server": "us21", "list_id": "abc123" }
  -- convertkit:  { "api_key": "xxx", "form_id": "12345" }
  -- beehiiv:     { "api_key": "xxx", "publication_id": "pub_xxx" }
  -- webhook:     { "url": "https://...", "secret": "optional-hmac-secret" }
  last_sync_at timestamptz,
  last_sync_status text, -- 'success' | 'error'
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, platform)
);

-- Sync attempt log for debugging
CREATE TABLE IF NOT EXISTS email_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES email_integrations(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  platform text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  response_code integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_logs ENABLE ROW LEVEL SECURITY;

-- Commissioners+ can read/write their community's integrations
CREATE POLICY "Commissioners can manage integrations" ON email_integrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = email_integrations.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'commissioner')
    )
  );

CREATE POLICY "Commissioners can view sync logs" ON email_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = email_sync_logs.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'commissioner')
    )
  );

-- System can insert sync logs
CREATE POLICY "System can insert sync logs" ON email_sync_logs
  FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_email_integrations_community ON email_integrations(community_id) WHERE enabled = true;
CREATE INDEX idx_email_sync_logs_community ON email_sync_logs(community_id, created_at DESC);
```

Run this migration via Supabase SQL Editor.

### Step 2: Edge Function — `sync-subscriber`

Create `supabase/functions/sync-subscriber/index.ts`:

This Edge Function is called when a new subscriber is added. It:
1. Looks up enabled integrations for the subscriber's community
2. Sends the subscriber data to each enabled platform
3. Logs the result

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  subscriber_id: string;
  community_id: number;
  email: string;
  name?: string;
}

async function syncToMailchimp(config: Record<string, string>, email: string, name?: string) {
  const { api_key, server, list_id } = config;
  // Mailchimp uses Basic auth with any-string:api_key
  const auth = btoa(`anystring:${api_key}`);
  
  // Use PUT (add-or-update) to avoid duplicate errors
  const emailHash = await crypto.subtle.digest(
    'MD5', 
    new TextEncoder().encode(email.toLowerCase())
  ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

  const body: Record<string, unknown> = {
    email_address: email,
    status_if_new: 'subscribed',
  };
  if (name) {
    const parts = name.trim().split(/\s+/);
    body.merge_fields = {
      FNAME: parts[0] || '',
      LNAME: parts.slice(1).join(' ') || '',
    };
  }

  const res = await fetch(
    `https://${server}.api.mailchimp.com/3.0/lists/${list_id}/members/${emailHash}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  return { status: res.status, ok: res.ok, data: await res.json() };
}

async function syncToConvertKit(config: Record<string, string>, email: string, name?: string) {
  const { api_key, form_id } = config;
  const body: Record<string, unknown> = {
    api_key,
    email,
  };
  if (name) body.first_name = name.split(/\s+/)[0];

  const res = await fetch(
    `https://api.convertkit.com/v3/forms/${form_id}/subscribe`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return { status: res.status, ok: res.ok, data: await res.json() };
}

async function syncToBeehiiv(config: Record<string, string>, email: string) {
  const { api_key, publication_id } = config;
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${publication_id}/subscriptions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, reactivate_existing: true }),
    }
  );
  return { status: res.status, ok: res.ok, data: await res.json() };
}

async function syncToWebhook(config: Record<string, string>, email: string, name?: string, communityId?: number) {
  const { url, secret } = config;
  const payload = {
    event: 'new_subscriber',
    email,
    name: name || null,
    community_id: communityId,
    timestamp: new Date().toISOString(),
  };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Optional HMAC signature
  if (secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(payload)));
    headers['X-GStreet-Signature'] = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return { status: res.status, ok: res.ok, data: await res.text() };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth — accept either JWT or service role key
    const authHeader = req.headers.get('Authorization');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // If JWT provided, verify it
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { error } = await supabaseAdmin.auth.getUser(token);
      if (error) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body: SyncRequest = await req.json();
    const { community_id, email, name } = body;

    if (!community_id || !email) {
      return new Response(JSON.stringify({ error: 'community_id and email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch enabled integrations for this community
    const { data: integrations, error: intErr } = await supabaseAdmin
      .from('email_integrations')
      .select('*')
      .eq('community_id', community_id)
      .eq('enabled', true);

    if (intErr) throw intErr;
    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ message: 'No enabled integrations', synced: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const integration of integrations) {
      let result;
      try {
        switch (integration.platform) {
          case 'mailchimp':
            result = await syncToMailchimp(integration.config, email, name);
            break;
          case 'convertkit':
            result = await syncToConvertKit(integration.config, email, name);
            break;
          case 'beehiiv':
            result = await syncToBeehiiv(integration.config, email);
            break;
          case 'webhook':
            result = await syncToWebhook(integration.config, email, name, community_id);
            break;
          default:
            result = { ok: false, status: 0, data: 'Unknown platform' };
        }
      } catch (err) {
        result = { ok: false, status: 0, data: err.message };
      }

      const logStatus = result.ok ? 'success' : 'error';
      const errorMsg = result.ok ? null : (typeof result.data === 'string' ? result.data : JSON.stringify(result.data));

      // Log the sync attempt
      await supabaseAdmin.from('email_sync_logs').insert({
        community_id,
        integration_id: integration.id,
        subscriber_email: email,
        platform: integration.platform,
        status: logStatus,
        response_code: result.status,
        error_message: errorMsg,
      });

      // Update integration last_sync info
      await supabaseAdmin.from('email_integrations').update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: logStatus,
        last_sync_error: errorMsg,
        updated_at: new Date().toISOString(),
      }).eq('id', integration.id);

      results.push({ platform: integration.platform, status: logStatus });
    }

    return new Response(JSON.stringify({ synced: results.length, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sync-subscriber error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Step 3: Auto-trigger on subscriber INSERT

Add a database trigger + function that auto-calls the Edge Function when a new subscriber is added. Create this in the SQL editor:

```sql
-- Function to call sync-subscriber edge function
CREATE OR REPLACE FUNCTION notify_email_sync()
RETURNS trigger AS $$
DECLARE
  has_integration boolean;
BEGIN
  -- Quick check: does this community have any enabled integrations?
  SELECT EXISTS(
    SELECT 1 FROM email_integrations
    WHERE community_id = NEW.community_id AND enabled = true
  ) INTO has_integration;

  -- Only call the Edge Function if there's something to sync
  IF has_integration THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-subscriber',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'subscriber_id', NEW.id,
        'community_id', NEW.community_id,
        'email', NEW.email,
        'name', NEW.name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: This requires pg_net extension. If pg_net is not available,
-- we'll use client-side sync instead (the widget calls the Edge Function directly after insert).
-- Check if pg_net is available first:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- CREATE TRIGGER on_new_subscriber
--   AFTER INSERT ON subscribers
--   FOR EACH ROW EXECUTE FUNCTION notify_email_sync();
```

**IMPORTANT:** The pg_net approach requires the pg_net extension which may not be enabled. As a reliable fallback, we'll also add client-side sync in the subscribe widget. The trigger is a bonus for server-side reliability.

### Step 4: Client-side sync in subscribe widget

In `apps/quiz-embed/src/web-component/gstreet-subscribe-element.js`, AFTER the successful Supabase insert, also call the Edge Function:

Find the section where the subscriber is successfully inserted (the `.insert()` call that sets state to 'success'). After the insert succeeds, add:

```javascript
// Auto-sync to email platforms (fire-and-forget)
try {
  fetch(`${SUPABASE_URL}/functions/v1/sync-subscriber`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({
      subscriber_id: insertedData?.[0]?.id,
      community_id: communityId,
      email: this._email,
      name: this._name || undefined,
    }),
  }).catch(() => {}); // Silent fail — subscriber is already saved to DB
} catch {}
```

This ensures sync happens even without pg_net, and is idempotent (Mailchimp PUT, ConvertKit subscribe, and Beehiiv reactivate_existing all handle duplicates).

### Step 5: Admin UI — Replace "Coming Soon" section in IntegrationsTab

Replace the entire `{/* Section I: Email Platform Auto-Sync */}` block (lines ~659-721 in IntegrationsTab.js) with a fully functional integration management UI.

The new section should:

1. **Platform selector** — radio buttons for Mailchimp, ConvertKit, Beehiiv, Custom Webhook
2. **Config form** per platform:
   - **Mailchimp**: API Key input, Server prefix (auto-extracted from key, e.g. "us21"), Audience/List ID input
   - **ConvertKit**: API Key input, Form ID input
   - **Beehiiv**: API Key input, Publication ID input
   - **Webhook**: URL input, HMAC Secret input (optional)
3. **Test Connection** button — calls the Edge Function with a test payload (use a fake email like `test-connection@gstreet.dev`) and shows success/error
4. **Enable/Disable toggle** — saves to `email_integrations` table
5. **Sync status** — shows last sync time, status, and error if any
6. **Recent sync log** — last 10 entries from `email_sync_logs` for this community

**State management:**
- On mount, fetch `email_integrations` for this community
- On save, upsert to `email_integrations` (unique on community_id + platform)
- Test connection calls the edge function with a special `test: true` flag
- All API keys are stored in Supabase (RLS-protected, commissioner+ only)

**UI style guidelines:**
- Use the existing `s` (styles) object from IntegrationsTab
- Georgetown colors: navy #041E42, gray #54585A
- Collapsible section like other IntegrationsTab sections
- Status badges: green for connected/success, red for error, gray for not configured
- Each platform card should have its emoji icon (🐵 Mailchimp, ✉️ ConvertKit, 🐝 Beehiiv, 🔗 Webhook)

**Security:**
- API keys are stored in Supabase with RLS (commissioner+ only)
- API keys are NEVER exposed in the frontend embed widget — only the Edge Function reads them
- The Edge Function uses the service role key to read integrations
- The anon key call from the widget only triggers the sync; it can't read the API keys

### Step 6: Update Edge Function for test mode

Add support for a `test: true` flag in the sync-subscriber Edge Function. When test is true:
- Use a test email that won't actually subscribe anyone (or use dry_run where platforms support it)
- For Mailchimp: use the /lists/{list_id} GET endpoint to verify the API key and list exist (no subscriber created)
- For ConvertKit: use GET /v3/forms/{form_id}?api_key=xxx to verify
- For Beehiiv: use GET /v2/publications/{pub_id} to verify
- For Webhook: POST with a `{ "event": "test", "timestamp": "..." }` payload
- Return the test result without logging to sync_logs

### Files to create/modify

**Create:**
- `supabase/migrations/email_integrations.sql` — new tables + RLS
- `supabase/functions/sync-subscriber/index.ts` — new Edge Function

**Modify:**
- `apps/quiz-embed/src/admin/tabs/IntegrationsTab.js` — replace Coming Soon section (~lines 659-721) with live integration UI
- `apps/quiz-embed/src/web-component/gstreet-subscribe-element.js` — add fire-and-forget sync call after successful insert

### Testing

1. Run the SQL migration in Supabase SQL Editor
2. Deploy the Edge Function: `supabase functions deploy sync-subscriber`
3. In the embed admin, go to Integrations → Email Platform Auto-Sync
4. Select Mailchimp, enter test credentials, click Test Connection
5. Enable the integration
6. Go to a page with `<gstreet-subscribe>`, enter an email
7. Check the sync log in the admin — should show success
8. Check Mailchimp audience — subscriber should appear

PROMPT