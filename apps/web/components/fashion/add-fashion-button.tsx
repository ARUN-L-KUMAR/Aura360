"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddFashionDialog } from "./add-fashion-dialog"

interface AddFashionButtonProps {
  /** "buyed" opens the form as a wardrobe item, "need_to_buy" as a wishlist item */
  defaultType?: "buyed" | "need_to_buy"
  className?: string
}

export function AddFashionButton({ defaultType = "buyed", className }: AddFashionButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className={`font-bold uppercase tracking-widest text-[10px] ${className ?? ""}`}>
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
      <AddFashionDialog open={open} onOpenChange={setOpen} defaultType={defaultType} />
    </>
  )
}
