"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  FileText,
  Receipt,
  ScanLine,
  ChevronDown,
  ChevronUp,
  Tag,
  CreditCard,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react"
import type { ScannedReceiptResult } from "@/lib/ai/services/receipt-scanner"

interface ReceiptScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransactionSaved: () => void
}

const CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Shopping",
  "Transportation",
  "Healthcare",
  "Utilities & Bills",
  "Entertainment",
  "Personal Care",
  "Travel",
  "Other",
]

export function ReceiptScannerModal({
  open,
  onOpenChange,
  onTransactionSaved,
}: ReceiptScannerModalProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showLineItems, setShowLineItems] = useState(false)

  // Scanned / Editable fields
  const [scannedData, setScannedData] = useState<ScannedReceiptResult | null>(null)
  const [merchant, setMerchant] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [category, setCategory] = useState("Shopping")
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [tax, setTax] = useState("")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [notes, setNotes] = useState("")

  const resetState = () => {
    setPreviewUrl(null)
    setIsScanning(false)
    setIsSaving(false)
    setScannedData(null)
    setMerchant("")
    setAmount("")
    setDate("")
    setCategory("Shopping")
    setPaymentMethod("card")
    setTax("")
    setReceiptNumber("")
    setNotes("")
  }

  const handleFileSelected = async (file: File) => {
    if (!file) return

    // Create local object URL for preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setIsScanning(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/finance/receipt-scan", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to scan receipt")
      }

      const data: ScannedReceiptResult = result.data
      setScannedData(data)
      setMerchant(data.merchant)
      setAmount(data.amount.toString())
      setDate(data.date)
      setCategory(data.category || "Shopping")
      setPaymentMethod(data.paymentMethod || "card")
      setTax(data.tax ? data.tax.toString() : "")
      setReceiptNumber(data.receiptNumber || "")
      setNotes(data.notes || "")

      toast({
        title: "Receipt Scanned!",
        description: `Extracted ${data.merchant} for ₹${data.amount.toLocaleString("en-IN")}.`,
      })
    } catch (err: any) {
      console.error("Scanning failed:", err)
      toast({
        title: "Scan Failed",
        description: err.message || "Could not parse receipt image.",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const handleSaveToLedger = async () => {
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please specify a valid amount.",
        variant: "destructive",
      })
      return
    }

    if (!merchant.trim()) {
      toast({
        title: "Merchant Required",
        description: "Please enter the store or vendor name.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const lineItemsSummary = scannedData?.lineItems?.length
        ? `Items: ${scannedData.lineItems.map((i) => `${i.name} (${i.quantity || 1}x ₹${i.price})`).join(", ")}`
        : ""

      const fullNotes = [receiptNumber ? `Receipt #: ${receiptNumber}` : "", notes, lineItemsSummary]
        .filter(Boolean)
        .join(" | ")

      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date || new Date().toISOString().split("T")[0],
          type: "expense",
          category,
          amount: numericAmount,
          description: merchant.trim(),
          paymentMethod,
          notes: fullNotes || null,
          tags: ["receipt_scan", "ai_extracted"],
          metadata: {
            confidence: scannedData?.confidence,
            lineItems: scannedData?.lineItems,
            receiptNumber,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to log transaction")
      }

      toast({
        title: "Logged to Ledger",
        description: `Added ₹${numericAmount.toLocaleString("en-IN")} expense for ${merchant}.`,
      })

      onTransactionSaved()
      resetState()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Save error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to log transaction",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <ScanLine className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl">Scan Receipt & Bill</DialogTitle>
          </div>
          <DialogDescription>
            Snap a receipt photo or upload an invoice to extract vendor, amount, items, and tax with Gemini Vision.
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: UPLOAD / CAMERA DROPZONE */}
        {!previewUrl && (
          <div className="space-y-4 pt-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary rounded-xl p-8 text-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/40 flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold">Click to upload receipt or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports JPEG, PNG, WEBP, and PDF invoices (up to 10MB)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                className="gap-2 text-xs font-bold uppercase tracking-wider"
              >
                <Camera className="w-4 h-4" /> Take Photo
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelected(file)
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelected(file)
              }}
            />
          </div>
        )}

        {/* STEP 2: SCANNING PROGRESS STATE */}
        {previewUrl && isScanning && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-32 h-40 rounded-lg overflow-hidden border shadow-md bg-muted">
              <img
                src={previewUrl}
                alt="Receipt Scan"
                className="w-full h-full object-cover opacity-75 blur-xs"
              />
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary shadow-[0_0_12px_#3b82f6] animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                Gemini Vision Analyzing Document...
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Extracting merchant, totals, GST breakdown, and itemized lines.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: EXTRACTED VERIFICATION FORM */}
        {previewUrl && !isScanning && scannedData && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Receipt Preview Thumbnail */}
              <div className="w-full sm:w-1/3 shrink-0">
                <div className="relative rounded-lg overflow-hidden border bg-muted group max-h-56">
                  <img
                    src={previewUrl}
                    alt="Receipt Thumbnail"
                    className="w-full h-full object-cover max-h-56"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    {scannedData.confidence}% match
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Scan Another Image
                </Button>
              </div>

              {/* Editable Fields */}
              <div className="flex-1 space-y-3">
                {/* Merchant Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Merchant / Store Name
                  </Label>
                  <Input
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Starbucks, Decathlon"
                    className="font-semibold"
                    required
                  />
                </div>

                {/* Amount & Date */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Total Amount (₹)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                        ₹
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-8 text-base font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Category & Payment Method */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Mode
                    </Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI AutoPay / QR</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tax & Invoice Number */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Tax / GST (₹)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Optional"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Invoice / Bill #
                    </Label>
                    <Input
                      placeholder="Optional"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Extracted Line Items Drawer */}
            {scannedData.lineItems && scannedData.lineItems.length > 0 && (
              <div className="rounded-lg border bg-secondary/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLineItems(!showLineItems)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    {scannedData.lineItems.length} Itemized Products Detected
                  </span>
                  {showLineItems ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showLineItems && (
                  <div className="p-3 border-t space-y-1.5 bg-background">
                    {scannedData.lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                      >
                        <span className="font-medium truncate max-w-[240px]">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-3 text-muted-foreground font-mono">
                          {item.quantity && <span>{item.quantity}x</span>}
                          <span className="font-bold text-foreground">
                            ₹{item.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveToLedger}
                disabled={isSaving}
                className="gap-2 font-bold uppercase tracking-wider text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Log Expense to Ledger
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
