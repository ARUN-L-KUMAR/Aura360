"use client"

/**
 * DEPRECATED: This page used Supabase Auth for password reset.
 * With NextAuth migration, password reset should be handled through:
 * 1. NextAuth's built-in password reset functionality
 * 2. Custom API route for password reset emails
 * 3. Or disable this feature if not needed
 * 
 * TODO: Implement NextAuth password reset or remove this page
 */

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950 p-6">
      <div className="w-full max-w-sm">
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader>
            <CardTitle className="text-2xl">Password Reset Unavailable</CardTitle>
            <CardDescription>This feature is currently disabled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Password reset functionality has been temporarily disabled during the migration from Supabase to NextAuth.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact support if you need to reset your password.
            </p>
            <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
              <Link href="/auth/login">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
