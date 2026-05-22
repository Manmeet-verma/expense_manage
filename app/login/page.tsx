import { Suspense } from "react"
import { LoginForm } from "@/components/forms/login-form"
import { Footer } from "@/components/footer"

export default async function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Expense Manager</h1>
            <p className="text-gray-600 mt-2">Track your business expenses</p>
          </div>
          <Suspense fallback={<div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">Loading sign in form...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
      <Footer />
    </div>
  )
}
