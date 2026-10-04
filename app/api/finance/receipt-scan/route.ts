import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { scanReceiptWithGemini } from "@/lib/ai/services/receipt-scanner"

// POST /api/finance/receipt-scan
export async function POST(request: Request) {
  try {
    await getWorkspaceContext()

    let base64Data = ""
    let mimeType = "image/jpeg"

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No image file provided in form data" },
          { status: 400 }
        )
      }

      // Check max size: 10 MB
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "File size exceeds 10MB limit" },
          { status: 400 }
        )
      }

      mimeType = file.type || "image/jpeg"
      const buffer = Buffer.from(await file.arrayBuffer())
      base64Data = buffer.toString("base64")
    } else {
      const body = await request.json()
      if (!body.base64) {
        return NextResponse.json(
          { success: false, error: "Base64 image data is required" },
          { status: 400 }
        )
      }

      // Strip potential data URL prefix: "data:image/jpeg;base64,"
      const matches = body.base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        base64Data = matches[2]
      } else {
        base64Data = body.base64
        mimeType = body.mimeType || "image/jpeg"
      }
    }

    if (!base64Data) {
      return NextResponse.json(
        { success: false, error: "Empty image data received" },
        { status: 400 }
      )
    }

    const result = await scanReceiptWithGemini(base64Data, mimeType)

    return NextResponse.json({
      success: true,
      data: result,
      message: `Extracted ${result.merchant} for ₹${result.amount.toLocaleString("en-IN")}`,
    })
  } catch (error: any) {
    console.error("Receipt scan error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process receipt with Gemini Vision",
      },
      { status: 500 }
    )
  }
}
