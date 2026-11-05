import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { ChatPageClient } from "@/components/ai/chat-page-client"

export const metadata: Metadata = {
  title: "AI Assistant | Aura360",
  description: "Chat with Aura, your unified 360° life and productivity AI assistant.",
}

export default async function ChatPage() {
  const session = await getAuthSession()
  if (!session?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-2 pb-6">
      <ChatPageClient />
    </div>
  )
}
