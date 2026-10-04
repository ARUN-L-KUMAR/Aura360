import { z } from "zod"
import { db, transactions, budgets, financialGoals, walletBalances } from "@/lib/db"
import { and, eq, desc, gte, lte, ilike, or } from "drizzle-orm"
import { auditCreate } from "@/lib/audit"
import { checkBudgetAlerts } from "@/lib/services/budget-alerts"
import type { AiTool } from "./types"

export const getTransactions: AiTool = {
  name: "get_transactions",
  description:
    "Fetch the user's financial transactions with optional filters for date range (from/to in YYYY-MM-DD), transaction type (income/expense/investment/transfer), category name, search term, and limit.",
  parameters: z.object({
    from: z
      .string()
      .optional()
      .describe("Start date in ISO format YYYY-MM-DD (inclusive)"),
    to: z
      .string()
      .optional()
      .describe("End date in ISO format YYYY-MM-DD (inclusive)"),
    type: z
      .enum(["income", "expense", "investment", "transfer"])
      .optional()
      .describe("Filter by transaction type"),
    category: z
      .string()
      .optional()
      .describe("Filter by category name (e.g., Food & Dining, Shopping, Salary)"),
    search: z
      .string()
      .optional()
      .describe("Keyword to match against description or category"),
    limit: z
      .number()
      .min(1)
      .max(200)
      .default(50)
      .describe("Maximum number of transactions to return (default: 50, max: 200)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(transactions.workspaceId, ctx.workspaceId),
      eq(transactions.userId, ctx.userId),
    ]

    if (args.from) {
      conditions.push(gte(transactions.date, args.from))
    }
    if (args.to) {
      conditions.push(lte(transactions.date, args.to))
    }
    if (args.type) {
      conditions.push(eq(transactions.type, args.type))
    }
    if (args.category && args.category.toLowerCase() !== "all") {
      conditions.push(eq(transactions.category, args.category))
    }
    if (args.search) {
      conditions.push(
        or(
          ilike(transactions.description, `%${args.search}%`),
          ilike(transactions.category, `%${args.search}%`)
        )!
      )
    }

    const limit = args.limit ?? 50

    const rows = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        type: transactions.type,
        category: transactions.category,
        amount: transactions.amount,
        description: transactions.description,
        paymentMethod: transactions.paymentMethod,
        notes: transactions.notes,
      })
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .limit(limit)

    return {
      count: rows.length,
      transactions: rows,
    }
  },
}

export const getBudgets: AiTool = {
  name: "get_budgets",
  description:
    "Fetch user's category budgets, optionally filtered by specific month (YYYY-MM) or category.",
  parameters: z.object({
    month: z
      .string()
      .optional()
      .describe("Specific month in YYYY-MM format"),
    category: z
      .string()
      .optional()
      .describe("Filter by category name"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(budgets.workspaceId, ctx.workspaceId),
      eq(budgets.userId, ctx.userId),
    ]

    if (args.month) {
      conditions.push(eq(budgets.month, args.month))
    }
    if (args.category) {
      conditions.push(eq(budgets.category, args.category))
    }

    const rows = await db
      .select({
        id: budgets.id,
        category: budgets.category,
        amount: budgets.amount,
        period: budgets.period,
        month: budgets.month,
        alertThreshold: budgets.alertThreshold,
      })
      .from(budgets)
      .where(and(...conditions))

    return {
      count: rows.length,
      budgets: rows,
    }
  },
}

export const getFinancialGoals: AiTool = {
  name: "get_financial_goals",
  description:
    "Fetch user's financial savings goals and sinking funds progress.",
  parameters: z.object({
    category: z
      .string()
      .optional()
      .describe("Optional category to filter goals"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(financialGoals.workspaceId, ctx.workspaceId),
      eq(financialGoals.userId, ctx.userId),
    ]

    if (args.category) {
      conditions.push(eq(financialGoals.category, args.category))
    }

    const rows = await db
      .select({
        id: financialGoals.id,
        title: financialGoals.title,
        targetAmount: financialGoals.targetAmount,
        currentAmount: financialGoals.currentAmount,
        targetDate: financialGoals.targetDate,
        category: financialGoals.category,
      })
      .from(financialGoals)
      .where(and(...conditions))
      .orderBy(desc(financialGoals.createdAt))

    return {
      count: rows.length,
      goals: rows,
    }
  },
}

export const getBalances: AiTool = {
  name: "get_balances",
  description:
    "Fetch the user's current account and wallet balances (e.g. Cash, Bank Accounts).",
  parameters: z.object({}),
  mutates: false,
  handler: async (_args, ctx) => {
    const rows = await db
      .select({
        id: walletBalances.id,
        paymentMethod: walletBalances.paymentMethod,
        currentBalance: walletBalances.currentBalance,
        updatedAt: walletBalances.updatedAt,
      })
      .from(walletBalances)
      .where(
        and(
          eq(walletBalances.workspaceId, ctx.workspaceId),
          eq(walletBalances.userId, ctx.userId)
        )
      )

    const total = rows.reduce(
      (sum, b) => sum + parseFloat(b.currentBalance || "0"),
      0
    )

    return {
      balances: rows,
      totalBalance: total.toFixed(2),
    }
  },
}

export const createTransaction: AiTool = {
  name: "create_transaction",
  description: "Create a new income, expense, investment, or transfer transaction for the user.",
  parameters: z.object({
    type: z.enum(["income", "expense", "investment", "transfer"]).describe("Transaction type"),
    amount: z.number().positive().describe("Amount in rupees (INR)"),
    category: z.string().describe("Category name (e.g. Food & Dining, Shopping, Utilities, Salary)"),
    description: z.string().optional().describe("Description or merchant/payee name"),
    date: z.string().describe("Transaction date in ISO format YYYY-MM-DD"),
    paymentMethod: z
      .enum(["cash", "upi", "card", "bank_transfer", "crypto", "other"])
      .optional()
      .default("upi")
      .describe("Payment method"),
    notes: z.string().optional().describe("Additional transaction notes"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(transactions)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        type: args.type,
        amount: String(args.amount),
        category: args.category,
        description: args.description ?? args.category,
        date: args.date,
        paymentMethod: args.paymentMethod ?? "upi",
        notes: args.notes,
      })
      .returning()

    await auditCreate(ctx, "transactions", row.id, row, { source: "ai_agent" })

    // Fire-and-forget budget alert check
    if (args.type === "expense") {
      const month = args.date.slice(0, 7) // YYYY-MM
      checkBudgetAlerts(ctx, args.category, month).catch(console.warn)
    }

    return { success: true, transaction: row }
  },
}

export const createBudget: AiTool = {
  name: "create_budget",
  description: "Create or update a category budget limit.",
  parameters: z.object({
    category: z.string().describe("Category name (e.g. Food & Dining, Shopping, Entertainment)"),
    amount: z.number().positive().describe("Budget limit amount in rupees (INR)"),
    period: z.enum(["monthly", "weekly", "yearly"]).default("monthly").describe("Budget duration period"),
    month: z.string().optional().describe("Target month in YYYY-MM format"),
    alertThreshold: z.number().min(1).max(100).default(80).describe("Alert threshold percentage (e.g. 80 for 80%)"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(budgets)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        category: args.category,
        amount: String(args.amount),
        period: args.period ?? "monthly",
        month: args.month,
        alertThreshold: args.alertThreshold ?? 80,
      })
      .returning()

    await auditCreate(ctx, "budgets", row.id, row, { source: "ai_agent" })
    return { success: true, budget: row }
  },
}


