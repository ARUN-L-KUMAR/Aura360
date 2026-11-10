"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!token) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm">Missing Reset Token</h3>
          <p className="text-xs text-muted-foreground">
            The password reset link is invalid or incomplete. Please request a new link.
          </p>
        </div>
        <Button asChild className="w-full mt-4 text-xs font-bold uppercase tracking-wider">
          <Link href="/auth/forgot-password">Request Reset Link</Link>
        </Button>
      </div>
    )
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password")
      }

      setIsSuccess(true)
      toast.success("Password reset successfully!")
      setTimeout(() => {
        router.push("/auth/login?reset=success")
      }, 2500)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center py-4 animate-in fade-in duration-300">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm">Password Updated!</h3>
          <p className="text-xs text-muted-foreground">
            Your password has been changed. Redirecting to sign in...
          </p>
        </div>
        <Button asChild className="w-full mt-4 text-xs font-bold uppercase tracking-wider">
          <Link href="/auth/login">Sign In Now</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          New Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className="font-medium"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Confirm Password
        </Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
            Updating Password...
          </>
        ) : (
          "Save New Password"
        )}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/auth/login"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel and return to Sign In
        </Link>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 dark:from-teal-950/40 dark:via-blue-950/40 dark:to-purple-950/40 p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <Card className="backdrop-blur-md bg-card/90 border-primary/20 shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-teal-500 via-primary to-purple-500" />
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Create New Password</CardTitle>
            <CardDescription className="text-xs font-semibold">
              Enter your new secure password below
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
