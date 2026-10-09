import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getBearerToken, verifyAccessToken } from "@/lib/mobile-token"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isApi = path.startsWith("/api/")

  // Mobile app: `Authorization: Bearer <access token>` on API calls.
  // Verified here so a bad or expired token gets a JSON 401 (the app then refreshes it)
  // instead of reaching a route, where the error would surface as a 500.
  const bearer = isApi ? getBearerToken(request.headers) : null
  if (bearer) {
    const claims = await verifyAccessToken(bearer)
    if (!claims) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", claims.userId)
    requestHeaders.set("x-workspace-id", claims.workspaceId)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const session = await auth()

  // API routes are private unless listed here. (The page rules below are looser on purpose:
  // "/" in that list matches every path, and pages enforce auth themselves via getAuthSession.)
  const publicApiRoutes = ["/api/auth", "/api/mobile/auth", "/api/health", "/api/cron"]
  if (isApi && !session && !publicApiRoutes.some((route) => path.startsWith(route))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/sign-up",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/error",
    "/auth/sign-up-success",
    "/api/auth",
    "/api/mobile/auth",
    "/api/health",
    "/api/cron",
  ]

  const isPublicRoute = publicRoutes.some((route) =>
    path.startsWith(route)
  )

  // Redirect authenticated users away from auth pages
  if (session && path.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Require authentication for protected routes
  if (!isPublicRoute && !session) {
    const redirectUrl = new URL("/auth/login", request.url)
    redirectUrl.searchParams.set("callbackUrl", path)
    return NextResponse.redirect(redirectUrl)
  }

  // Add workspace context to headers for API routes
  if (session && isApi) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", session.user.id)
    requestHeaders.set("x-workspace-id", session.user.workspaceId || "")

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
