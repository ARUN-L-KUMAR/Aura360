import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function run() {
  console.log("🚀 Verifying / Creating fashion_outfits table...")
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "fashion_outfits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "item_ids" uuid[] NOT NULL,
        "occasion" text,
        "vibe" text,
        "notes" text,
        "wear_count" integer DEFAULT 0 NOT NULL,
        "last_worn_date" date,
        "worn_dates" date[],
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `
    await sql`CREATE INDEX IF NOT EXISTS "fashion_outfits_workspace_id_idx" ON "fashion_outfits" ("workspace_id");`
    await sql`CREATE INDEX IF NOT EXISTS "fashion_outfits_user_id_idx" ON "fashion_outfits" ("user_id");`
    console.log("🎉 fashion_outfits table ready in database!")
  } catch (err) {
    console.error("❌ Error setting up fashion_outfits table:", err)
    process.exit(1)
  }
}

run()
