import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function createSkincareTable() {
  console.log("🔧 Creating skincare table...")

  try {
    // Create routine_time enum if it doesn't exist
    await sql`
      DO $$ BEGIN
        CREATE TYPE routine_time AS ENUM ('morning', 'evening', 'both');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log("✅ Enum type created/verified")

    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS skincare (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        brand TEXT,
        category TEXT NOT NULL,
        routine_time routine_time,
        frequency TEXT,
        purchase_date DATE,
        expiry_date DATE,
        price DECIMAL(10, 2),
        rating INTEGER,
        notes TEXT,
        image_url TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log("✅ Table created")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS skincare_workspace_id_idx ON skincare(workspace_id)`
    await sql`CREATE INDEX IF NOT EXISTS skincare_user_id_idx ON skincare(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS skincare_category_idx ON skincare(category)`
    await sql`CREATE INDEX IF NOT EXISTS skincare_routine_time_idx ON skincare(routine_time)`
    console.log("✅ Indexes created")

    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_skincare_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("✅ Trigger function created")

    // Create trigger
    await sql`DROP TRIGGER IF EXISTS skincare_updated_at ON skincare`
    await sql`
      CREATE TRIGGER skincare_updated_at
        BEFORE UPDATE ON skincare
        FOR EACH ROW
        EXECUTE FUNCTION update_skincare_updated_at()
    `
    console.log("✅ Trigger created")

    console.log("\n🎉 skincare table setup complete!")
  } catch (error) {
    console.error("❌ Error creating table:", error)
    process.exit(1)
  }
}

createSkincareTable()
