import { z } from "zod"
import type { WorkspaceContext } from "@/lib/db"

export interface AiTool<TArgs = any, TResult = any> {
  name: string
  description: string
  parameters: z.ZodType<TArgs>
  mutates: boolean
  handler: (args: TArgs, ctx: WorkspaceContext) => Promise<TResult>
}
