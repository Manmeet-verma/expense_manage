import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAllExpenses, getExpenseStats } from "@/actions/expense"
import { ExpenseList } from "@/components/expense-list"
import { StatsCards } from "@/components/stats-cards"
import { approveOrRejectExpense } from "@/actions/expense"

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const [expenses, stats] = await Promise.all([
    getAllExpenses(),
    getExpenseStats(),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Review and manage expense approvals</p>
      </div>

      {stats && <StatsCards stats={stats} />}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">All Expenses</h2>
        </div>
        <ExpenseList 
          expenses={expenses as any} 
          isAdmin={true}
          onApprove={async (id: string) => {
            "use server"
            await approveOrRejectExpense({ id, status: "APPROVED" })
          }}
          onReject={async (id: string) => {
            "use server"
            await approveOrRejectExpense({ id, status: "REJECTED" })
          }}
        />
      </div>
    </div>
  )
}
