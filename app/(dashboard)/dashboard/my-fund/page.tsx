import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MyFundForm } from "@/components/my-fund-form"

export default async function MyFundPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin")
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="mb-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">Add Collection</h1>
      </div>

      <div className="flex justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-4 w-full max-w-xl shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4 text-center border-b pb-2">Deposit Fund</h2>
          <MyFundForm />
        </div>
      </div>
    </div>
  )
}
