"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkincareProduct } from "@/lib/types/skincare"
import { 
  AlertTriangle, 
  ShoppingCart, 
  Lightbulb, 
  Calendar, 
  CheckCircle2, 
  ArrowRight 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SkincareInsightsProps {
  products: SkincareProduct[]
}

export function SkincareInsights({ products }: SkincareInsightsProps) {
  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const expiringSoon = products.filter((p) => {
    if (!p.expiryDate) return false
    const expiryDate = new Date(p.expiryDate)
    return expiryDate > today && expiryDate <= thirtyDaysFromNow
  })

  const needToBuy = products.filter((p) => p.status === "need_to_buy")

  const InsightCard = ({ 
    title, 
    items, 
    icon: Icon, 
    color, 
    emptyText, 
    actionText 
  }: { 
    title: string; 
    items: SkincareProduct[]; 
    icon: any; 
    color: string;
    emptyText: string;
    actionText?: string;
  }) => (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="w-4 h-4" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <Badge variant="secondary">{items.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-xl">
            {emptyText}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 group hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">{item.productName}</h4>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.brand} • {item.category}
                  </p>
                </div>
                {item.expiryDate && (
                  <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-200 bg-rose-50/50">
                    Exp: {new Date(item.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
        {items.length > 0 && actionText && (
          <Button variant="ghost" size="sm" className="w-full text-xs font-normal">
            {actionText} <ArrowRight className="w-3 h-3 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <InsightCard 
        title="Expiring Soon" 
        items={expiringSoon} 
        icon={AlertTriangle} 
        color="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        emptyText="All products are well within expiry date."
        actionText="Review all products"
      />
      <InsightCard 
        title="Need to Buy" 
        items={needToBuy} 
        icon={ShoppingCart} 
        color="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
        emptyText="No items on your shopping list."
        actionText="Generate Shopping List"
      />
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <CardTitle className="text-base">Smart Suggestions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/30 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium leading-none">Routine consistency is 85%</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You've been very consistent with your morning routine lately. Keep it up!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-2">
              <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium leading-none">Weekly treatment due</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your weekly exfoliating treatment is scheduled for tonight.
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs font-normal">
            View Analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
