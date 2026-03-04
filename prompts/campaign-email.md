# Campaign Email with Segmentation — Claude Code Prompt

## Context

The embed admin's SubscribersTab (773 lines) already has:
- Subscriber list with search, selection, bulk actions
- Basic broadcast compose: subject + plain text body → sends to ALL active subscribers
- sendBroadcastEmail() in utils/emailService.js → calls send-email Edge Function (Resend API)
- Broadcast history (in-memory only, not persisted)
- Stats: total, active, this week counts

## Goal

Upgrade the broadcast system into a proper campaign email tool with:
1. **Subscriber segmentation** — filter recipients before sending
2. **Campaign templates** — reusable saved templates
3. **Campaign history** — persisted to database with open/click tracking readiness
4. **Scheduled sends** — queue a campaign for future delivery
5. **Improved compose UI** — template picker, segment preview, test email

## Database Migration

Create `supabase/migrations/campaign_email.sql`:

```sql
-- Campaign templates
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  body_html text,
  category text DEFAULT 'general',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaign sends (persistent history)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  body_html text,
  segment_rules jsonb DEFAULT '{}',
  segment_description text,
  recipient_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  sent_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Templates: commissioners+ can read and write for their community
CREATE POLICY "email_templates_read" ON email_templates
  FOR SELECT USING (
    community_id IN (
      SELECT cm.community_id FROM community_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner')
    )
  );

CREATE POLICY "email_templates_write" ON email_templates
  FOR ALL USING (
    community_id IN (
      SELECT cm.community_id FROM community_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner')
    )
  );

-- Campaigns: commissioners+ can read and write for their community
CREATE POLICY "email_campaigns_read" ON email_campaigns
  FOR SELECT USING (
    community_id IN (
      SELECT cm.community_id FROM community_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner')
    )
  );

CREATE POLICY "email_campaigns_write" ON email_campaigns
  FOR ALL USING (
    community_id IN (
      SELECT cm.community_id FROM community_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner')
    )
  );

-- Indexes
CREATE INDEX idx_email_templates_community ON email_templates(community_id);
CREATE INDEX idx_email_campaigns_community ON email_campaigns(community_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
```

## Segmentation Rules

Segments are defined as a `segment_rules` JSONB object applied client-side to filter the subscribers array. No new queries needed — all data is already loaded.

```javascript
// segment_rules shape:
{
  status: 'active',              // always 'active' (default)
  subscribed_after: '2026-02-01', // optional: joined after date
  subscribed_before: '2026-03-01', // optional: joined before date
  source_url_contains: 'blog',    // optional: source URL filter
  name_contains: '',              // optional: name search
  selected_ids: [],               // optional: manually selected subscriber IDs
}
```

Client-side filter function:
```javascript
function applySegment(subscribers, rules) {
  let filtered = subscribers.filter(s => s.status === 'active');
  if (rules.subscribed_after) {
    filtered = filtered.filter(s => s.subscribed_at >= rules.subscribed_after);
  }
  if (rules.subscribed_before) {
    filtered = filtered.filter(s => s.subscribed_at < rules.subscribed_before);
  }
  if (rules.source_url_contains) {
    const q = rules.source_url_contains.toLowerCase();
    filtered = filtered.filter(s => s.source_url && s.source_url.toLowerCase().includes(q));
  }
  if (rules.name_contains) {
    const q = rules.name_contains.toLowerCase();
    filtered = filtered.filter(s => s.name && s.name.toLowerCase().includes(q));
  }
  if (rules.selected_ids && rules.selected_ids.length > 0) {
    const idSet = new Set(rules.selected_ids);
    filtered = filtered.filter(s => idSet.has(s.id));
  }
  return filtered;
}
```

## SubscribersTab Changes

Replace the existing broadcast compose system with a new campaign system. The file is already 773 lines — keep it manageable by extracting the campaign UI into a separate component.

### New file: `apps/quiz-embed/src/admin/tabs/CampaignComposer.js`

This component handles the full compose flow as a modal/overlay:

**Props:** `{ community, subscribers, onClose, onSent, onToast }`

**State:**
- `step` — 'segment' | 'compose' | 'preview' | 'sending' (wizard steps)
- `segmentRules` — the filter object
- `segmentedSubscribers` — computed filtered list
- `subject`, `bodyText` — email content
- `selectedTemplate` — template ID or null
- `templates` — fetched from email_templates
- `newTemplateName` — for save-as-template
- `testEmail` — for sending test
- `scheduledFor` — datetime or null (null = send immediately)
- `sendProgress` — { sent, total }

**Step 1 — Segment:**
- Radio: "All active subscribers" or "Custom segment"
- If custom: show filter form with subscribed_after, subscribed_before, source_url_contains, name_contains
- OR "Use current selection" if parent has selected subscribers (pass selected_ids)
- Live count: "X subscribers match this segment"
- Show mini table preview of first 5 matching subscribers
- Next button

**Step 2 — Compose:**
- Template picker dropdown at top: "Start fresh" + saved templates
- Selecting a template auto-fills subject + body
- Subject input
- Body textarea (plain text, 5000 char limit)
- Merge tag hint: "Merge tags coming soon" (placeholder for future {{name}} support)
- "Save as Template" button → prompts for name, saves to email_templates
- "Send Test Email" button → sends to a single email address (input field)
- Schedule toggle: "Send now" or "Schedule for later" with datetime picker
- Next button

**Step 3 — Preview:**
- Summary card: subject, body preview (first 200 chars), recipient count, segment description
- If scheduled: show scheduled time
- Confirm/Back buttons
- Yellow warning: "This will send X emails. This action cannot be undone."

**Step 4 — Sending:**
- Progress bar with sent/total count
- Cancel button (sets ref flag)
- On completion: save campaign to email_campaigns table, show success message, call onSent()

**Template Management:**
- Fetch templates on mount from email_templates where community_id matches
- Save template: INSERT into email_templates
- Delete template: small X button next to template in picker dropdown
- Templates persist across sessions

### SubscribersTab modifications:

1. Replace `showCompose` modal with `<CampaignComposer />` component
2. Replace in-memory `broadcastHistory` with fetched `email_campaigns` from DB
3. Add "Campaign History" section showing last 10 campaigns (subject, date, status, recipient count, sent count)
4. Keep all existing subscriber management (search, select, delete, export, unsubscribe)
5. Remove old broadcast state variables: `broadcastSubject`, `broadcastBody`, `broadcastConfirm`, `sendProgress`
6. Pass `selected` subscriber IDs to CampaignComposer for "send to selected" shortcut
7. Add "Templates" section below history — list saved templates with edit/delete

### Updated SubscribersTab sections (top to bottom):
1. Title + subtitle
2. Stats row (existing)
3. Action bar: "New Campaign" button + "Templates" button + export CSV
4. Campaign History card (from email_campaigns table)
5. Subscriber table (existing)

## Send Flow

The actual send loop stays client-side (same as current broadcast). Each email is sent individually via the existing sendBroadcastEmail → Edge Function → Resend pipeline. The campaign record is updated as it progresses:

```javascript
// Before sending:
const { data: campaign } = await supabase
  .from('email_campaigns')
  .insert({
    community_id: community.id,
    subject,
    body_text: bodyText,
    segment_rules: segmentRules,
    segment_description: buildSegmentDescription(segmentRules, segmentedSubscribers.length),
    recipient_count: segmentedSubscribers.length,
    status: scheduledFor ? 'scheduled' : 'sending',
    scheduled_for: scheduledFor || null,
    sent_by: (await supabase.auth.getUser()).data.user.id,
  })
  .select()
  .single();

// During send loop (same pattern as existing):
for (const sub of segmentedSubscribers) {
  if (cancelledRef.current) break;
  const result = await sendBroadcastEmail(sub.email, subject, bodyText, community.name);
  if (result.success) successCount++;
  else failCount++;
  setSendProgress({ sent: ++sent, total });
  await new Promise(r => setTimeout(r, 200)); // rate limit
}

// After completion:
await supabase
  .from('email_campaigns')
  .update({
    status: cancelledRef.current ? 'cancelled' : 'sent',
    sent_count: successCount,
    failed_count: failCount,
    sent_at: new Date().toISOString(),
  })
  .eq('id', campaign.id);
```

**Note on scheduled sends:** For MVP, "scheduled" campaigns just save with status='scheduled' and scheduled_for timestamp. The user must return to the tab and manually trigger the send when the time comes (show a "Send Now" button on scheduled campaigns that are past due). True background scheduling would require a cron job or Supabase pg_cron, which is out of scope for this prompt.

## Tier Gating

Campaign email is a **business+ tier** feature (same as other site tools). The SubscribersTab itself is already business+ gated in AdminShell.js. No additional gating needed — if they can see the tab, they can use campaigns.

## Styling

Follow existing embed admin patterns:
- Navy #041E42 headers, Georgetown palette
- Cards with subtle borders and shadows
- Modal overlay for the composer
- Steps shown as a horizontal breadcrumb: Segment → Compose → Preview → Send
- Match existing button styles (primaryBtn, secondaryBtn from SubscribersTab)

## Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/campaign_email.sql` | 2 new tables + RLS |
| `apps/quiz-embed/src/admin/tabs/CampaignComposer.js` | Campaign wizard component (~400 lines) |

## Files to Modify

| File | Change |
|------|--------|
| `apps/quiz-embed/src/admin/tabs/SubscribersTab.js` | Replace broadcast system with CampaignComposer integration, add campaign history, add template list |

## What NOT to Do

- Do NOT modify the send-email Edge Function (the existing generic type works fine)
- Do NOT add HTML email templates in the compose UI (plain text is sufficient for MVP)
- Do NOT implement true background scheduled sends (MVP shows reminder to send manually)
- Do NOT add open/click tracking (email_campaigns table is ready for it but skip implementation)
- Do NOT change emailService.js (sendBroadcastEmail already works)
- Do NOT add a separate "Campaigns" admin tab — this lives inside SubscribersTab

## Success Criteria

1. User can create a campaign with subscriber segmentation (date range, source URL, manual selection)
2. User can save and load email templates
3. Campaign history persists to email_campaigns table and shows in SubscribersTab
4. Send flow works with progress bar and cancel support
5. Templates can be created, loaded, and deleted
6. Step-by-step wizard guides through segment → compose → preview → send
7. Existing subscriber management (search, select, delete, export) is unchanged

## Claude Code Command

```
cd ~/trivia-app && echo "Ready to implement campaign email with segmentation"
```
