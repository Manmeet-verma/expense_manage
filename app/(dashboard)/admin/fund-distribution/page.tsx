import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FundDistributionForm } from "@/components/admin-fund-distribution-form"
import { AdminDistributionTransactionsTable } from "@/components/admin-distribution-transactions-table"
import { getDistributedFundTransactions } from "@/actions/expense"

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default async function FundDistributionPage({
  searchParams,
}: {
  searchParams?: Promise<{ fromDate?: string; toDate?: string }>
}) {
  let session = null
  try {
    session = await auth()
  } catch (error) {
    console.error("Fund distribution page auth error:", error)
    redirect("/login")
  }

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const fromDate = resolvedSearchParams.fromDate || getTodayString()
  const toDate = resolvedSearchParams.toDate || getTodayString()

  const transactions = await getDistributedFundTransactions(fromDate, toDate)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Distribute Fund to Members</h1>
        <p className="text-gray-600 mt-1">Give money to members from the admin account</p>
      </div>

      <div className="space-y-4">
        <div className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <FundDistributionForm />
        </div>

        <div className="w-full rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Distribution Transactions</h2>
          </div>

          <div className="p-4">
            <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="fromDate" className="block text-xs font-medium text-gray-600 mb-1">
                  From
                </label>
                <input
                  type="date"
                  id="fromDate"
                  name="fromDate"
                  defaultValue={fromDate}
                  className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="toDate" className="block text-xs font-medium text-gray-600 mb-1">
                  To
                </label>
                <input
                  type="date"
                  id="toDate"
                  name="toDate"
                  defaultValue={toDate}
                  className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Search
              </button>
            </form>

            <AdminDistributionTransactionsTable transactions={transactions} />
          </div>
        </div>
      </div>
    </div>
  )
}
