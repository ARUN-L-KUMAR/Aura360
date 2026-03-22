"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductItem } from "./product-item"

// Aligned with ProductItem's local SkincareProduct interface (camelCase)
interface SkincareProduct {
  id: string
  userId: string
  productName: string
  brand: string | null
  category: string
  routineTime: "morning" | "evening" | "both" | null
  frequency: string | null
  purchaseDate: string | null
  expiryDate: string | null
  price: number | null
  rating: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface ProductsListProps {
  initialProducts: SkincareProduct[]
}

export function ProductsList({ initialProducts }: ProductsListProps) {
  const [products, setProducts] = useState<SkincareProduct[]>(initialProducts)
  const [filterRoutine, setFilterRoutine] = useState<string>("all")

  const filteredProducts = products.filter(
    (product) => filterRoutine === "all" || product.routineTime === filterRoutine,
  )

  const handleProductDeleted = (productId: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== productId))
  }

  const handleProductUpdated = (updatedProduct: SkincareProduct) => {
    setProducts((prev) => prev.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)))
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Products</CardTitle>
          <Select value={filterRoutine} onValueChange={setFilterRoutine}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by routine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {filterRoutine !== "all"
                ? "No products found for this routine."
                : "No skincare products yet. Add your first product!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                onDelete={handleProductDeleted}
                onUpdate={handleProductUpdated}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
