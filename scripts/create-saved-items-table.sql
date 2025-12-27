-- Create saved_items table
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  image_url TEXT,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for saved_items
CREATE INDEX IF NOT EXISTS saved_items_workspace_id_idx ON saved_items(workspace_id);
CREATE INDEX IF NOT EXISTS saved_items_user_id_idx ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS saved_items_type_idx ON saved_items(type);
CREATE INDEX IF NOT EXISTS saved_items_is_favorite_idx ON saved_items(is_favorite);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_items_updated_at
  BEFORE UPDATE ON saved_items
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_items_updated_at();
