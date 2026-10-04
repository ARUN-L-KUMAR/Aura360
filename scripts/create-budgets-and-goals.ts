import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("🚀 Creating budgets and financial_goals tables...")

  try {
    // 1. Budgets table
    await sql`
      CREATE TABLE IF NOT EXISTS "budgets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "category" text NOT NULL,
        "amount" numeric(12, 2) NOT NULL,
        "period" varchar(20) DEFAULT 'monthly' NOT NULL,
        "month" varchar(7),
        "alert_threshold" integer DEFAULT 80 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `
    console.log("✅ Budgets table created")

    // Indexes for budgets
    await sql`CREATE INDEX IF NOT EXISTS "budgets_workspace_id_idx" ON "budgets" ("workspace_id");`
    await sql`CREATE INDEX IF NOT EXISTS "budgets_user_id_idx" ON "budgets" ("user_id");`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "budgets_workspace_user_month_category_idx" ON "budgets" ("workspace_id", "user_id", "month", "category");`
    console.log("✅ Budgets indexes created")

    // 2. Financial Goals table
    await sql`
      CREATE TABLE IF NOT EXISTS "financial_goals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "target_amount" numeric(12, 2) NOT NULL,
        "current_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
        "target_date" date,
        "category" text DEFAULT 'Savings',
        "color" varchar(30) DEFAULT '#3b82f6',
        "notes" text,
        "status" varchar(20) DEFAULT 'in_progress' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `
    console.log("✅ Financial goals table created")

    // Indexes for financial goals
    await sql`CREATE INDEX IF NOT EXISTS "financial_goals_workspace_id_idx" ON "financial_goals" ("workspace_id");`
    await sql`CREATE INDEX IF NOT EXISTS "financial_goals_user_id_idx" ON "financial_goals" ("user_id");`
    await sql`CREATE INDEX IF NOT EXISTS "financial_goals_status_idx" ON "financial_goals" ("status");`
    console.log("✅ Financial goals indexes created")

    console.log("🎉 All tables and indexes successfully created in database!")
  } catch (err) {
    console.error("❌ Migration error:", err)
    process.exit(1)
  }
}

runMigration()
