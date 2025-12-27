-- ============================================
-- COMPREHENSIVE MIGRATION: All Module Tables
-- ============================================
-- Run this script in your NeonDB console to create all missing tables

-- 1. TIME LOGS TABLE
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  category TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_logs_workspace_id_idx ON time_logs(workspace_id);
CREATE INDEX IF NOT EXISTS time_logs_user_id_idx ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS time_logs_start_time_idx ON time_logs(start_time);
CREATE INDEX IF NOT EXISTS time_logs_category_idx ON time_logs(category);

-- 2. SAVED ITEMS TABLE
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

CREATE INDEX IF NOT EXISTS saved_items_workspace_id_idx ON saved_items(workspace_id);
CREATE INDEX IF NOT EXISTS saved_items_user_id_idx ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS saved_items_type_idx ON saved_items(type);
CREATE INDEX IF NOT EXISTS saved_items_is_favorite_idx ON saved_items(is_favorite);

-- 3. SKINCARE TABLE
CREATE TABLE IF NOT EXISTS skincare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  routine_time TEXT NOT NULL, -- morning, evening, both
  products_used TEXT[],
  skin_condition TEXT,
  notes TEXT,
  mood TEXT,
  weather TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS skincare_workspace_id_idx ON skincare(workspace_id);
CREATE INDEX IF NOT EXISTS skincare_user_id_idx ON skincare(user_id);
CREATE INDEX IF NOT EXISTS skincare_date_idx ON skincare(date);
CREATE INDEX IF NOT EXISTS skincare_routine_time_idx ON skincare(routine_time);

-- 4. PROFILE TABLE (if needed)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  location TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_workspace_id_idx ON profiles(workspace_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

-- Time Logs trigger
CREATE OR REPLACE FUNCTION update_time_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_logs_updated_at
  BEFORE UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_time_logs_updated_at();

-- Saved Items trigger
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

-- Skincare trigger
CREATE OR REPLACE FUNCTION update_skincare_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skincare_updated_at
  BEFORE UPDATE ON skincare
  FOR EACH ROW
  EXECUTE FUNCTION update_skincare_updated_at();

-- Profiles trigger
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify all tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
