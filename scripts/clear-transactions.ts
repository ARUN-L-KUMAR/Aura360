/**
 * Clear All Transactions Script
 *
 * Deletes all records from the `transactions` table in Neon Postgres.
 *
 * Run with:
 *   npm run db:clear-transactions
 *   or
 *   npx tsx scripts/clear-transactions.ts
 */

import { neon, neonConfig } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL is not set in .env.local")
  process.exit(1)
}

// Ensure proper endpoint URL routing for custom neon pooler domains
neonConfig.fetchEndpoint = (host) => `https://${host}/sql`

const sql = neon(process.env.DATABASE_URL)

async function clearTransactions() {
  console.log("🔍 Checking transactions table...")

  try {
    // Check count of transactions before deletion
    const result = await sql`SELECT count(*)::int as count FROM transactions`
    const count = result[0]?.count ?? 0
    console.log(`📊 Found ${count} transaction record(s).`)

    if (count === 0) {
      console.log("ℹ️  Transactions table is already empty.")
      return
    }

    console.log("🗑️  Clearing all transactions...")
    await sql`DELETE FROM transactions`

    // Verify deletion
    const verifyResult = await sql`SELECT count(*)::int as count FROM transactions`
    const remainingCount = verifyResult[0]?.count ?? 0

    if (remainingCount === 0) {
      console.log(`✅ Successfully deleted all ${count} transaction(s)!`)
      console.log("✨ Transactions table is now empty.")
    } else {
      console.warn(`⚠️ Warning: ${remainingCount} transactions still remain.`)
    }
  } catch (error) {
    console.error("❌ Failed to clear transactions:", error)
    process.exit(1)
  }
}

clearTransactions()
