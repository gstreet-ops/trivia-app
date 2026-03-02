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

-- System can insert sync logs (service role bypasses RLS, but explicit policy for clarity)
CREATE POLICY "System can insert sync logs" ON email_sync_logs
  FOR INSERT WITH CHECK (true);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_integrations_community ON email_integrations(community_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_email_sync_logs_community ON email_sync_logs(community_id, created_at DESC);
