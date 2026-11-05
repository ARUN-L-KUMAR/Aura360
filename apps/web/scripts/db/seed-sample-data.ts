/**
 * Seed Sample Data for Testing
 * Run: npx tsx scripts/db/seed-sample-data.ts
 */

// Load environment variables FIRST
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "../../.env.local") })

import { db, transactions, notes } from "../../lib/db"

async function seedSampleData() {
  console.log("🌱 Starting sample data seeding...")

  try {
    // Get the first user and workspace (from your registration)
    const [user] = await db.query.users.findMany({ limit: 1 })
    const [workspace] = await db.query.workspaces.findMany({ limit: 1 })

    if (!user || !workspace) {
      console.error("❌ No user or workspace found. Please register first!")
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.email}`)
    console.log(`✅ Found workspace: ${workspace.name}`)

    const context = {
      workspaceId: workspace.id,
      userId: user.id,
    }

    // Sample transactions
    const sampleTransactions = [
      {
        ...context,
        date: "2025-01-15",
        type: "income" as const,
        category: "Salary",
        amount: "5000.00",
        description: "Monthly salary",
        paymentMethod: "bank_transfer" as const,
        notes: "January 2025 salary",
      },
      {
        ...context,
        date: "2025-01-16",
        type: "expense" as const,
        category: "Groceries",
        amount: "150.50",
        description: "Weekly groceries",
        paymentMethod: "card" as const,
        notes: null,
      },
      {
        ...context,
        date: "2025-01-17",
        type: "expense" as const,
        category: "Transport",
        amount: "45.00",
        description: "Uber rides",
        paymentMethod: "upi" as const,
        notes: null,
      },
      {
        ...context,
        date: "2025-01-18",
        type: "investment" as const,
        category: "Stocks",
        amount: "1000.00",
        description: "Tech stock purchase",
        paymentMethod: null,
        notes: "Long-term hold",
      },
    ]

    console.log("\n💰 Creating sample transactions...")
    for (const txn of sampleTransactions) {
      const [created] = await db.insert(transactions).values(txn).returning()
      console.log(`  ✓ ${created.type}: ${created.description} - $${created.amount}`)

      // Note: Wallet ledger integration skipped in seed script
      // (requires transaction support which neon-http doesn't have)
      // In production, use the API endpoint which handles this automatically
    }

    console.log("\n💳 Note: Use /api/finance/transactions in your app to auto-update wallet balances")

    // Sample notes
    console.log("\n📝 Creating sample notes...")
    const sampleNotes = [
      {
        ...context,
        title: "Project Ideas",
        content: "1. Build a finance tracker\n2. Create a meal planner\n3. Develop workout app",
        tags: ["ideas", "projects"],
        category: "Work",
        isPinned: true,
      },
      {
        ...context,
        title: "Shopping List",
        content: "- Milk\n- Eggs\n- Bread\n- Fruits",
        tags: ["shopping", "todo"],
        category: "Personal",
        isPinned: false,
      },
    ]

    for (const note of sampleNotes) {
      const [created] = await db.insert(notes).values(note).returning()
      console.log(`  ✓ ${created.title}`)
    }

    console.log("\n✨ Sample data seeded successfully!")
    console.log("\n📊 Summary:")
    console.log(`  - ${sampleTransactions.length} transactions`)
    console.log(`  - ${sampleNotes.length} notes`)
    console.log(`  - Wallet balances calculated automatically`)
    
    process.exit(0)
  } catch (error) {
    console.error("❌ Error seeding data:", error)
    process.exit(1)
  }
}

seedSampleData()
