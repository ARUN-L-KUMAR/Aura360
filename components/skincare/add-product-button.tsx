"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddProductDialog } from "./add-product-dialog"

import { cn } from "@/lib/utils"

interface AddProductButtonProps {
  className?: string
}

export function AddProductButton({ className }: AddProductButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className={cn(className)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Product
      </Button>
      <AddProductDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
