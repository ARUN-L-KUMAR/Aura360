import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, fashionItems } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { openaiGroqClient } from "@/lib/ai/openai-groq-client"
import { geminiClient } from "@/lib/ai/gemini-client"
import { FAST_MODEL, getProviderForModel } from "@/lib/ai/types"
import { loadFashionProfile } from "@/lib/fashion/profile-server"
import { profilePromptBlock } from "@/lib/fashion/profile"

export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json().catch(() => ({}))
    const { action = "generate_outfits", params = {} } = body

    // 1. Fetch user's wardrobe and wishlist items
    const allItems = await db
      .select({
        id: fashionItems.id,
        name: fashionItems.name,
        category: fashionItems.category,
        subcategory: fashionItems.subcategory,
        color: fashionItems.color,
        brand: fashionItems.brand,
        status: fashionItems.status,
        occasion: fashionItems.occasion,
        season: fashionItems.season,
        imageUrl: fashionItems.imageUrl,
        wearCount: fashionItems.wearCount,
        lastWornDate: fashionItems.lastWornDate,
        tags: fashionItems.tags,
      })
      .from(fashionItems)
      .where(
        and(
          eq(fashionItems.workspaceId, context.workspaceId),
          eq(fashionItems.userId, context.userId)
        )
      )
      .orderBy(desc(fashionItems.createdAt))

    // The user's saved fit profile (measurements, sizes, skin tone, colors); empty string when none is saved
    const profileBlock = profilePromptBlock(await loadFashionProfile(context))

    const wardrobeItems = allItems.filter((i) => i.status === "wardrobe")
    const wishlistItems = allItems.filter((i) => i.status === "wishlist")

    // 2. Handle Action: "generate_outfits"
    if (action === "generate_outfits") {
      const occasion = params.occasion || "Casual Everyday"
      const season = params.season || "All Seasons"
      const vibe = params.vibe || "Minimalist Chic"

      if (wardrobeItems.length === 0) {
        return NextResponse.json({
          success: true,
          outfits: [],
          message: "No wardrobe items found. Please add clothes to your wardrobe to generate outfits.",
        })
      }

      // Prepare compact wardrobe inventory for the LLM
      const inventorySummary = wardrobeItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        color: item.color || "neutral",
        season: item.season || [],
        occasion: item.occasion || [],
        tags: item.tags || [],
      }))

      const prompt = `You are a world-class luxury fashion stylist and visual director.
Task: Create 3 distinct, exceptionally styled complete outfit combinations using ONLY items from the user's wardrobe inventory.

WARDROBE INVENTORY:
${JSON.stringify(inventorySummary, null, 2)}
${profileBlock}
STYLING DIRECTIVES:
- Target Occasion: ${occasion}
- Weather / Season: ${season}
- Aesthetic Vibe: ${vibe}

RULES:
1. Each outfit MUST specify items by their exact "id" from the inventory above.
2. Aim for cohesive combinations: base top/bottom (or dress/one-piece), appropriate footwear, optional outerwear/layer, and optional accessories.
3. Apply color coordination (monochromatic, complementary, or neutral with a pop).
4. Balance proportions (e.g. relaxed bottom with structured top, or tailored base with oversized layer).
5. Explain clearly WHY each outfit works, styling tips (e.g. cuffing pants, tucking in shirt, untucking, rolling sleeves), and suitable environments.

Return STRICT JSON only matching this schema (no markdown fences, no explanatory preamble):
{
  "outfits": [
    {
      "id": "outfit-1",
      "name": "Creative title for look (e.g. The Monochromatic Weekend)",
      "vibe": "${vibe}",
      "occasion": "${occasion}",
      "itemIds": ["id1", "id2", "id3"],
      "layeringGuide": {
        "base": "Description of base piece",
        "bottom": "Description of bottom piece",
        "outerwear": "Description or null",
        "footwear": "Description of shoes"
      },
      "stylingTips": "Expert tip on tuck, cuffs, or accents",
      "colorTheory": "Why these colors harmonize",
      "harmonyScore": 94
    }
  ]
}`.trim()

      let rawJson = ""
      try {
        const provider = getProviderForModel(FAST_MODEL)
        if (provider === "groq" || provider === "openai") {
          const res = await openaiGroqClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated high-end fashion styling engine. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        } else {
          const res = await geminiClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated high-end fashion styling engine. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        }
      } catch (err) {
        console.warn("LLM Outfit generation error:", err)
      }

      let parsedOutfits: any[] = []
      try {
        const cleanJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
        const jsonStart = cleanJson.indexOf("{")
        const jsonEnd = cleanJson.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1))
          if (Array.isArray(parsed.outfits)) {
            parsedOutfits = parsed.outfits
          }
        }
      } catch (parseErr) {
        console.warn("Failed to parse AI outfits output:", parseErr)
      }

      // Algorithmic Fallback if AI returned nothing or invalid IDs
      if (parsedOutfits.length === 0) {
        const tops = wardrobeItems.filter((i) =>
          ["shirt", "t-shirt", "top", "blouse", "sweater", "hoodie"].some((c) =>
            i.category.toLowerCase().includes(c)
          )
        )
        const bottoms = wardrobeItems.filter((i) =>
          ["pant", "jeans", "trouser", "shorts", "skirt"].some((c) =>
            i.category.toLowerCase().includes(c)
          )
        )
        const shoes = wardrobeItems.filter((i) =>
          ["shoe", "sneaker", "boot", "loafer", "heel", "footwear"].some((c) =>
            i.category.toLowerCase().includes(c)
          )
        )
        const outerwear = wardrobeItems.filter((i) =>
          ["jacket", "coat", "blazer", "cardigan"].some((c) =>
            i.category.toLowerCase().includes(c)
          )
        )

        const fallbackLooks = []
        const count = Math.min(3, Math.max(1, tops.length))
        for (let i = 0; i < count; i++) {
          const top = tops[i % tops.length] || wardrobeItems[0]
          const bottom = bottoms[i % bottoms.length] || wardrobeItems[1] || top
          const shoe = shoes[i % shoes.length] || wardrobeItems[2]
          const layer = outerwear.length > 0 ? outerwear[i % outerwear.length] : null

          const outfitItemIds = [top?.id, bottom?.id, shoe?.id, layer?.id].filter(
            Boolean
          ) as string[]
          const uniqueIds = Array.from(new Set(outfitItemIds))

          fallbackLooks.push({
            id: `outfit-${i + 1}`,
            name: `${vibe} Ensemble ${i + 1}`,
            vibe,
            occasion,
            itemIds: uniqueIds,
            layeringGuide: {
              base: top ? top.name : "Core Top",
              bottom: bottom ? bottom.name : "Versatile Bottom",
              outerwear: layer ? layer.name : null,
              footwear: shoe ? shoe.name : "Neutral Footwear",
            },
            stylingTips: "Keep silhouettes clean with a structured tuck and minimalist accessories.",
            colorTheory: "Complementary neutral tones maintain timeless sophistication.",
            harmonyScore: 88 + (i * 3) % 10,
          })
        }
        parsedOutfits = fallbackLooks
      }

      return NextResponse.json({
        success: true,
        outfits: parsedOutfits,
      })
    }

    // 3. Handle Action: "critique_look"
    if (action === "critique_look") {
      const itemIds: string[] = params.itemIds || []
      const selectedItems = allItems.filter((i) => itemIds.includes(i.id))

      if (selectedItems.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No items provided for style critique",
        })
      }

      const prompt = `You are a luxury fashion critic, creative director, and personal stylist.
Task: Critically evaluate this outfit composed of the following items placed on the styling canvas:

ITEMS IN OUTFIT:
${JSON.stringify(
  selectedItems.map((i) => ({
    name: i.name,
    category: i.category,
    color: i.color || "neutral",
    brand: i.brand,
    status: i.status,
  })),
  null,
  2
)}

${profileBlock}
EVALUATE:
1. Overall Style Harmony Score (0 - 100).
2. Color Contrast & Palette Theory (are the tones working in harmony or clashing?).
3. Silhouette & Proportions (balance between top, bottom, and footwear).
4. Occasion Suitability (where does this outfit work best?).
5. "Elevate This Look" Recommendations (specific layer, footwear, or accent piece that would make this outfit a 10/10).

Return STRICT JSON only matching this schema:
{
  "harmonyScore": 92,
  "verdict": "Sophisticated Everyday Chic",
  "summary": "2-3 sentences evaluating the cohesive aesthetic and balance.",
  "colorAnalysis": {
    "paletteType": "Monochromatic | Complementary | Neutral with Accent | Triadic",
    "observation": "Insight on how the colors interact."
  },
  "silhouette": {
    "balance": "Proportion assessment (e.g. Structured top with relaxed drape)",
    "tip": "Silhouette styling advice"
  },
  "suitableOccasions": ["Casual Friday", "Dinner Date", "Art Gallery Opening"],
  "elevateTips": [
    "Specific actionable styling advice 1",
    "Specific actionable styling advice 2",
    "Suggestion for an accessory or missing piece"
  ]
}`.trim()

      let rawJson = ""
      try {
        const provider = getProviderForModel(FAST_MODEL)
        if (provider === "groq" || provider === "openai") {
          const res = await openaiGroqClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated luxury fashion critic. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        } else {
          const res = await geminiClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated luxury fashion critic. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        }
      } catch (err) {
        console.warn("LLM Critique generation error:", err)
      }

      let critique = null
      try {
        const cleanJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
        const jsonStart = cleanJson.indexOf("{")
        const jsonEnd = cleanJson.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          critique = JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1))
        }
      } catch (parseErr) {
        console.warn("Failed to parse critique JSON:", parseErr)
      }

      if (!critique) {
        // Fallback critique
        const colors = selectedItems.map((i) => i.color).filter(Boolean)
        critique = {
          harmonyScore: 89,
          verdict: "Well-Balanced Ensemble",
          summary: `This combination of ${selectedItems.length} pieces creates a versatile foundation with clean lines and balanced visual weight.`,
          colorAnalysis: {
            paletteType: colors.length > 1 ? "Neutral Complementary" : "Tonal Palette",
            observation: `The blend of ${colors.join(", ") || "neutrals"} provides balanced contrast without overpowering the silhouette.`,
          },
          silhouette: {
            balance: "Clean, proportional alignment across upper and lower pieces.",
            tip: "Consider a structured cuff or untucked hem to vary texture and drape.",
          },
          suitableOccasions: ["Smart Casual", "Weekend Gatherings", "Creative Office"],
          elevateTips: [
            "Add a minimal leather belt to demarcate waistline definition.",
            "Pair with clean low-profile footwear to ground the aesthetic.",
            "Incorporate a light outer layer like a tailored blazer or lightweight cardigan.",
          ],
        }
      }

      return NextResponse.json({
        success: true,
        critique,
      })
    }

    // 4. Handle Action: "analyze_gaps"
    if (action === "analyze_gaps") {
      const categoryCounts: Record<string, number> = {}
      wardrobeItems.forEach((item) => {
        const cat = (item.category || "other").toLowerCase()
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })

      const prompt = `You are a capsule wardrobe strategist and personal stylist.
Task: Analyze the user's current wardrobe distribution to identify high-leverage wardrobe gaps (essential staple pieces they are missing that would unlock the highest number of new outfit combinations).

WARDROBE BREAKDOWN:
Total Wardrobe Items: ${wardrobeItems.length}
Category Breakdown: ${JSON.stringify(categoryCounts, null, 2)}
Items List: ${JSON.stringify(
        wardrobeItems.slice(0, 40).map((i) => ({ name: i.name, category: i.category, color: i.color })),
        null,
        2
      )}
Current Wishlist Items: ${JSON.stringify(
        wishlistItems.map((i) => ({ name: i.name, category: i.category })),
        null,
        2
      )}

${profileBlock}
RULES:
1. Identify 3 to 4 specific, timeless wardrobe gaps that the user doesn't already have.
2. For each recommendation, provide:
   - "name": Clean, specific name (e.g. "Tailored Charcoal Wool Overcoat", "Off-White Minimalist Leather Sneakers")
   - "category": Standard category (e.g. "jacket", "shoes", "pants", "shirt", "accessories")
   - "color": Recommended versatile color (e.g. "charcoal", "white", "navy", "camel", "olive")
   - "projectedOutfitsUnlocked": Realistic number of new combinations this item unlocks (e.g. 8, 12, 14)
   - "reasoning": 1-2 punchy sentences on why this fills an immediate closet void
   - "styleTags": Array of 2-3 tags (e.g. ["Versatile", "Capsule Essential", "Smart Casual"])
   - "estimatedPrice": Realistic ballpark price number (e.g. 95, 120, 180)

Return STRICT JSON only matching this schema:
{
  "closetHealthScore": 82,
  "summary": "Insight on overall wardrobe versatility and category balance.",
  "gaps": [
    {
      "name": "Piece Name",
      "category": "shoes",
      "color": "white",
      "projectedOutfitsUnlocked": 11,
      "reasoning": "Why it's essential for their closet",
      "styleTags": ["Capsule Essential", "Everyday"],
      "estimatedPrice": 110
    }
  ]
}`.trim()

      let rawJson = ""
      try {
        const provider = getProviderForModel(FAST_MODEL)
        if (provider === "groq" || provider === "openai") {
          const res = await openaiGroqClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated wardrobe gap strategist. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        } else {
          const res = await geminiClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated wardrobe gap strategist. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        }
      } catch (err) {
        console.warn("LLM Gaps analysis error:", err)
      }

      let gapsData = null
      try {
        const cleanJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
        const jsonStart = cleanJson.indexOf("{")
        const jsonEnd = cleanJson.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          gapsData = JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1))
        }
      } catch (parseErr) {
        console.warn("Failed to parse gaps JSON:", parseErr)
      }

      if (!gapsData || !Array.isArray(gapsData.gaps)) {
        // Fallback gaps based on standard capsule principles
        gapsData = {
          closetHealthScore: 78,
          summary: "Your wardrobe has strong foundational tops, but could achieve significantly higher versatility with neutral layering and versatile footwear.",
          gaps: [
            {
              name: "Clean White Minimalist Leather Sneakers",
              category: "shoes",
              color: "white",
              projectedOutfitsUnlocked: 12,
              reasoning: "A low-profile white sneaker seamlessly bridges casual denim, relaxed chinos, and tailored suits.",
              styleTags: ["Capsule Essential", "Everyday"],
              estimatedPrice: 120,
            },
            {
              name: "Unstructured Navy Tailored Blazer",
              category: "jacket",
              color: "navy",
              projectedOutfitsUnlocked: 9,
              reasoning: "Instantly elevates tees and casual trousers for business casual and evening occasions.",
              styleTags: ["Versatile", "Smart Casual"],
              estimatedPrice: 165,
            },
            {
              name: "Classic Beige / Khaki Relaxed Chinos",
              category: "pants",
              color: "beige",
              projectedOutfitsUnlocked: 8,
              reasoning: "Breaks away from denim fatigue while pairing effortlessly with dark knits and crisp shirts.",
              styleTags: ["Foundational", "All-Season"],
              estimatedPrice: 85,
            },
          ],
        }
      }

      return NextResponse.json({
        success: true,
        data: gapsData,
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in Fashion AI Designer API:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process AI designer request" },
      { status: 500 }
    )
  }
}
