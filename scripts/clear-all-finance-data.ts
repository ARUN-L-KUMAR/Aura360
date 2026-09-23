/**
 * Clear All Finance Data
 * Deletes all transactions, wallet ledger, and wallet balances
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

async function clearAllData() {
  console.log("🗑️  Clearing all finance data...")

  try {
    // Delete all transactions
    await sql`DELETE FROM transactions`
    console.log("✅ Cleared transactions table")

    // Delete all wallet ledger entries
    await sql`DELETE FROM wallet_ledger`
    console.log("✅ Cleared wallet_ledger table")

    // Delete all wallet balances
    await sql`DELETE FROM wallet_balances`
    console.log("✅ Cleared wallet_balances table")

    console.log("\n🎉 All finance data cleared successfully!")
  } catch (error) {
    console.error("❌ Error clearing data:", error)
    process.exit(1)
  }
}

clearAllData()
