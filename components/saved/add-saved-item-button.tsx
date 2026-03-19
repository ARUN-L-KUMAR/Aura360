"use client"

import { Button } from "@/components/ui/button"
import { Link, Plus } from "lucide-react"
import { useState } from "react"
import { AddSavedItemDialog } from "./add-saved-item-dialog"
import { AddFromLinkDialog } from "./add-from-link-dialog"

export function AddSavedItemButton() {
  const [open, setOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setLinkOpen(true)}>
        <Link className="h-4 w-4 mr-2" />
        Add from Link
      </Button>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
      <AddSavedItemDialog open={open} onOpenChange={setOpen} />
      <AddFromLinkDialog open={linkOpen} onOpenChange={setLinkOpen} />
    </>
  )
}
