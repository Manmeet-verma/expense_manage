import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminExpenseReviewClient } from "@/components/admin-expense-review-client"
import { FundDistributionForm } from "@/components/admin-fund-distribution-form"

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

  const isAdmin = session.user.role === "ADMIN"
  const isSupervisor = session.user.role === "SUPERVISOR"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Expense Review</h1>
        <p className="text-gray-600 mt-1">Review and manage expense approvals</p>
      </div>

      {isAdmin && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribute Fund</h2>
          <FundDistributionForm />
        </div>
      )}

      <div className="mt-8">
        <AdminExpenseReviewClient isAdmin={isAdmin} isSupervisor={isSupervisor} />
      </div>
    </div>
  )
}
