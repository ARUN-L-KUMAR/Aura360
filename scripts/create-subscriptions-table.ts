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
  console.log("🚀 Verifying / Creating subscriptions table...")
  try {
    // Verify subscription_status enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log("✅ subscription_status enum verified")

    // Create subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "description" text,
        "amount" numeric(10, 2) NOT NULL,
        "currency" text DEFAULT 'INR' NOT NULL,
        "billing_cycle" text DEFAULT 'monthly' NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date,
        "next_billing_date" date,
        "status" subscription_status DEFAULT 'active' NOT NULL,
        "payment_method" payment_method,
        "category" text,
        "reminder_days" integer DEFAULT 7,
        "auto_renew" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `
    console.log("✅ subscriptions table created/verified")

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS "subscriptions_workspace_id_idx" ON "subscriptions" ("workspace_id");`
    await sql`CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" ("user_id");`
    await sql`CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status");`
    await sql`CREATE INDEX IF NOT EXISTS "subscriptions_next_billing_date_idx" ON "subscriptions" ("next_billing_date");`
    console.log("✅ subscriptions indexes created")

    console.log("🎉 Subscriptions table ready in database!")
  } catch (err) {
    console.error("❌ Error setting up subscriptions table:", err)
    process.exit(1)
  }
}

run()
