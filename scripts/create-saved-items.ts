import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function createSavedItemsTable() {
  console.log("🔧 Creating saved_items table...")

  try {
    // Create table
    await sql`
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
      )
    `
    console.log("✅ Table created")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS saved_items_workspace_id_idx ON saved_items(workspace_id)`
    await sql`CREATE INDEX IF NOT EXISTS saved_items_user_id_idx ON saved_items(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS saved_items_type_idx ON saved_items(type)`
    await sql`CREATE INDEX IF NOT EXISTS saved_items_is_favorite_idx ON saved_items(is_favorite)`
    console.log("✅ Indexes created")

    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_saved_items_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("✅ Trigger function created")

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS saved_items_updated_at ON saved_items
    `
    await sql`
      CREATE TRIGGER saved_items_updated_at
        BEFORE UPDATE ON saved_items
        FOR EACH ROW
        EXECUTE FUNCTION update_saved_items_updated_at()
    `
    console.log("✅ Trigger created")

    console.log("\n🎉 saved_items table setup complete!")
  } catch (error) {
    console.error("❌ Error creating table:", error)
    process.exit(1)
  }
}

createSavedItemsTable()
