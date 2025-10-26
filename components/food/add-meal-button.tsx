"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddMealDialog } from "./add-meal-dialog"

export function AddMealButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-orange-600 hover:bg-orange-700">
        <Plus className="h-4 w-4 mr-2" />
        Add Meal
      </Button>
      <AddMealDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
