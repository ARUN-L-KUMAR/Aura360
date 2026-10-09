import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// Safe to run more than once: only creates what is missing, never touches existing data.
async function run() {
  console.log("🚀 Verifying / Creating fashion_profiles table...")
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "fashion_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "fashion_profiles_user_id_idx" ON "fashion_profiles" ("user_id");`
    await sql`CREATE INDEX IF NOT EXISTS "fashion_profiles_workspace_id_idx" ON "fashion_profiles" ("workspace_id");`
    console.log("🎉 fashion_profiles table ready in database!")
  } catch (err) {
    console.error("❌ Error setting up fashion_profiles table:", err)
    process.exit(1)
  }
}

run()
