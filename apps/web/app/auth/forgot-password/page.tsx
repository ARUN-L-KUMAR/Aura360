"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to process password reset request")
      }

      setIsSubmitted(true)
      toast.success("Password reset email sent!")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 dark:from-teal-950/40 dark:via-blue-950/40 dark:to-purple-950/40 p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <Card className="backdrop-blur-md bg-card/90 border-primary/20 shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-teal-500 via-primary to-purple-500" />
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <Mail className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Forgot Password</CardTitle>
            <CardDescription className="text-xs font-semibold">
              Enter your email address to receive a secure password reset link
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {isSubmitted ? (
              <div className="space-y-4 text-center py-2 animate-in fade-in duration-300">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm">Check Your Inbox</h3>
                  <p className="text-xs text-muted-foreground">
                    We sent instructions to <strong className="text-foreground">{email}</strong>. The link expires in 1 hour.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full mt-4 text-xs font-bold uppercase tracking-wider">
                  <Link href="/auth/login">Back to Sign In</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="font-medium"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full gap-2 font-bold uppercase tracking-wider text-xs h-11 bg-gradient-to-r from-teal-600 to-primary hover:from-teal-700 hover:to-primary/90 shadow-md"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dispatching Reset Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    href="/auth/login"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
