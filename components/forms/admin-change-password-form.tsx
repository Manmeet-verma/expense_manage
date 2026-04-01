"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { adminChangePassword } from "@/actions/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"

export function AdminChangePasswordForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    const result = await adminChangePassword({ newPassword })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    form.reset()
    setSuccess("Password changed successfully")
    setLoading(false)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Change Password</CardTitle>
        <CardDescription>Update your admin account password</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                className="pr-10"
                required
                minLength={6}
                autoComplete="new-password"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="pr-10"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
