"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { CreateNoteDialog } from "./create-note-dialog"

export function CreateNoteButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-700">
        <Plus className="h-4 w-4 mr-2" />
        New Note
      </Button>
      <CreateNoteDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
