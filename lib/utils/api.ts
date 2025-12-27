/**
 * API utility for making fetch requests
 * Next.js 16 requires absolute URLs for fetch in server components
 */

/**
 * Get the base URL for API calls
 * Works in both client and server components
 */
export function getBaseUrl(): string {
  // Browser
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Server - use environment variable or localhost
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  return 'http://localhost:3000'
}

/**
 * Build an absolute API URL
 */
export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getBaseUrl()}${normalizedPath}`
}
