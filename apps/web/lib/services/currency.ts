/**
 * Currency Conversion & Multi-Currency Engine
 * Handles exchange rates, conversions, and multi-currency balances with offline fallbacks.
 */

export interface ExchangeRateMap {
  [currency: string]: number
}

// Fallback rates relative to USD ($1.00 USD)
const FALLBACK_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  INR: 86.8,    // 1 USD = ~86.8 INR
  EUR: 0.95,    // 1 USD = ~0.95 EUR
  GBP: 0.81,    // 1 USD = ~0.81 GBP
  AED: 3.67,    // 1 USD = ~3.67 AED
  CAD: 1.42,    // 1 USD = ~1.42 CAD
  SGD: 1.35,    // 1 USD = ~1.35 SGD
  JPY: 154.5,   // 1 USD = ~154.5 JPY
  AUD: 1.57,    // 1 USD = ~1.57 AUD
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  CAD: "CA$",
  SGD: "SG$",
  JPY: "¥",
  AUD: "A$",
}

interface CacheEntry {
  rates: ExchangeRateMap
  timestamp: number
}

let ratesCache: CacheEntry | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Fetch latest exchange rates with USD as reference base
 */
export async function getExchangeRates(): Promise<ExchangeRateMap> {
  const now = Date.now()
  if (ratesCache && now - ratesCache.timestamp < CACHE_TTL_MS) {
    return ratesCache.rates
  }

  try {
    // Attempt free open exchange rates or public endpoint with short timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      next: { revalidate: 3600 },
    }).catch(() => null)

    clearTimeout(timeoutId)

    if (res && res.ok) {
      const data = await res.json()
      if (data && data.rates) {
        ratesCache = {
          rates: { ...FALLBACK_RATES_TO_USD, ...data.rates },
          timestamp: now,
        }
        return ratesCache.rates
      }
    }
  } catch (err) {
    // Silently fall back to built-in exchange rates
  }

  ratesCache = {
    rates: FALLBACK_RATES_TO_USD,
    timestamp: now,
  }
  return FALLBACK_RATES_TO_USD
}

/**
 * Converts an amount from one currency to another using reference rates
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const from = (fromCurrency || "USD").toUpperCase()
  const to = (toCurrency || "USD").toUpperCase()

  if (from === to || isNaN(amount) || amount === 0) {
    return amount
  }

  const rates = await getExchangeRates()

  const fromRate = rates[from] || FALLBACK_RATES_TO_USD[from] || 1.0
  const toRate = rates[to] || FALLBACK_RATES_TO_USD[to] || 1.0

  // (amount / fromRate) converts to USD base, then * toRate converts to target currency
  const inUSD = amount / fromRate
  const converted = inUSD * toRate

  return Math.round(converted * 100) / 100
}

/**
 * Synchronous conversion with static fallback rates for instant UI calculation
 */
export function convertCurrencySync(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const from = (fromCurrency || "USD").toUpperCase()
  const to = (toCurrency || "USD").toUpperCase()

  if (from === to || isNaN(amount) || amount === 0) {
    return amount
  }

  const rates = ratesCache?.rates || FALLBACK_RATES_TO_USD
  const fromRate = rates[from] || FALLBACK_RATES_TO_USD[from] || 1.0
  const toRate = rates[to] || FALLBACK_RATES_TO_USD[to] || 1.0

  const inUSD = amount / fromRate
  return Math.round(inUSD * toRate * 100) / 100
}

/**
 * Format money with standard locale and symbol
 */
export function formatMoney(amount: number | string, currency: string = "INR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount
  const code = (currency || "INR").toUpperCase()
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `

  const formattedNum = num.toLocaleString(code === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `${symbol}${formattedNum}`
}

