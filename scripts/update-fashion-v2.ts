import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function updateFashionTableV2() {
  console.log("🔧 Updating fashion_items table to v2...")

  try {
    // 1. Add new columns to fashion_items table
    console.log("Adding new columns to fashion_items table...")
    await sql`ALTER TABLE fashion_items ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good'`;
    await sql`ALTER TABLE fashion_items ADD COLUMN IF NOT EXISTS occasion TEXT[]`;
    await sql`ALTER TABLE fashion_items ADD COLUMN IF NOT EXISTS season TEXT[]`;
    console.log("✅ New columns added");

    // 2. Create indexes for new fields
    console.log("Creating indexes for new fields...");
    await sql`CREATE INDEX IF NOT EXISTS fashion_items_condition_idx ON fashion_items(condition)`;
    await sql`CREATE INDEX IF NOT EXISTS fashion_items_occasion_idx ON fashion_items USING GIN(occasion)`;
    await sql`CREATE INDEX IF NOT EXISTS fashion_items_season_idx ON fashion_items USING GIN(season)`;
    console.log("✅ Indexes created");

    console.log("\n🎉 fashion_items table update to v2 complete!");
  } catch (error) {
    console.error("❌ Error updating fashion_items table:", error)
    process.exit(1)
  }
}

updateFashionTableV2()
