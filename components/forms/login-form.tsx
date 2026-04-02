"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"

interface LoginFormProps {
  csrfToken: string
  initialError?: string
}

export function LoginForm({ csrfToken, initialError = "" }: LoginFormProps) {
  const [error] = useState(initialError)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <form method="post" action="/api/auth/callback/credentials">
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value="/dashboard" />
        </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={!csrfToken}>
              Sign In
            </Button>
            <div className="flex flex-col items-center gap-2 text-sm text-center">
              <Link href="/forgot-password" className="text-blue-600 hover:underline">
                Forgot Password?
              </Link>
              <p className="text-gray-600">Contact your admin to create a member account.</p>
            </div>
          </CardFooter>
      </form>
    </Card>
  )
}
