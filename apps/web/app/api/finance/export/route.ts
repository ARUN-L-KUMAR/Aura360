import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions } from "@/lib/db"
import { eq, and, gte, lte, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)

    const format = searchParams.get("format") || "csv"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const typeFilter = searchParams.get("type")
    const category = searchParams.get("category")

    const conditions = [
      eq(transactions.workspaceId, context.workspaceId),
      eq(transactions.userId, context.userId),
    ]

    if (startDate) {
      conditions.push(gte(transactions.date, startDate))
    }
    if (endDate) {
      conditions.push(lte(transactions.date, endDate))
    }
    if (typeFilter && typeFilter !== "all") {
      conditions.push(eq(transactions.type, typeFilter as any))
    }
    if (category && category !== "all" && category !== "ALL") {
      conditions.push(eq(transactions.category, category))
    }

    const items = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date))

    const timestamp = new Date().toISOString().split("T")[0]

    // JSON Format
    if (format === "json") {
      return new NextResponse(JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalRecords: items.length,
        transactions: items,
      }, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="aura360_finance_export_${timestamp}.json"`,
        },
      })
    }

    // CSV / TSV Format
    const delimiter = format === "tsv" ? "\t" : ","
    const headers = [
      "ID",
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount",
      "Payment Method",
      "Notes",
      "Is Recurring",
      "Tags",
      "Created At",
    ]

    const escapeField = (val: any) => {
      if (val === null || val === undefined) return ""
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const rows = items.map((t) => [
      escapeField(t.id),
      escapeField(t.date),
      escapeField(t.type),
      escapeField(t.category),
      escapeField(t.description),
      escapeField(t.amount),
      escapeField(t.paymentMethod || "other"),
      escapeField(t.notes || ""),
      escapeField(t.metadata?.isRecurring ? "Yes" : "No"),
      escapeField((t.tags || []).join("; ")),
      escapeField(t.createdAt ? new Date(t.createdAt).toISOString() : ""),
    ])

    const csvBody = [
      headers.map(escapeField).join(delimiter),
      ...rows.map((r) => r.join(delimiter)),
    ].join("\r\n")

    // Prefix with UTF-8 BOM (\uFEFF) for Excel compatibility
    const csvWithBom = `\uFEFF${csvBody}`

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": `${format === "tsv" ? "text/tab-separated-values" : "text/csv"}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="aura360_finance_export_${timestamp}.${format === "tsv" ? "tsv" : "csv"}"`,
      },
    })
  } catch (error: any) {
    console.error("[GET /api/finance/export error]:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export financial data" },
      { status: 500 }
    )
  }
}

