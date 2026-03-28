import { SignupForm } from "@/components/forms/signup-form"
import { Suspense } from "react"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join Expense Manager today</p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  )
}
