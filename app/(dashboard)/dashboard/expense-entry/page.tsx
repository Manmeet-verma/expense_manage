import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getExpenseStats } from "@/actions/expense"
import { getCategories } from "@/actions/category"
import { EnhancedExpenseForm } from "@/components/enhanced-expense-form"

export default async function ExpenseEntryPage({ searchParams }: { searchParams?: { category?: string; description?: string } }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role === "ADMIN" || session.user.role === "SUPERVISOR") {
    redirect("/admin")
  }

  const stats = await getExpenseStats()
  const categories = await getCategories()
  const nameOptions = await prisma.user.findMany({
    where: { role: { in: ["MEMBER", "ADMIN"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }, { email: "asc" }],
  })

  const preselectedCategory = searchParams?.category?.trim() || undefined
  const preselectedDescription = searchParams?.description || undefined

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
              nameOptions={nameOptions.map((user) => ({
                id: user.id,
                label: user.name || user.email,
                role: user.role as "MEMBER" | "ADMIN",
              }))}
              preselectedCategory={preselectedCategory}
              preselectedDescription={preselectedDescription}
            />
          </div>
        )}
      </div>
    </div>
  )
}
