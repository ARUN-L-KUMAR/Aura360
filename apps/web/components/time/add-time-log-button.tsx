"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddTimeLogDialog } from "./add-time-log-dialog"

export function AddTimeLogButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
        <Plus className="h-4 w-4 mr-2" />
        Add Log
      </Button>
      <AddTimeLogDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
