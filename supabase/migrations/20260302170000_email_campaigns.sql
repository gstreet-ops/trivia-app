-- Email templates for reusable campaign content
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Campaign history for persistent tracking of sent broadcasts
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  segment_criteria jsonb DEFAULT '{}',
  recipient_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  fail_count integer NOT NULL DEFAULT 0,
  scheduled_for timestamptz,
  sent_at timestamptz,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Commissioners+ can manage their community's templates
CREATE POLICY "Commissioners can manage templates" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = email_templates.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'commissioner')
    )
  );

-- Commissioners+ can manage their community's campaigns
CREATE POLICY "Commissioners can manage campaigns" ON email_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = email_campaigns.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'commissioner')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_community ON email_templates(community_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_community ON email_campaigns(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status) WHERE status IN ('scheduled', 'sending');
