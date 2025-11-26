import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SkincareRoutine } from "@/components/skincare/skincare-routine"
import { ProductsList } from "@/components/skincare/products-list"
import { AddProductButton } from "@/components/skincare/add-product-button"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function SkincarePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: products } = await supabase
    .from("skincare")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Skincare"
          description="Track your skincare routine and products"
          iconName="sparkles"
          iconBgColor="bg-rose-100 dark:bg-rose-900/50"
          iconColor="text-rose-600 dark:text-rose-400"
        >
          <AddProductButton />
        </ModuleHeader>

        <div className="space-y-6">
          <SkincareRoutine products={products || []} />
          <ProductsList initialProducts={products || []} />
        </div>
      </div>
    </div>
  )
}
