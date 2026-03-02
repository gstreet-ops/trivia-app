-- Site Builder: one generated site per community
CREATE TABLE IF NOT EXISTS community_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id bigint NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  rendered_html text,
  slug text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  custom_domain text,
  published_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one site per community for now
CREATE UNIQUE INDEX idx_community_sites_community ON community_sites(community_id);
-- Slugs must be globally unique for public URLs
CREATE UNIQUE INDEX idx_community_sites_slug ON community_sites(slug);

ALTER TABLE community_sites ENABLE ROW LEVEL SECURITY;

-- Anyone can read published sites; commissioners can read drafts
CREATE POLICY "community_sites_read" ON community_sites
  FOR SELECT USING (
    status = 'published' OR
    community_id IN (
      SELECT cm.community_id FROM community_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner')
    )
  );

-- Commissioners+ can write their community's site
CREATE POLICY "community_sites_write" ON community_sites
  FOR ALL USING (
    community_id IN (
      SELECT cm.community_id FROM community_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'commissioner')
    )
  );
