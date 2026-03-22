import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function updateSkincareTable() {
  console.log("🔧 Updating skincare table to v2...")

  try {
    // 1. Update routine_time enum
    console.log("Updating routine_time enum...")
    await sql`ALTER TYPE routine_time ADD VALUE IF NOT EXISTS 'weekly'`;
    await sql`ALTER TYPE routine_time ADD VALUE IF NOT EXISTS 'optional'`;
    console.log("✅ routine_time enum updated");

    // 2. Create skincare_status enum
    console.log("Creating skincare_status enum...");
    await sql`
      DO $$ BEGIN
        CREATE TYPE skincare_status AS ENUM ('owned', 'need_to_buy', 'finished');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✅ skincare_status enum created");

    // 3. Create skincare_body_part enum
    console.log("Creating skincare_body_part enum...");
    await sql`
      DO $$ BEGIN
        CREATE TYPE skincare_body_part AS ENUM ('face', 'hair', 'body', 'oral', 'general');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✅ skincare_body_part enum created");

    // 4. Add new columns to skincare table
    console.log("Adding new columns to skincare table...");
    await sql`ALTER TABLE skincare ADD COLUMN IF NOT EXISTS body_part skincare_body_part DEFAULT 'face' NOT NULL`;
    await sql`ALTER TABLE skincare ADD COLUMN IF NOT EXISTS status skincare_status DEFAULT 'owned' NOT NULL`;
    await sql`ALTER TABLE skincare ADD COLUMN IF NOT EXISTS routine_order INTEGER DEFAULT 0`;
    console.log("✅ New columns added");

    // 5. Create new index for body_part
    console.log("Creating index for body_part...");
    await sql`CREATE INDEX IF NOT EXISTS skincare_body_part_idx ON skincare(body_part)`;
    console.log("✅ Index created");

    console.log("\n🎉 skincare table update to v2 complete!");
  } catch (error) {
    console.error("❌ Error updating skincare table:", error)
    process.exit(1)
  }
}

updateSkincareTable()
