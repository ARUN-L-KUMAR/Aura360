/**
 * AI Multimodal Receipt & Invoice Scanner Service
 * Powered by Google Gemini Vision
 */

import { geminiClient } from "../gemini-client"
import type { AIUsageMetadata } from "../types"

export interface ScannedReceiptItem {
  name: string
  quantity?: number
  price: number
}

export interface ScannedReceiptResult {
  merchant: string
  amount: number
  date: string // YYYY-MM-DD
  tax?: number | null
  category: string
  paymentMethod: "upi" | "card" | "cash" | "bank_transfer" | "other"
  lineItems: ScannedReceiptItem[]
  receiptNumber?: string | null
  notes?: string | null
  confidence: number
  usage?: AIUsageMetadata
}

const SYSTEM_PROMPT = `You are a high-accuracy AI financial auditor and receipt OCR specialist.
Your task is to analyze the uploaded receipt, bill, or invoice image and extract structured financial data in strict JSON.

Rules:
1. "merchant": The store, business, vendor, or restaurant name (e.g. Starbucks, Reliance Digital, Uber, Shell).
2. "amount": The final total amount paid or payable (numeric number, without currency symbols).
3. "date": The date of transaction in YYYY-MM-DD format. If only day and month are visible, use current year ${new Date().getFullYear()}. If no date is visible, use today's date ${new Date().toISOString().split("T")[0]}.
4. "tax": Itemized tax / GST / VAT amount if listed, else null.
5. "category": Pick the best matching category from:
   - "Food & Dining" (restaurants, cafes, food delivery)
   - "Groceries" (supermarkets, vegetables, provisions)
   - "Shopping" (clothing, electronics, retail goods)
   - "Transportation" (fuel, cabs, transit, flights, parking)
   - "Healthcare" (pharmacies, clinics, doctors)
   - "Utilities & Bills" (electricity, water, broadband, mobile)
   - "Entertainment" (movies, games, events)
   - "Personal Care" (salon, cosmetics, spa)
   - "Travel" (hotels, bookings)
   - "Other"
6. "paymentMethod": Infer from bill if visible ("upi", "card", "cash", "bank_transfer", or "other").
7. "lineItems": Array of individual products/services purchased with name, quantity (number), and price (number).
8. "receiptNumber": Invoice, bill, or tax invoice ID if visible, else null.
9. "notes": Any summary notes or vendor address details.
10. "confidence": Number from 0 to 100 representing your extraction clarity confidence.

Output strict JSON:
{
  "merchant": string,
  "amount": number,
  "date": "YYYY-MM-DD",
  "tax": number | null,
  "category": string,
  "paymentMethod": "upi" | "card" | "cash" | "bank_transfer" | "other",
  "lineItems": [{ "name": string, "quantity": number, "price": number }],
  "receiptNumber": string | null,
  "notes": string | null,
  "confidence": number
}`

export async function scanReceiptWithGemini(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<ScannedReceiptResult> {
  const prompt = "Please scan this receipt or invoice image and extract all transaction details into JSON."

  const { data, usage } = await geminiClient.generateJson<ScannedReceiptResult>(
    {
      prompt,
      systemPrompt: SYSTEM_PROMPT,
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
    {
      model: "gemini-flash-latest",
      config: {
        temperature: 0.1,
      },
    }
  )

  // Clean and sanitize
  const amount = typeof data.amount === "number" ? Math.abs(data.amount) : parseFloat(String(data.amount || "0"))
  const dateStr = data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
    ? data.date
    : new Date().toISOString().split("T")[0]

  return {
    merchant: data.merchant?.trim() || "Store Receipt",
    amount: isNaN(amount) ? 0 : Math.round(amount * 100) / 100,
    date: dateStr,
    tax: data.tax ? parseFloat(String(data.tax)) : null,
    category: data.category?.trim() || "Shopping",
    paymentMethod: data.paymentMethod || "card",
    lineItems: Array.isArray(data.lineItems) ? data.lineItems : [],
    receiptNumber: data.receiptNumber || null,
    notes: data.notes || null,
    confidence: typeof data.confidence === "number" ? Math.min(100, Math.max(10, data.confidence)) : 90,
    usage,
  }
}
