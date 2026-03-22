"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkincareProduct, BodyPart } from "@/lib/types/skincare"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Scissors, 
  Droplets, 
  Smile, 
  Box, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryViewProps {
  products: SkincareProduct[]
}

const CATEGORIES: { 
  id: BodyPart; 
  label: string; 
  icon: any; 
  color: string;
  essentials: string[];
}[] = [
  { 
    id: "face", 
    label: "Face Care", 
    icon: User, 
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
    essentials: ["cleanser", "moisturizer", "sunscreen"]
  },
  { 
    id: "hair", 
    label: "Hair Care", 
    icon: Scissors, 
    color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
    essentials: ["shampoo", "conditioner", "hair oil"]
  },
  { 
    id: "body", 
    label: "Body Care", 
    icon: Droplets, 
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
    essentials: ["body wash", "body lotion"]
  },
  { 
    id: "oral", 
    label: "Oral Care", 
    icon: Smile, 
    color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400",
    essentials: ["toothpaste", "mouthwash"]
  },
  { 
    id: "general", 
    label: "General", 
    icon: Box, 
    color: "text-slate-600 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-400",
    essentials: []
  },
]

export function CategoryView({ products }: CategoryViewProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((cat) => {
        const categoryProducts = products.filter((p) => p.bodyPart === cat.id && p.status === "owned")
        const missingEssentials = cat.essentials.filter(
          (essential) => !categoryProducts.some((p) => p.category.toLowerCase().includes(essential.toLowerCase()))
        )

        const Icon = cat.icon

        return (
          <Card key={cat.id} className="group hover:border-primary/40 transition-all shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl", cat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{cat.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{categoryProducts.length} items owned</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Essentials Check</p>
                <div className="flex flex-wrap gap-2">
                  {cat.essentials.map((essential) => {
                    const isOwned = categoryProducts.some((p) => 
                      p.category.toLowerCase().includes(essential.toLowerCase())
                    )
                    return (
                      <Badge 
                        key={essential} 
                        variant={isOwned ? "secondary" : "outline"}
                        className={cn(
                          "capitalize text-[10px] px-2 py-0.5",
                          isOwned 
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
                            : "text-muted-foreground border-dashed"
                        )}
                      >
                        {isOwned ? <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> : <AlertCircle className="w-2.5 h-2.5 mr-1" />}
                        {essential}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              {missingEssentials.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    Missing {missingEssentials.length} essentials
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
