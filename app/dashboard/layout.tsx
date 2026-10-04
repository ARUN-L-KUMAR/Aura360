import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client"
import { PageContextProvider } from "@/lib/context/page-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageContextProvider>
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </PageContextProvider>
  )
}
