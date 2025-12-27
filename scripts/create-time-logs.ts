import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function createTimeLogsTable() {
  console.log("🔧 Creating time_logs table...")

  try {
    // Create table
    await sql`
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
      )
    `
    console.log("✅ Table created")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS time_logs_workspace_id_idx ON time_logs(workspace_id)`
    await sql`CREATE INDEX IF NOT EXISTS time_logs_user_id_idx ON time_logs(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS time_logs_start_time_idx ON time_logs(start_time)`
    await sql`CREATE INDEX IF NOT EXISTS time_logs_category_idx ON time_logs(category)`
    console.log("✅ Indexes created")

    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_time_logs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("✅ Trigger function created")

    // Create trigger
    await sql`DROP TRIGGER IF EXISTS time_logs_updated_at ON time_logs`
    await sql`
      CREATE TRIGGER time_logs_updated_at
        BEFORE UPDATE ON time_logs
        FOR EACH ROW
        EXECUTE FUNCTION update_time_logs_updated_at()
    `
    console.log("✅ Trigger created")

    console.log("\n🎉 time_logs table setup complete!")
  } catch (error) {
    console.error("❌ Error creating table:", error)
    process.exit(1)
  }
}

createTimeLogsTable()
