import { auth } from "@/lib/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getAllExpenses, getExpenseStats } from "@/actions/expense"
import { StatsCards } from "@/components/stats-cards"
import { approveOrRejectExpense, markExpensePaid } from "@/actions/expense"
import { getAdmins } from "@/actions/auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { KeyRound } from "lucide-react"
import { AdminSection } from "@/components/forms/admin-section"

type Expense = Awaited<ReturnType<typeof getAllExpenses>>[number]

function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getStatusVariant(status: string): "warning" | "success" | "destructive" | "secondary" {
  if (status === "PENDING") return "warning"
  if (status === "APPROVED") return "success"
  if (status === "REJECTED") return "destructive"
  return "secondary"
}

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const [expenses, stats, admins] = await Promise.all([
    getAllExpenses(),
    getExpenseStats(),
    getAdmins(),
  ])

  async function approveAction(formData: FormData) {
    "use server"
    const id = formData.get("id")?.toString()
    if (!id) return
    const result = await approveOrRejectExpense({ id, status: "APPROVED" })
    if (result?.error) {
      throw new Error(result.error)
    }
  }

  async function rejectAction(formData: FormData) {
    "use server"
    const id = formData.get("id")?.toString()
    if (!id) return
    const result = await approveOrRejectExpense({ id, status: "REJECTED" })
    if (result?.error) {
      throw new Error(result.error)
    }
  }

  async function paidAction(formData: FormData) {
    "use server"
    const id = formData.get("id")?.toString()
    if (!id) return
    const result = await markExpensePaid({ id })
    if (result?.error) {
      throw new Error(result.error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Review and manage expense approvals</p>
      </div>

      {stats && <StatsCards stats={stats} mode="admin" />}

      <div className="mt-8">
        <AdminSection admins={admins} currentAdminId={session.user.id} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Member Accounts</h2>
        <div className="flex items-center gap-2">
          <Link href="/admin/verify-members" className={buttonVariants({ variant: "outline" })}>
            <span className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Verify Passwords
            </span>
          </Link>
          <Link href="/admin/reset-password" className={buttonVariants({ variant: "outline" })}>
            <span className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Reset Member Password
            </span>
          </Link>
          <Link href="/signup" className={buttonVariants()}>
            Create Member Account
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Expense Review</h2>
        </div>

        <div className="md:hidden space-y-3">
          {expenses.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
              No expenses submitted yet
            </div>
          ) : (
            expenses.map((expense: Expense) => (
              <div key={expense.id} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {expense.createdBy?.name || expense.createdBy?.email || "Unknown"}
                    </p>
                    <p className="text-sm text-gray-600">{formatCategory(expense.category)}</p>
                  </div>
                  <Badge variant={getStatusVariant(expense.status)}>{expense.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium text-gray-900">{formatCurrency(expense.amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(expense.createdAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {expense.status === "PENDING" && (
                    <>
                      <form action={approveAction} className="flex-1 min-w-[120px]">
                        <input type="hidden" name="id" value={expense.id} />
                        <Button type="submit" size="sm" variant="success" className="w-full">
                          Approve
                        </Button>
                      </form>
                      <form action={rejectAction} className="flex-1 min-w-[120px]">
                        <input type="hidden" name="id" value={expense.id} />
                        <Button type="submit" size="sm" variant="destructive" className="w-full">
                          Reject
                        </Button>
                      </form>
                    </>
                  )}

                  {expense.status === "REJECTED" && (
                    <form action={approveAction} className="w-full">
                      <input type="hidden" name="id" value={expense.id} />
                      <Button type="submit" size="sm" variant="success" className="w-full">
                        Approve
                      </Button>
                    </form>
                  )}

                  {expense.status === "APPROVED" && (
                    <form action={paidAction} className="w-full">
                      <input type="hidden" name="id" value={expense.id} />
                      <Button type="submit" size="sm" variant="default" className="w-full">
                        Mark Paid
                      </Button>
                    </form>
                  )}

                  {expense.status === "PAID" && (
                    <span className="text-xs text-gray-500">No further action</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Member Name</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No expenses submitted yet
                  </td>
                </tr>
              ) : (
                expenses.map((expense: Expense) => (
                  <tr key={expense.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {expense.createdBy?.name || expense.createdBy?.email || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatCategory(expense.category)}</td>
                    <td className="px-4 py-3 text-gray-900">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(expense.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(expense.status)}>{expense.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {expense.status === "PENDING" && (
                          <>
                            <form action={approveAction}>
                              <input type="hidden" name="id" value={expense.id} />
                              <Button type="submit" size="sm" variant="success">
                                Approve
                              </Button>
                            </form>
                            <form action={rejectAction}>
                              <input type="hidden" name="id" value={expense.id} />
                              <Button type="submit" size="sm" variant="destructive">
                                Reject
                              </Button>
                            </form>
                          </>
                        )}

                        {expense.status === "REJECTED" && (
                          <form action={approveAction}>
                            <input type="hidden" name="id" value={expense.id} />
                            <Button type="submit" size="sm" variant="success">
                              Approve
                            </Button>
                          </form>
                        )}

                        {expense.status === "APPROVED" && (
                          <form action={paidAction}>
                            <input type="hidden" name="id" value={expense.id} />
                            <Button type="submit" size="sm" variant="default">
                              Mark Paid
                            </Button>
                          </form>
                        )}

                        {expense.status === "PAID" && (
                          <span className="text-xs text-gray-500">No further action</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
