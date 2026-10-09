import { NextResponse } from "next/server"

// GET /api/health: lets the mobile app (and an uptime monitor) check the server is reachable.
export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() })
}
