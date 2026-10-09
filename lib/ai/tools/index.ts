import { zodToJsonSchema } from "zod-to-json-schema"
import {
  getTransactions,
  getBudgets,
  getFinancialGoals,
  getBalances,
  createTransaction,
  createBudget,
} from "./finance"
import { getFitnessLogs, logWorkout } from "./fitness"
import { getFoodLogs, logMeal } from "./food"
import { getNotes, createNote, updateNote } from "./notes"
import { getWardrobe, getWishlist, addFashionItem, getFashionProfile } from "./fashion"
import { getSkincareRoutine, addSkincareProduct } from "./skincare"
import { getTimeLogs, logTimeEntry } from "./time"
import { getSavedItems, saveItem } from "./saved"
import type { AiTool } from "./types"
import type { AiToolDeclaration } from "@/lib/ai/types"

export const toolRegistry: Record<string, AiTool> = {
  // Read tools
  [getTransactions.name]: getTransactions,
  [getBudgets.name]: getBudgets,
  [getFinancialGoals.name]: getFinancialGoals,
  [getBalances.name]: getBalances,
  [getFitnessLogs.name]: getFitnessLogs,
  [getFoodLogs.name]: getFoodLogs,
  [getNotes.name]: getNotes,
  [getWardrobe.name]: getWardrobe,
  [getWishlist.name]: getWishlist,
  [getFashionProfile.name]: getFashionProfile,
  [getSkincareRoutine.name]: getSkincareRoutine,
  [addSkincareProduct.name]: addSkincareProduct,
  [getTimeLogs.name]: getTimeLogs,
  [getSavedItems.name]: getSavedItems,
  [saveItem.name]: saveItem,

  // Mutating (write) tools
  [createTransaction.name]: createTransaction,
  [createBudget.name]: createBudget,
  [logWorkout.name]: logWorkout,
  [logMeal.name]: logMeal,
  [createNote.name]: createNote,
  [updateNote.name]: updateNote,
  [addFashionItem.name]: addFashionItem,
  [logTimeEntry.name]: logTimeEntry,
}

function cleanGeminiSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema
  if (Array.isArray(schema)) return schema.map(cleanGeminiSchema)

  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (
      [
        "additionalProperties",
        "$schema",
        "$defs",
        "definitions",
        "default",
        "exclusiveMinimum",
        "exclusiveMaximum",
      ].includes(key)
    ) {
      continue
    }
    cleaned[key] = cleanGeminiSchema(value)
  }
  return cleaned
}

export function getToolDeclarations(): AiToolDeclaration[] {
  return Object.values(toolRegistry).map((t) => {
    const rawSchema = zodToJsonSchema(t.parameters, {
      target: "openApi3",
    }) as Record<string, unknown>

    const cleanSchema = cleanGeminiSchema(rawSchema)

    return {
      name: t.name,
      description: t.description,
      parameters: cleanSchema,
    }
  })
}

export * from "./types"
export * from "./finance"
export * from "./fitness"
export * from "./food"
export * from "./notes"
export * from "./fashion"
export * from "./skincare"
export * from "./time"
export * from "./saved"

