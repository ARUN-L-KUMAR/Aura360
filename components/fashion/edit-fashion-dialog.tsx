"use client"

import { FashionItemFormDialog } from "./fashion-item-form"
import type { FashionItem } from "@/lib/types/fashion"

interface EditFashionDialogProps {
  item: FashionItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (item: FashionItem) => void
}

// The previous all-fields version is kept, unused, in ./edit-fashion-dialog.legacy.tsx
export function EditFashionDialog({ item, open, onOpenChange, onUpdate }: EditFashionDialogProps) {
  return <FashionItemFormDialog open={open} onOpenChange={onOpenChange} item={item} onUpdate={onUpdate} />
}
