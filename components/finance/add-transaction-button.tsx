"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddTransactionDialog } from "./add-transaction-dialog"

export function AddTransactionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" />
        Add Transaction
      </Button>
      <AddTransactionDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
