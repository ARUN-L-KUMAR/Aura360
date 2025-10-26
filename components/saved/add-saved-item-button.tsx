"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddSavedItemDialog } from "./add-saved-item-dialog"

export function AddSavedItemButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-pink-600 hover:bg-pink-700">
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
      <AddSavedItemDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
