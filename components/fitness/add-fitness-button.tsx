"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddFitnessDialog } from "./add-fitness-dialog"

export function AddFitnessButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-purple-600 hover:bg-purple-700">
        <Plus className="h-4 w-4 mr-2" />
        Add Entry
      </Button>
      <AddFitnessDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
