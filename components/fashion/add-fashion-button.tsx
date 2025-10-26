"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddFashionDialog } from "./add-fashion-dialog"

export function AddFashionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
      <AddFashionDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
