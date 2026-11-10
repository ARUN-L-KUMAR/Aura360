"use client"

import { FashionItemFormDialog } from "./fashion-item-form"

interface AddFashionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which tab the form starts on: "buyed" = wardrobe, "need_to_buy" = wishlist */
  defaultType?: "buyed" | "need_to_buy"
}

// The previous all-fields version is kept, unused, in ./add-fashion-dialog.legacy.tsx
export function AddFashionDialog({ open, onOpenChange, defaultType = "buyed" }: AddFashionDialogProps) {
  return (
    <FashionItemFormDialog
      open={open}
      onOpenChange={onOpenChange}
      defaultStatus={defaultType === "need_to_buy" ? "wishlist" : "wardrobe"}
    />
  )
}
