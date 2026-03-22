"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { StickyNote, Bookmark, MoveHorizontal, DollarSign, Dumbbell, UtensilsCrossed, Shirt, Sparkles, Clock, Copy, ArrowRight } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MoveToDialogProps {
  itemId: string
  sourceModule: "notes" | "saved" | "finance" | "fitness" | "food" | "fashion" | "skincare" | "time"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newItem: any, action: "move" | "copy") => void
}

const modules = [
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "saved", label: "Saved Items", icon: Bookmark },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "fashion", label: "Fashion", icon: Shirt },
  { id: "skincare", label: "Skincare", icon: Sparkles },
  { id: "time", label: "Time Logs", icon: Clock },
]

export function MoveToDialog({
  itemId,
  sourceModule,
  open,
  onOpenChange,
  onSuccess,
}: MoveToDialogProps) {
  const [targetModule, setTargetModule] = useState<string>("")
  const [action, setAction] = useState<"move" | "copy">("move")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAction = async () => {
    if (!targetModule) {
      toast.error("Please select a target module")
      return
    }

    if (targetModule === sourceModule && action === "move") {
      toast.error("Target module must be different from source module for moving")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          sourceModule,
          targetModule,
          action, // New: send action type to API
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action} item`)
      }

      const data = await response.json()
      const targetLabel = modules.find(m => m.id === targetModule)?.label || "Target Module"
      toast.success(`Item ${action === "move" ? "moved" : "copied"} to ${targetLabel}`)
      onSuccess(data.newItem, action)
      onOpenChange(false)
    } catch (error: any) {
      console.error(`Error ${action} item:`, error)
      toast.error(error.message || `Failed to ${action} item`)
    } finally {
      setIsProcessing(false)
    }
  }

  const availableModules = action === "move" 
    ? modules.filter((m) => m.id !== sourceModule)
    : modules

  const SourceIcon = modules.find(m => m.id === sourceModule)?.icon || Bookmark
  const TargetIcon = modules.find(m => m.id === targetModule)?.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "move" ? "Move" : "Copy"} to Module
          </DialogTitle>
          <DialogDescription>
            {action === "move" 
              ? "Move this item to a different module. The original will be deleted." 
              : "Copy this item to another module. You will have two copies."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <Tabs defaultValue="move" onValueChange={(v) => setAction(v as "move" | "copy")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="move" className="gap-2">
                <MoveHorizontal className="w-4 h-4" />
                Move
              </TabsTrigger>
              <TabsTrigger value="copy" className="gap-2">
                <Copy className="w-4 h-4" />
                Copy
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-xl border border-border/50 shadow-inner">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Source</span>
              <div className="flex items-center gap-2 font-bold text-sm bg-background/50 px-3 py-1.5 rounded-lg border border-border/30">
                <SourceIcon className="w-4 h-4 text-primary" />
                {modules.find(m => m.id === sourceModule)?.label}
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center pt-4">
              {action === "move" ? <MoveHorizontal className="w-5 h-5 text-primary animate-pulse" /> : <Copy className="w-5 h-5 text-primary animate-pulse" />}
            </div>
            
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Target</span>
              <div className="flex items-center gap-2 font-bold text-sm text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 min-w-[100px] justify-center">
                {TargetIcon ? <TargetIcon className="w-4 h-4" /> : "?"}
                {modules.find(m => m.id === targetModule)?.label || "?"}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/80 ml-1">Destination Module</label>
            <Select onValueChange={setTargetModule} value={targetModule}>
              <SelectTrigger className="h-11 rounded-xl border-border/60 hover:border-primary/50 transition-colors">
                <SelectValue placeholder="Where should it go?" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-2xl border-border/40">
                {availableModules.map((module) => (
                  <SelectItem key={module.id} value={module.id} className="rounded-lg py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-secondary text-primary">
                        <module.icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm">{module.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isProcessing} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
            Cancel
          </Button>
          <Button 
            onClick={handleAction} 
            disabled={!targetModule || isProcessing}
            className="rounded-xl h-11 px-8 gap-2 font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Processing...
              </span>
            ) : (
              <>
                {action === "move" ? <MoveHorizontal className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {action === "move" ? "Move Item" : "Create Copy"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
