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
import { StickyNote, Bookmark, ArrowRight } from "lucide-react"

interface MoveToDialogProps {
  itemId: string
  sourceModule: "notes" | "saved"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newItem: any) => void
}

const modules = [
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "saved", label: "Saved Items", icon: Bookmark },
]

export function MoveToDialog({
  itemId,
  sourceModule,
  open,
  onOpenChange,
  onSuccess,
}: MoveToDialogProps) {
  const [targetModule, setTargetModule] = useState<string>("")
  const [isMoving, setIsMoving] = useState(false)

  const handleMove = async () => {
    if (!targetModule) {
      toast.error("Please select a target module")
      return
    }

    if (targetModule === sourceModule) {
      toast.error("Target module must be different from source module")
      return
    }

    setIsMoving(true)
    try {
      const response = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          sourceModule,
          targetModule,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to move item")
      }

      const data = await response.json()
      toast.success(`Item moved to ${targetModule === "notes" ? "Notes" : "Saved Items"}`)
      onSuccess(data.newItem)
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error moving item:", error)
      toast.error(error.message || "Failed to move item")
    } finally {
      setIsMoving(false)
    }
  }

  const availableModules = modules.filter((m) => m.id !== sourceModule)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Move to Module
          </DialogTitle>
          <DialogDescription>
            Move this item to a different module. Some data might be reformatted.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 rounded-lg border border-border/50">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source</span>
              <div className="flex items-center gap-2 font-bold text-sm">
                {sourceModule === "notes" ? <StickyNote className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {sourceModule === "notes" ? "Notes" : "Saved"}
              </div>
            </div>
            
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target</span>
              <div className="flex items-center gap-2 font-bold text-sm text-primary">
                ?
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Select Destination</label>
            <Select onValueChange={setTargetModule} value={targetModule}>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {availableModules.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    <div className="flex items-center gap-2">
                      <module.icon className="w-4 h-4" />
                      {module.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={!targetModule || isMoving}>
            {isMoving ? "Moving..." : "Move Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
