import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// Safe to run more than once: only creates what is missing, never touches existing data
// (including the existing "notifications" table, which is left exactly as it is).
async function run() {
  console.log("🚀 Verifying / Creating notification engine tables...")
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_idx" ON "notification_preferences" ("user_id");`

    await sql`
      CREATE TABLE IF NOT EXISTS "push_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" text NOT NULL,
        "platform" text,
        "device_name" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "last_seen_at" timestamp DEFAULT now() NOT NULL
      );
    `
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "push_tokens_token_idx" ON "push_tokens" ("token");`
    await sql`CREATE INDEX IF NOT EXISTS "push_tokens_user_id_idx" ON "push_tokens" ("user_id");`

    await sql`
      CREATE TABLE IF NOT EXISTS "notification_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "dedupe_key" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "notification_log_user_key_idx" ON "notification_log" ("user_id", "dedupe_key");`
    await sql`CREATE INDEX IF NOT EXISTS "notification_log_created_at_idx" ON "notification_log" ("created_at");`

    console.log("🎉 notification_preferences, push_tokens and notification_log are ready!")
  } catch (err) {
    console.error("❌ Error setting up notification tables:", err)
    process.exit(1)
  }
}

run()
