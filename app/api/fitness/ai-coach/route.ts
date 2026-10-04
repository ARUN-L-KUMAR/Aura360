import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, fitness } from "@/lib/db"
import { eq, and, desc, gte } from "drizzle-orm"
import { openaiGroqClient } from "@/lib/ai/openai-groq-client"
import { geminiClient } from "@/lib/ai/gemini-client"
import { FAST_MODEL, getProviderForModel } from "@/lib/ai/types"

export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json().catch(() => ({}))
    const { action = "generate_split", params = {} } = body

    // 1. Fetch recent fitness entries (past 30 days) to understand user's active baseline
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0]

    const recentWorkouts = await db
      .select()
      .from(fitness)
      .where(
        and(
          eq(fitness.workspaceId, context.workspaceId),
          eq(fitness.userId, context.userId),
          gte(fitness.date, thirtyDaysStr)
        )
      )
      .orderBy(desc(fitness.date))
      .limit(50)

    // ─── ACTION 1: Generate AI Periodized Workout Split ──────────────────────
    if (action === "generate_split") {
      const {
        goal = "Hypertrophy & Muscle Building",
        equipment = "Full Commercial Gym",
        daysPerWeek = 4,
        experienceLevel = "Intermediate",
        focusAreas = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"],
      } = params

      const prompt = `You are an elite sports scientist, strength & conditioning specialist, and master fitness coach.
Task: Design a scientific, periodized weekly workout split tailored to the following client parameters:

CLIENT PROFILE:
- Primary Goal: ${goal}
- Available Equipment: ${equipment}
- Training Frequency: ${daysPerWeek} days per week
- Experience Level: ${experienceLevel}
- Target Muscle Groups / Focus: ${focusAreas.join(", ")}
- Recent Completed Sessions (Last 30 Days): ${recentWorkouts.length} workouts logged

RULES:
1. Provide a cohesive weekly program with exactly ${daysPerWeek} training days and ${7 - daysPerWeek} rest/active recovery days.
2. For each training day:
   - Provide a motivating, clear day title (e.g., "Day 1: Upper Body Strength & Hypertrophy").
   - Target muscle groups.
   - 4 to 6 specific, high-stimulus exercises with target sets (e.g. 3 or 4), rep ranges (e.g. "8-10", "10-12", "6-8"), target RPE (e.g. 8), and recommended rest interval in seconds (e.g. 90).
3. Include progressive overload guidance (how to increase weight or reps week over week).
4. Include a warm-up and recovery recommendation.

Return STRICT JSON only matching this schema:
{
  "programName": "Hypertrophy Foundation Split",
  "goal": "${goal}",
  "frequency": "${daysPerWeek} Days / Week",
  "difficulty": "${experienceLevel}",
  "weeklyOverview": "2-3 sentences explaining the biomechanical rationale of this split.",
  "days": [
    {
      "dayNumber": 1,
      "name": "Push A (Chest, Delts & Triceps)",
      "isRestDay": false,
      "focus": "Upper body pressing & horizontal push",
      "targetDurationMinutes": 55,
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "category": "Chest",
          "sets": 3,
          "reps": "8-10",
          "restSeconds": 90,
          "rpe": 8,
          "notes": "Control the eccentric descent, explosive push."
        }
      ]
    },
    {
      "dayNumber": 2,
      "name": "Active Recovery & Mobility",
      "isRestDay": true,
      "focus": "Mobility, light walking & hydration",
      "targetDurationMinutes": 20,
      "exercises": []
    }
  ],
  "progressiveOverloadTip": "When you hit the top of the rep range for all sets, add 2.5kg / 5lbs on your next session.",
  "recoveryStrategy": "Prioritize 7-8 hours of sleep and 1.6g-2.0g protein per kg of bodyweight."
}`.trim()

      let rawJson = ""
      try {
        const provider = getProviderForModel(FAST_MODEL)
        if (provider === "groq" || provider === "openai") {
          const res = await openaiGroqClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated elite strength & conditioning coach. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        } else {
          const res = await geminiClient.generateText(
            {
              prompt,
              systemPrompt: "You are an automated elite strength & conditioning coach. Always respond in valid, raw JSON only.",
            },
            { model: FAST_MODEL }
          )
          rawJson = res.text
        }
      } catch (err) {
        console.warn("LLM Split generation error:", err)
      }

      let splitData = null
      try {
        const cleanJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
        const jsonStart = cleanJson.indexOf("{")
        const jsonEnd = cleanJson.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          splitData = JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1))
        }
      } catch (parseErr) {
        console.warn("Failed to parse split JSON:", parseErr)
      }

      // Algorithmic Fallback Split if AI fails
      if (!splitData || !Array.isArray(splitData.days)) {
        splitData = {
          programName: `${goal} — 4-Day Upper/Lower Split`,
          goal,
          frequency: `${daysPerWeek} Days / Week`,
          difficulty: experienceLevel,
          weeklyOverview: "A battle-tested 4-day Upper/Lower split that balances maximum muscle hypertrophy with optimal 48-hour recovery windows.",
          days: [
            {
              dayNumber: 1,
              name: "Upper Body Power & Hypertrophy",
              isRestDay: false,
              focus: "Chest, Back, Shoulders & Arms",
              targetDurationMinutes: 60,
              exercises: [
                { name: "Barbell Bench Press", category: "Chest", sets: 4, reps: "6-8", restSeconds: 90, rpe: 8, notes: "Explosive drive" },
                { name: "Bent-Over Barbell Row", category: "Back", sets: 4, reps: "8-10", restSeconds: 90, rpe: 8, notes: "Pull to lower sternum" },
                { name: "Dumbbell Overhead Shoulder Press", category: "Shoulders", sets: 3, reps: "10-12", restSeconds: 60, rpe: 8, notes: "Full lock-out" },
                { name: "Lat Pulldown / Pull-ups", category: "Back", sets: 3, reps: "10-12", restSeconds: 60, rpe: 8, notes: "Squeeze lats at bottom" },
                { name: "Incline Dumbbell Bicep Curls", category: "Arms", sets: 3, reps: "12-15", restSeconds: 60, rpe: 9, notes: "Strict form, no swing" },
                { name: "Tricep Rope Pushdowns", category: "Arms", sets: 3, reps: "12-15", restSeconds: 60, rpe: 9, notes: "Flare ropes at bottom" },
              ],
            },
            {
              dayNumber: 2,
              name: "Lower Body & Core Strength",
              isRestDay: false,
              focus: "Quads, Hamstrings, Glutes & Abs",
              targetDurationMinutes: 55,
              exercises: [
                { name: "Barbell Back Squats", category: "Quads", sets: 4, reps: "6-8", restSeconds: 120, rpe: 8, notes: "Hit parallel depth" },
                { name: "Romanian Deadlifts (RDL)", category: "Hamstrings", sets: 3, reps: "8-10", restSeconds: 90, rpe: 8, notes: "Hinge at hips, stretch hamstrings" },
                { name: "Bulgarian Split Squats", category: "Quads", sets: 3, reps: "10-12", restSeconds: 60, rpe: 8, notes: "Each leg" },
                { name: "Standing Calf Raises", category: "Calves", sets: 4, reps: "12-15", restSeconds: 45, rpe: 9, notes: "2-second pause at peak" },
                { name: "Hanging Leg Raises", category: "Core", sets: 3, reps: "12-15", restSeconds: 45, rpe: 8, notes: "Control the descent" },
              ],
            },
            {
              dayNumber: 3,
              name: "Active Recovery & Mobility",
              isRestDay: true,
              focus: "Walking, Joint Mobility & Soft Tissue Work",
              targetDurationMinutes: 25,
              exercises: [],
            },
            {
              dayNumber: 4,
              name: "Upper Body Volume & Pump",
              isRestDay: false,
              focus: "Upper body hypertrophy & accessory volume",
              targetDurationMinutes: 55,
              exercises: [
                { name: "Incline Dumbbell Press", category: "Chest", sets: 3, reps: "10-12", restSeconds: 75, rpe: 8, notes: "30-degree bench angle" },
                { name: "Seated Cable Row", category: "Back", sets: 3, reps: "10-12", restSeconds: 75, rpe: 8, notes: "Retract scapulae fully" },
                { name: "Dumbbell Lateral Raises", category: "Shoulders", sets: 4, reps: "12-15", restSeconds: 45, rpe: 9, notes: "Lead with elbows" },
                { name: "Chest-Supported T-Bar Row", category: "Back", sets: 3, reps: "10-12", restSeconds: 60, rpe: 8, notes: "Upper back thickness" },
                { name: "Overhead Dumbbell Tricep Extension", category: "Arms", sets: 3, reps: "12-15", restSeconds: 60, rpe: 8, notes: "Deep stretch" },
              ],
            },
            {
              dayNumber: 5,
              name: "Lower Body Hypertrophy & Posterior Chain",
              isRestDay: false,
              focus: "Hamstrings, Glutes, Calves & Core",
              targetDurationMinutes: 50,
              exercises: [
                { name: "Leg Press", category: "Quads", sets: 3, reps: "10-12", restSeconds: 90, rpe: 8, notes: "Full range of motion" },
                { name: "Lying Leg Curls", category: "Hamstrings", sets: 3, reps: "10-12", restSeconds: 60, rpe: 9, notes: "Slow 3-second negative" },
                { name: "Dumbbell Walking Lunges", category: "Glutes", sets: 3, reps: "12 steps/leg", restSeconds: 60, rpe: 8, notes: "Upright torso" },
                { name: "Abdominal Cable Crunches", category: "Core", sets: 3, reps: "15", restSeconds: 45, rpe: 8, notes: "Flex spine against resistance" },
              ],
            },
            {
              dayNumber: 6,
              name: "Rest & Muscle Repair",
              isRestDay: true,
              focus: "Complete physiological recovery",
              targetDurationMinutes: 0,
              exercises: [],
            },
            {
              dayNumber: 7,
              name: "Rest & Weekly Planning",
              isRestDay: true,
              focus: "Meal prep & planning next week's weights",
              targetDurationMinutes: 0,
              exercises: [],
            },
          ],
          progressiveOverloadTip: "Log every set weight & reps in the Live Workout Tracker. Aim to beat your previous week's total volume by 2-5%.",
          recoveryStrategy: "Drink 3 liters of water daily, consume 1.6g-2.0g protein/kg body weight, and sleep at least 7.5 hours.",
        }
      }

      return NextResponse.json({
        success: true,
        split: splitData,
      })
    }

    // ─── ACTION 2: Daily Readiness & Muscle Fatigue Score ────────────────────
    if (action === "readiness_check") {
      const workoutsPast7Days = recentWorkouts.filter((w) => {
        const diffDays = (new Date().getTime() - new Date(w.date).getTime()) / (1000 * 3600 * 24)
        return diffDays <= 7 && w.type === "workout"
      })

      const totalMinutes7Days = workoutsPast7Days.reduce((sum, w) => sum + (w.duration || 0), 0)
      const totalCalories7Days = workoutsPast7Days.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0)

      let readinessScore = 88
      let status = "Optimal Training State"
      let recommendation = "You are well-recovered. Excellent day for a high-intensity session or progressive overload attempt."

      if (workoutsPast7Days.length >= 5) {
        readinessScore = 72
        status = "Accumulated Fatigue"
        recommendation = "High volume this week! Consider active recovery, mobility work, or a deload session."
      } else if (workoutsPast7Days.length === 0) {
        readinessScore = 95
        status = "Fully Rested"
        recommendation = "Your nervous system and muscles are 100% primed. Ideal time to kick off your next workout!"
      }

      return NextResponse.json({
        success: true,
        readiness: {
          score: readinessScore,
          status,
          recommendation,
          workoutsLast7Days: workoutsPast7Days.length,
          totalMinutesLast7Days: totalMinutes7Days,
          totalCaloriesLast7Days: totalCalories7Days,
        },
      })
    }

    // ─── ACTION 3: Exercise Substitution ─────────────────────────────────────
    if (action === "substitute_exercise") {
      const { exerciseName, targetMuscle, availableEquipment } = params

      const prompt = `You are an expert biomechanist. Provide 3 direct, biomechanically equivalent exercise substitutions for: "${exerciseName}" targeting the ${targetMuscle || "relevant"} muscle group using ${availableEquipment || "any equipment"}.

Return STRICT JSON only:
{
  "substitutions": [
    {
      "name": "Alternative Exercise Name",
      "equipment": "Dumbbells | Cable | Bodyweight",
      "whyItWorks": "1 punchy sentence on biomechanical similarity."
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
        console.warn("LLM Substitution error:", err)
      }

      let subs = []
      try {
        const clean = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(clean)
        if (Array.isArray(parsed.substitutions)) subs = parsed.substitutions
      } catch {}

      if (subs.length === 0) {
        subs = [
          { name: `Dumbbell Variation of ${exerciseName}`, equipment: "Dumbbells", whyItWorks: "Allows independent arm motion with similar joint angles." },
          { name: `Cable Variation of ${exerciseName}`, equipment: "Cable", whyItWorks: "Maintains constant mechanical tension throughout full range." },
          { name: `Bodyweight Alternative for ${exerciseName}`, equipment: "Bodyweight", whyItWorks: "Replicates motor pattern without loading external spine." },
        ]
      }

      return NextResponse.json({ success: true, substitutions: subs })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in Fitness AI Coach API:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process fitness AI request" },
      { status: 500 }
    )
  }
}
