import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getExpenseStats } from "@/actions/expense"
import { getCategories } from "@/actions/category"
import { EnhancedExpenseForm } from "@/components/enhanced-expense-form"

export default async function ExpenseEntryPage({ searchParams }: { searchParams?: { category?: string } }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role === "ADMIN" || session.user.role === "SUPERVISOR") {
    redirect("/admin")
  }

  const stats = await getExpenseStats()
  const categories = await getCategories()

  const preselectedCategory = searchParams?.category?.trim() || undefined

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="mb-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">Expense Entry</h1>
      </div>

      <div className="flex justify-center">
        {stats && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 w-full max-w-xl shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4 text-center border-b pb-2">Add New Expense</h2>
            <EnhancedExpenseForm
              memberName={session.user.name || "Member"}
              budget={stats.totalBudget || 0}
              totalAmountUsed={stats.submittedAmount || 0}
              categories={categories}
              preselectedCategory={preselectedCategory}
            />
          </div>
        )}
      </div>
    </div>
  )
}
