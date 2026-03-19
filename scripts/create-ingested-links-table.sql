-- Create ingested_links table for universal link ingestion cache and routing
CREATE TABLE IF NOT EXISTS ingested_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  suggested_module TEXT NOT NULL,
  confidence NUMERIC(4,3),
  metadata JSONB,
  last_fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ingested_links_workspace_id_idx ON ingested_links(workspace_id);
CREATE INDEX IF NOT EXISTS ingested_links_user_id_idx ON ingested_links(user_id);
CREATE INDEX IF NOT EXISTS ingested_links_source_idx ON ingested_links(source);
CREATE INDEX IF NOT EXISTS ingested_links_type_idx ON ingested_links(type);
CREATE INDEX IF NOT EXISTS ingested_links_normalized_url_idx ON ingested_links(normalized_url);

CREATE UNIQUE INDEX IF NOT EXISTS ingested_links_workspace_user_url_idx
  ON ingested_links(workspace_id, user_id, normalized_url);
