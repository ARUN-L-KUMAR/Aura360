import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { openaiGroqClient } from "@/lib/ai/openai-groq-client"
import { geminiClient } from "@/lib/ai/gemini-client"
import { FAST_MODEL, getProviderForModel } from "@/lib/ai/types"

export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json().catch(() => ({}))
    const { action = "parse_natural_meal", params = {} } = body

    // ─── ACTION 1: Parse Natural Language Meal Description ──────────────────
    if (action === "parse_natural_meal") {
      const { mealText = "", mealType = "lunch" } = params

      if (!mealText.trim()) {
        return NextResponse.json({ success: false, error: "Meal description is required" }, { status: 400 })
      }

      const prompt = `You are a certified sports clinical nutritionist and food database specialist.
Task: Parse the following natural language meal description into discrete food items with scientifically accurate nutritional estimates.

INPUT MEAL: "${mealText}"
TARGET MEAL TYPE: "${mealType}"

RULES:
1. Deconstruct the meal into 1 to 4 distinct items (e.g. "Scrambled Eggs", "Sourdough Toast", "Avocado").
2. Estimate realistic portion sizes (quantity and unit, e.g. "2 eggs", "1 slice (45g)", "1/2 medium (75g)").
3. Calculate accurate calories, protein (g), carbs (g), fats (g), fiber (g), and sugar (g).
4. Provide a total summary of the entire meal.

Return STRICT JSON only matching this schema (no markdown formatting, no preamble):
{
  "totalCalories": 520,
  "totalProtein": 28,
  "totalCarbs": 42,
  "totalFats": 26,
  "mealType": "${mealType}",
  "summary": "High-protein breakfast balanced with complex carbs and monounsaturated healthy fats.",
  "items": [
    {
      "foodName": "Scrambled Eggs",
      "quantity": 2,
      "unit": "large eggs",
      "calories": 140,
      "protein": 12,
      "carbs": 2,
      "fats": 10,
      "fiber": 0,
      "sugar": 1
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
              systemPrompt: "You are an automated clinical nutrition engine. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        } else {
          const res = await geminiClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated clinical nutrition engine. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        }
      } catch (err) {
        console.warn("LLM Nutrition Parser error:", err)
      }

      let parsedData = null
      try {
        const cleanJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
        const jsonStart = cleanJson.indexOf("{")
        const jsonEnd = cleanJson.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          parsedData = JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1))
        }
      } catch (parseErr) {
        console.warn("Failed to parse meal JSON:", parseErr)
      }

      if (!parsedData || !Array.isArray(parsedData.items) || parsedData.items.length === 0) {
        // Fallback nutrition parse
        parsedData = {
          totalCalories: 450,
          totalProtein: 25,
          totalCarbs: 45,
          totalFats: 18,
          mealType,
          summary: `Nutritionally balanced meal based on "${mealText}".`,
          items: [
            {
              foodName: mealText,
              quantity: 1,
              unit: "serving",
              calories: 450,
              protein: 25,
              carbs: 45,
              fats: 18,
              fiber: 4,
              sugar: 3,
            },
          ],
        }
      }

      return NextResponse.json({
        success: true,
        data: parsedData,
      })
    }

    // ─── ACTION 2: Generate AI Meal Plan / Diet Architecture ────────────────
    if (action === "generate_meal_plan") {
      const {
        framework = "High-Protein Athletic",
        targetCalories = 2200,
        targetProtein = 165,
        dietaryRestrictions = "None",
      } = params

      const prompt = `You are an elite sports dietician.
Task: Design a complete, nutrient-dense 1-day meal blueprint matching this client profile:

DIET PROFILE:
- Framework: ${framework}
- Daily Target: ${targetCalories} Calories
- Daily Target Protein: ${targetProtein}g Protein
- Restrictions: ${dietaryRestrictions}

RULES:
1. Provide 4 distinct meals: Breakfast, Lunch, Dinner, and Afternoon/Post-Workout Snack.
2. Ensure the sum of calories and macros across the 4 meals closely aligns with the targets (~${targetCalories} kcal, ~${targetProtein}g protein).
3. For each meal, include:
   - Meal Title
   - Description & Key Ingredients
   - Precise Calories, Protein (g), Carbs (g), and Fats (g)
   - Quick preparation time (e.g. "15 mins")
   - Short culinary tip

Return STRICT JSON only matching this schema:
{
  "planTitle": "${framework} Daily Blueprint",
  "targetCalories": ${targetCalories},
  "targetProtein": ${targetProtein},
  "overview": "Overview of nutritional strategy and energy distribution.",
  "meals": [
    {
      "mealType": "breakfast",
      "title": "Protein Power Oats with Berries & Whey",
      "prepTime": "10 mins",
      "calories": 520,
      "protein": 42,
      "carbs": 62,
      "fats": 12,
      "ingredients": ["Rolled oats (70g)", "Whey isolate (30g)", "Blueberries (50g)", "Almond butter (15g)"],
      "tip": "Stir in whey after cooking oats to preserve texture."
    },
    {
      "mealType": "lunch",
      "title": "Grilled Chicken & Quinoa Mediterranean Bowl",
      "prepTime": "20 mins",
      "calories": 650,
      "protein": 52,
      "carbs": 58,
      "fats": 18,
      "ingredients": ["Chicken breast (200g)", "Cooked quinoa (150g)", "Cucumbers", "Kalamata olives", "Tzatziki"],
      "tip": "Season chicken with oregano and lemon juice for intense flavor without sodium bloat."
    },
    {
      "mealType": "dinner",
      "title": "Pan-Seared Salmon with Sweet Potato & Asparagus",
      "prepTime": "25 mins",
      "calories": 680,
      "protein": 46,
      "carbs": 50,
      "fats": 28,
      "ingredients": ["Atlantic salmon (200g)", "Baked sweet potato (200g)", "Steamed asparagus (100g)", "Olive oil"],
      "tip": "High in omega-3 fatty acids to reduce systemic workout inflammation."
    },
    {
      "mealType": "snack",
      "title": "Greek Yogurt Parfait with Honey & Walnuts",
      "prepTime": "5 mins",
      "calories": 350,
      "protein": 28,
      "carbs": 24,
      "fats": 14,
      "ingredients": ["0% Greek yogurt (200g)", "Raw honey (1 tbsp)", "Crushed walnuts (20g)"],
      "tip": "Slow-digesting casein protein aids overnight muscle protein synthesis."
    }
  ]
}`.trim()

      let rawJson = ""
      try {
        const provider = getProviderForModel(FAST_MODEL)
        const res =
          provider === "groq" || provider === "openai"
            ? await openaiGroqClient.generateText(
                { prompt, systemPrompt: "Respond with valid raw JSON only." },
                { model: FAST_MODEL }
              )
            : await geminiClient.generateText(
                { prompt, systemPrompt: "Respond with valid raw JSON only." },
                { model: FAST_MODEL }
              )
        rawJson = res.text
      } catch (err) {
        console.warn("LLM Meal Plan error:", err)
      }

      let planData = null
      try {
        const clean = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(clean)
        if (Array.isArray(parsed.meals)) planData = parsed
      } catch {}

      if (!planData) {
        planData = {
          planTitle: `${framework} Blueprint`,
          targetCalories,
          targetProtein,
          overview: "Balanced macronutrient distribution built for steady energy and sustained muscle recovery.",
          meals: [
            {
              mealType: "breakfast",
              title: "Scrambled Eggs with Avocado & Whole Grain Sourdough",
              prepTime: "12 mins",
              calories: 490,
              protein: 32,
              carbs: 38,
              fats: 22,
              ingredients: ["3 large eggs", "1 slice sourdough", "1/2 avocado", "Spinach"],
              tip: "Add a pinch of black pepper and sea salt.",
            },
            {
              mealType: "lunch",
              title: "Turkey Breast & Jasmine Rice Power Bowl",
              prepTime: "15 mins",
              calories: 620,
              protein: 48,
              carbs: 65,
              fats: 14,
              ingredients: ["Lean turkey breast (180g)", "Jasmine rice (160g)", "Steamed broccoli", "Olive oil"],
              tip: "High complex carbohydrates replenish glycogen for afternoon energy.",
            },
            {
              mealType: "dinner",
              title: "Grass-Fed Beef Sirloin with Roasted Potatoes & Green Beans",
              prepTime: "25 mins",
              calories: 690,
              protein: 50,
              carbs: 52,
              fats: 26,
              ingredients: ["Lean sirloin steak (180g)", "Baby potatoes (200g)", "Green beans", "Garlic herb butter"],
              tip: "Rich in bioavailable heme iron and zinc.",
            },
            {
              mealType: "snack",
              title: "Whey Protein Shake with Banana & Peanut Butter",
              prepTime: "5 mins",
              calories: 380,
              protein: 35,
              carbs: 36,
              fats: 10,
              ingredients: ["Whey isolate (35g)", "1 medium banana", "Peanut butter (15g)", "Almond milk (250ml)"],
              tip: "Rapid absorption post-training.",
            },
          ],
        }
      }

      return NextResponse.json({ success: true, plan: planData })
    }

    // ─── ACTION 3: "Cook with What I Have" Chef Recipe Generator ─────────────
    if (action === "chef_recipe") {
      const { ingredients = "", preference = "High-Protein & Quick" } = params

      const prompt = `You are a Michelin-trained chef and sports nutritionist.
Task: Create an exquisite, healthy, macro-calculated gourmet recipe using PRIMARILY these available ingredients:
AVAILABLE INGREDIENTS: "${ingredients}"
PREFERENCE: "${preference}"

RULES:
1. Provide a creative gourmet title.
2. Step-by-step cooking instructions (3-5 clear steps).
3. Total prep & cook time in minutes.
4. Accurate calories, protein, carbs, and fats per serving.
5. Chef's secret technique tip to elevate the flavor.

Return STRICT JSON only matching this schema:
{
  "recipeTitle": "Crispy Garlic Butter Chicken with Sautéed Greens",
  "prepTime": "10 mins",
  "cookTime": "15 mins",
  "calories": 480,
  "protein": 44,
  "carbs": 12,
  "fats": 24,
  "difficulty": "Easy",
  "servings": 1,
  "ingredientsList": ["200g Chicken breast", "2 cloves Garlic", "1 tbsp Olive oil", "Salt and pepper"],
  "instructions": [
    "Pat chicken breast dry with paper towel and season generously with salt and pepper.",
    "Heat oil in skillet over medium-high heat until shimmering, then sear chicken 5-6 mins per side until golden.",
    "Baste with garlic and herbs during the last 2 minutes, then rest before slicing."
  ],
  "chefTip": "Resting the meat for 5 minutes allows moisture to redistribute evenly throughout the muscle fibers."
}`.trim()

      let rawJson = ""
      try {
        const provider = getProviderForModel(FAST_MODEL)
        const res =
          provider === "groq" || provider === "openai"
            ? await openaiGroqClient.generateText(
                { prompt, systemPrompt: "Respond with valid raw JSON only." },
                { model: FAST_MODEL }
              )
            : await geminiClient.generateText(
                { prompt, systemPrompt: "Respond with valid raw JSON only." },
                { model: FAST_MODEL }
              )
        rawJson = res.text
      } catch (err) {
        console.warn("LLM Chef Recipe error:", err)
      }

      let recipeData = null
      try {
        const clean = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(clean)
        if (parsed.recipeTitle && Array.isArray(parsed.instructions)) recipeData = parsed
      } catch {}

      if (!recipeData) {
        recipeData = {
          recipeTitle: `Gourmet Kitchen Pan-Sear (${ingredients.slice(0, 25)})`,
          prepTime: "10 mins",
          cookTime: "15 mins",
          calories: 460,
          protein: 40,
          carbs: 22,
          fats: 18,
          difficulty: "Easy",
          servings: 1,
          ingredientsList: ingredients.split(",").map((s: string) => s.trim()).filter(Boolean),
          instructions: [
            "Prep all ingredients by chopping into uniform, bite-sized pieces.",
            "Preheat a heavy skillet with a splash of olive oil over medium-high heat.",
            "Sauté protein first until caramelized, then add aromatics and vegetables.",
            "Season to taste and serve immediately for peak texture.",
          ],
          chefTip: "High initial pan heat creates deep Maillard browning, giving maximum umami flavor.",
        }
      }

      return NextResponse.json({ success: true, recipe: recipeData })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in Food AI Nutrition API:", error)
    return NextResponse.json({ success: false, error: "Failed to process AI nutrition request" }, { status: 500 })
  }
}
