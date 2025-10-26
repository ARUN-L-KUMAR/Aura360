"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddProductDialog } from "./add-product-dialog"

export function AddProductButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-rose-600 hover:bg-rose-700">
        <Plus className="h-4 w-4 mr-2" />
        Add Product
      </Button>
      <AddProductDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
