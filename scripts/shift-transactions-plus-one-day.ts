/**
 * Shift Transactions Date by +1 Day Script
 *
 * If transactions were uploaded before the Excel date timezone bug was fixed,
 * they were stored as 1 day before the date in the Excel file.
 * This script updates all transactions by adding 1 day to their date.
 *
 * Run with:
 *   npm run db:shift-dates
 *   or
 *   npx tsx scripts/shift-transactions-plus-one-day.ts
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

async function shiftDates() {
  console.log("🔍 Checking transactions table...")

  try {
    const result = await sql`SELECT count(*)::int as count FROM transactions`
    const count = result[0]?.count ?? 0
    console.log(`📊 Found ${count} transaction record(s).`)

    if (count === 0) {
      console.log("ℹ️  Transactions table is empty. Nothing to shift.")
      return
    }

    // Inspect sample before shift
    const sampleBefore = await sql`
      SELECT id, date::text as date, description, amount 
      FROM transactions 
      ORDER BY date DESC 
      LIMIT 3
    `
    console.log("🔎 Sample transactions BEFORE shift:")
    console.table(sampleBefore)

    console.log("⏳ Shifting all transaction dates by +1 day...")
    await sql`
      UPDATE transactions 
      SET date = (date + INTERVAL '1 day')::date
    `

    // Inspect sample after shift
    const sampleAfter = await sql`
      SELECT id, date::text as date, description, amount 
      FROM transactions 
      ORDER BY date DESC 
      LIMIT 3
    `
    console.log("✅ Sample transactions AFTER shift:")
    console.table(sampleAfter)

    console.log(`✨ Successfully shifted dates forward by 1 day for all ${count} transaction(s)!`)
  } catch (error) {
    console.error("❌ Failed to shift transaction dates:", error)
    process.exit(1)
  }
}

shiftDates()
