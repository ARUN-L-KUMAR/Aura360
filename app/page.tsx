import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h1 className="mb-6 text-balance text-6xl font-bold tracking-tight text-foreground">
          Welcome to <span className="text-teal-600 dark:text-teal-400">LifeSync</span>
        </h1>
        <p className="mb-8 text-pretty text-xl text-muted-foreground leading-relaxed">
          Your unified dashboard for productivity, wellness, and personal growth. Track notes, finances, fitness, food,
          fashion, skincare, and more—all in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700 text-white">
            <Link href="/auth/sign-up">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
