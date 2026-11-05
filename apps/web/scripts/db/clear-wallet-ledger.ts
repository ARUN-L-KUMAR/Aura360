/**
 * Clear Wallet Ledger - Reset all wallet balances
 * 
 * WARNING: This will delete ALL wallet ledger entries and balance records
 * Use this to start fresh with wallet tracking
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function clearWalletLedger() {
  console.log("🗑️  Clearing wallet ledger and balances...")

  try {
    // Delete all wallet balances
    await sql`DELETE FROM wallet_balances`
    console.log("✅ Cleared wallet_balances table")

    // Delete all wallet ledger entries
    await sql`DELETE FROM wallet_ledger`
    console.log("✅ Cleared wallet_ledger table")

    console.log("\n🎉 Wallet ledger cleared successfully!")
    console.log("💡 All balances are now reset to ₹0.00")
    console.log("💡 You can now set your real balances using the 'Edit Balances' button")
  } catch (error) {
    console.error("❌ Error clearing wallet ledger:", error)
    process.exit(1)
  }
}

clearWalletLedger()
