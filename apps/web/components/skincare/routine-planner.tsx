"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkincareProduct } from "@/lib/types/skincare"
import { Sun, Moon, Calendar, Clock, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface RoutinePlannerProps {
  products: SkincareProduct[]
}

export function RoutinePlanner({ products }: RoutinePlannerProps) {
  const morningProducts = products
    .filter((p) => (p.routineTime === "morning" || p.routineTime === "both") && p.status === "owned")
    .sort((a, b) => (a.routineOrder || 0) - (b.routineOrder || 0))

  const eveningProducts = products
    .filter((p) => (p.routineTime === "evening" || p.routineTime === "both") && p.status === "owned")
    .sort((a, b) => (a.routineOrder || 0) - (b.routineOrder || 0))

  const weeklyProducts = products
    .filter((p) => p.routineTime === "weekly" && p.status === "owned")
    .sort((a, b) => (a.routineOrder || 0) - (b.routineOrder || 0))

  const RoutineSection = ({ 
    title, 
    items, 
    icon: Icon, 
    color 
  }: { 
    title: string; 
    items: SkincareProduct[]; 
    icon: any; 
    color: string 
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 sm:p-2 rounded-lg bg-background border shadow-sm", color)}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-2 text-[10px] sm:text-xs">{items.length} steps</Badge>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-3 sm:space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
        {items.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground py-2 pl-4">No products assigned to this routine.</p>
        ) : (
          items.map((product, index) => (
            <div key={product.id} className="relative group">
              <div className="absolute -left-[23px] sm:-left-[26px] top-4 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-background bg-muted group-hover:bg-primary transition-colors" />
              <Card className="hover:border-primary/50 transition-colors shadow-none bg-background/50">
                <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted/50 text-[10px] sm:text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-xs sm:text-sm line-clamp-1">{product.productName}</h4>
                      <p className="text-[10px] sm:text-xs text-muted-foreground capitalize line-clamp-1">
                        {product.brand} • {product.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {product.frequency && (
                      <Badge variant="outline" className="text-[8px] sm:text-[10px] font-normal hidden xs:inline-flex">
                        {product.frequency}
                      </Badge>
                    )}
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-12">
        <RoutineSection 
          title="Morning Routine" 
          items={morningProducts} 
          icon={Sun} 
          color="text-yellow-600 dark:text-yellow-400"
        />
        <RoutineSection 
          title="Weekly Special" 
          items={weeklyProducts} 
          icon={Calendar} 
          color="text-green-600 dark:text-green-400"
        />
      </div>
      <div className="space-y-12">
        <RoutineSection 
          title="Evening Routine" 
          items={eveningProducts} 
          icon={Moon} 
          color="text-purple-600 dark:text-purple-400"
        />
        <div className="p-6 rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center text-center space-y-2 opacity-60">
          <Clock className="w-8 h-8 text-muted-foreground" />
          <h4 className="font-medium">Optional Steps</h4>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Add products marked as 'optional' to see them here for quick access.
          </p>
        </div>
      </div>
    </div>
  )
}
