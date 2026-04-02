import { headers } from "next/headers"
import { LoginForm } from "@/components/forms/login-form"

type LoginPageProps = {
  searchParams?: {
    error?: string
  }
}

function getLoginErrorMessage(error?: string) {
  if (!error) {
    return ""
  }

  if (error.includes("CredentialsSignin")) {
    return "Invalid email or password"
  }

  if (error.toLowerCase().includes("csrf")) {
    return "Session expired. Refresh the page and try again."
  }

  return "Login failed due to a server/auth configuration error."
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const headerList = headers()
  const host = headerList.get("host")
  const protocol = headerList.get("x-forwarded-proto") ?? "http"
  const baseUrl = host ? `${protocol}://${host}` : process.env.NEXTAUTH_URL ?? "http://localhost:3000"

  let csrfToken = ""

  try {
    const response = await fetch(`${baseUrl}/api/auth/csrf`, {
      cache: "no-store",
    })

    if (response.ok) {
      const data = (await response.json()) as { csrfToken?: string }
      csrfToken = data.csrfToken ?? ""
    }
  } catch {
    csrfToken = ""
  }

  const errorMessage = getLoginErrorMessage(searchParams?.error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Expense Manager</h1>
          <p className="text-gray-600 mt-2">Track your business expenses</p>
        </div>
        <LoginForm csrfToken={csrfToken} initialError={errorMessage} />
      </div>
    </div>
  )
}
