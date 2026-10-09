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
  console.log("🚀 Verifying / Creating mobile_refresh_tokens table...")
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "mobile_refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" text NOT NULL UNIQUE,
        "device_name" text,
        "expires_at" timestamp NOT NULL,
        "revoked_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "last_used_at" timestamp
      );
    `
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "mobile_refresh_tokens_hash_idx" ON "mobile_refresh_tokens" ("token_hash");`
    await sql`CREATE INDEX IF NOT EXISTS "mobile_refresh_tokens_user_id_idx" ON "mobile_refresh_tokens" ("user_id");`
    console.log("🎉 mobile_refresh_tokens table ready in database!")
  } catch (err) {
    console.error("❌ Error setting up mobile_refresh_tokens table:", err)
    process.exit(1)
  }
}

run()
