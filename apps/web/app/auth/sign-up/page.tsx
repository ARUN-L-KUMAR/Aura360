"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { Logo } from "@/components/ui/logo"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      // Call registration API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      // Redirect to success page
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center relative overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="w-full max-w-lg px-6 animate-in fade-in zoom-in duration-500 scale-[0.9] md:scale-100">
        <div className="text-center mb-3 flex flex-col items-center">
          <Logo size="xl" showBox={false} showGlow={false} className="mb-2" />
          <h1 className="text-3xl font-black tracking-tighter text-foreground mb-1 whitespace-nowrap">
            Join the Aura360 Collective
          </h1>
          <p className="text-muted-foreground font-medium text-xs">
            Start your journey to lifestyle mastery.
          </p>
        </div>

        <Card className="backdrop-blur-2xl bg-background/60 border-border shadow-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="relative space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">Create Account</CardTitle>
            <CardDescription className="text-sm font-medium">
              Join thousands of users optimizing their lives
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 bg-background/50 hover:bg-background border-border/60 hover:border-primary/50 transition-all font-bold text-xs uppercase tracking-widest gap-3 shadow-sm"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Account
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/50">
                <span className="bg-background px-4 py-1 rounded-full border border-border backdrop-blur-md">
                  Direct Registration
                </span>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Display Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="E.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 bg-secondary/30 border-border focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 bg-secondary/30 border-border focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 bg-secondary/30 border-border focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repeat-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Confirm
                    </Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      className="h-10 bg-secondary/30 border-border focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-destructive/10 p-4 border border-destructive/20 text-xs font-bold text-destructive flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-10 bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-xl shadow-primary/20 font-black uppercase tracking-[0.1em] text-xs" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Onboarding...
                  </div>
                ) : (
                  "Create Identity"
                )}
              </Button>

              <div className="pt-2 flex flex-col gap-2 text-center">
                <div className="h-px bg-border/40 w-1/4 mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">
                  Already a member?{" "}
                  <Link href="/auth/login" className="text-primary font-bold hover:underline underline-offset-4">
                    Authorized Sign In
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">
          SECURE ENCRYPTED ACCESS • AURA360 v2.0
        </p>
      </div>
    </div>
  )
}
