import { SignupForm } from "@/components/forms/public-signup-form"
import { Footer } from "@/components/footer"

export default function PublicSignupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Expense Manager</h1>
            <p className="text-gray-600 mt-2">Create your account</p>
          </div>
          <SignupForm />
        </div>
      </div>
      <Footer />
    </div>
  )
}