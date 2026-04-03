import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { StatementClient } from "@/components/statement-client"

export default async function StatementPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin")
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Statement</h1>
        <p className="text-gray-600 mt-1">View and filter your expenses and collections</p>
      </div>
      <StatementClient userId={session.user.id} />
    </div>
  )
}
