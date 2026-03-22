"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductItem } from "./product-item"
import { SkincareProduct, BodyPart, SkincareStatus, RoutineTime } from "@/lib/types/skincare"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProductsListProps {
  initialProducts: SkincareProduct[]
}

export function ProductsList({ initialProducts }: ProductsListProps) {
  const [products, setProducts] = useState<SkincareProduct[]>(initialProducts)
  const [filterRoutine, setFilterRoutine] = useState<string>("all")
  const [filterBodyPart, setFilterBodyPart] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")

  const filteredProducts = products.filter((product) => {
    const routineMatch = filterRoutine === "all" || product.routineTime === filterRoutine
    const bodyPartMatch = filterBodyPart === "all" || product.bodyPart === filterBodyPart
    const statusMatch = filterStatus === "all" || product.status === filterStatus
    return routineMatch && bodyPartMatch && statusMatch
  })

  const handleProductDeleted = (productId: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== productId))
  }

  const handleProductUpdated = (updatedProduct: SkincareProduct) => {
    setProducts((prev) => prev.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)))
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl">Inventory</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your body care products and essentials</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 xs:flex xs:items-center gap-2 w-full xs:w-auto">
            <Select value={filterBodyPart} onValueChange={setFilterBodyPart}>
              <SelectTrigger className="w-full xs:w-[110px] sm:w-[130px] h-8 sm:h-9 text-xs">
                <SelectValue placeholder="Body Part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parts</SelectItem>
                <SelectItem value="face">Face</SelectItem>
                <SelectItem value="hair">Hair</SelectItem>
                <SelectItem value="body">Body</SelectItem>
                <SelectItem value="oral">Oral</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full xs:w-[110px] sm:w-[130px] h-8 sm:h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="owned">Owned</SelectItem>
                <SelectItem value="need_to_buy">Need to Buy</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={filterRoutine} onValueChange={setFilterRoutine}>
            <SelectTrigger className="w-full xs:w-[110px] sm:w-[130px] h-8 sm:h-9 text-xs">
              <SelectValue placeholder="Routine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routines</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="optional">Optional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 sm:py-12 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800">
            <p className="text-xs sm:text-sm text-muted-foreground">No products found.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                onDeleted={handleProductDeleted}
                onUpdated={handleProductUpdated}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
            <div className="min-w-[600px]">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold text-xs">Product</TableHead>
                    <TableHead className="font-semibold text-xs">Category</TableHead>
                    <TableHead className="font-semibold text-xs">Body Part</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-xs">Brand</TableHead>
                    <TableHead className="font-semibold text-xs">Routine</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <ProductItem
                      key={product.id}
                      product={product}
                      onDeleted={handleProductDeleted}
                      onUpdated={handleProductUpdated}
                      isTableRow={true}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
