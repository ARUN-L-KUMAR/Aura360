/**
 * Gemini-powered UPI transaction parser
 *
 * Extracts structured fields from raw UPI / bank-app share text.
 * Falls back to regex if GEMINI_API_KEY is not configured.
 */

export interface ParsedTransaction {
  amount: number | null
  date: string            // ISO date YYYY-MM-DD
  time: string | null     // HH:MM (24h) or null
  description: string
  category: string
  payment_method: string  // "upi" | "cash" | "card" | "bank_transfer" | "other"
  receiver: string | null // person / merchant name
  transaction_id: string | null // UTR / Ref No / Order ID
  type: "expense" | "income"
  raw_text: string
  parsed_by: "gemini" | "regex"
}

// ─── Category keywords (regex fallback) ────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["swiggy", "zomato", "food", "restaurant", "cafe", "hotel", "biryani", "pizza", "burger", "dominos", "mcdonalds", "kfc", "starbucks"],
  Transport: ["uber", "ola", "rapido", "metro", "bus", "fuel", "petrol", "diesel", "parking", "namma yatri", "bluemart"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho", "mall", "store", "shop", "zepto"],
  Bills: ["electricity", "water", "gas", "broadband", "wifi", "internet", "mobile", "recharge", "dth", "jio", "airtel", "vi", "bsnl", "tata play"],
  Entertainment: ["netflix", "prime", "hotstar", "spotify", "youtube", "movie", "theatre", "game", "bookmyshow"],
  Health: ["pharmacy", "medical", "hospital", "doctor", "apollo", "medicine", "lab", "clinic", "netmeds", "1mg"],
  Groceries: ["bigbasket", "blinkit", "zepto", "instamart", "grocery", "vegetables", "fruits", "dmart", "reliance fresh"],
  Education: ["course", "book", "udemy", "coursera", "school", "college", "fees", "tuition", "byju", "unacademy"],
  Rent: ["rent", "pg", "hostel", "flat", "apartment", "lease"],
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((kw) => lower.includes(kw))) return cat
  }
  return "Other"
}

function parseAmount(raw: string | number): number | null {
  if (typeof raw === "number") return raw > 0 ? raw : null
  const cleaned = raw.replace(/[₹$€£\s,Rs.INR]/gi, "").trim()
  const n = parseFloat(cleaned)
  return isNaN(n) || n <= 0 ? null : n
}

function parseDate(raw?: string): string {
  if (!raw) return new Date().toISOString().split("T")[0]
  try {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  } catch {}
  return new Date().toISOString().split("T")[0]
}

// ─── Regex fallback parser ─────────────────────────────────────────────────
function parseWithRegex(text: string): ParsedTransaction {
  const result: ParsedTransaction = {
    amount: null,
    date: new Date().toISOString().split("T")[0],
    time: null,
    description: text.substring(0, 200).trim(),
    category: "Other",
    payment_method: "upi",
    receiver: null,
    transaction_id: null,
    type: "expense",
    raw_text: text,
    parsed_by: "regex",
  }

  // ── Amount ────────────────────────────────────────────────────────
  const amountPatterns = [
    /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:paid|sent|received|amount[:\s]*)\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|Rs\.?|INR)/i,
    /debited\s+(?:by\s+|with\s+)?(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /deducted\s+(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:a\/c|acct|account)\s+\S+\s+(?:debited|credited)\s+(?:by\s+)?(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /credited\s+(?:by\s+|with\s+)?(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ]
  for (const p of amountPatterns) {
    const m = text.match(p)
    if (m) {
      const a = parseAmount(m[1])
      if (a) { result.amount = a; break }
    }
  }

  // ── Date ──────────────────────────────────────────────────────────
  // Skip "Avail Bal" / "Available Bal" context to avoid grabbing balance
  const safeText = text.replace(/(?:avail(?:able)?\s*bal(?:ance)?)[^.]*?[\d,]+(?:\.\d{2})?/gi, "")
  const datePatterns = [
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?)/i,
  ]
  for (const p of datePatterns) {
    const m = safeText.match(p)
    if (m) { result.date = parseDate(m[1]); break }
  }

  // ── Time ──────────────────────────────────────────────────────────
  const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i)
  if (timeMatch) {
    // Normalise to HH:MM 24h
    const raw = timeMatch[1].trim()
    const isPM = /PM/i.test(raw)
    const isAM = /AM/i.test(raw)
    const parts = raw.replace(/AM|PM/gi, "").trim().split(":").map(Number)
    let h = parts[0], m = parts[1] ?? 0
    if (isPM && h < 12) h += 12
    if (isAM && h === 12) h = 0
    result.time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  // ── Receiver ──────────────────────────────────────────────────────
  const receiverMatch = text.match(
    /(?:paid|sent|transferred|payment)\s+to\s+([^·\n\r,\(]+)/i
  )
  if (receiverMatch) result.receiver = receiverMatch[1].trim()

  // ── Transaction ID ────────────────────────────────────────────────
  const txnMatch = text.match(
    /(?:UTR|Ref(?:\s*No)?|UPI\s*Ref|Order\s*ID|Transaction\s*ID|Txn\s*ID)[:\s#]*([A-Z0-9]{8,})/i
  )
  if (txnMatch) result.transaction_id = txnMatch[1].trim()

  // ── Transaction type (income vs expense) ──────────────────────────
  if (/credited|received|cashback|refund/i.test(text)) result.type = "income"

  // ── Payment method ────────────────────────────────────────────────
  if (/google\s*pay|gpay/i.test(text))       result.payment_method = "upi"
  else if (/phone\s*pe|phonepe/i.test(text)) result.payment_method = "upi"
  else if (/paytm/i.test(text))              result.payment_method = "upi"
  else if (/cred/i.test(text))               result.payment_method = "card"
  else if (/bhim/i.test(text))               result.payment_method = "upi"
  else if (/neft|imps|rtgs/i.test(text))     result.payment_method = "bank_transfer"
  else if (/upi/i.test(text))                result.payment_method = "upi"
  else if (/card/i.test(text))               result.payment_method = "card"
  else if (/cash/i.test(text))               result.payment_method = "cash"

  // ── Category ──────────────────────────────────────────────────────
  result.category = detectCategory(result.receiver ?? result.description)

  return result
}

// ─── Gemini parser ────────────────────────────────────────────────────────
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

const GEMINI_PROMPT = (text: string) => `
You are a financial data extractor. Extract structured fields from the following UPI / bank / payment app share text.

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation):
{
  "amount": <number or null>,
  "date": "<YYYY-MM-DD or null>",
  "time": "<HH:MM in 24h format or null>",
  "receiver": "<merchant or person name or null>",
  "transaction_id": "<UTR / Ref No / Order ID or null>",
  "payment_method": "<one of: upi, cash, card, bank_transfer, other>",
  "type": "<expense or income>",
  "category": "<one of: Food, Transport, Shopping, Bills, Entertainment, Health, Groceries, Education, Rent, Other>",
  "description": "<a clean 1-line summary of the transaction>"
}

Rules:
- "amount" must be the TRANSACTION amount only — never the available balance / account balance
- "type" is "income" if the text says received/credited/refund/cashback, else "expense"
- "payment_method" is "upi" for GPay/PhonePe/BHIM/CRED UPI; "card" for credit/debit card; "bank_transfer" for NEFT/IMPS
- If a field cannot be determined, use null

Text to parse:
"""
${text}
"""
`.trim()

export async function parseTransactionText(
  text: string,
): Promise<ParsedTransaction> {
  const apiKey = process.env.GEMINI_API_KEY

  // If no API key configured, use regex immediately
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return parseWithRegex(text)
  }

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: GEMINI_PROMPT(text) }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(8000), // 8s timeout
    })

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)

    const body = await res.json()
    const rawJson: string =
      body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"

    const g = JSON.parse(rawJson)

    return {
      amount: typeof g.amount === "number" ? g.amount : null,
      date: g.date ?? new Date().toISOString().split("T")[0],
      time: g.time ?? null,
      description: g.description ?? text.substring(0, 200),
      category: g.category ?? "Other",
      payment_method: g.payment_method ?? "upi",
      receiver: g.receiver ?? null,
      transaction_id: g.transaction_id ?? null,
      type: g.type === "income" ? "income" : "expense",
      raw_text: text,
      parsed_by: "gemini",
    }
  } catch (err) {
    console.warn("[gemini-transaction-parser] Gemini failed, falling back to regex:", err)
    return parseWithRegex(text)
  }
}
