import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { buildMemberLinks, buildStatementCollectionRows } from "@/lib/statement"
import { AdminPendingCollections } from "@/components/admin-pending-collections"

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateRange(fromDate: string | null, toDate: string | null) {
  if (!fromDate || !toDate) return null
  const fromDateTime = new Date(fromDate)
  fromDateTime.setHours(0, 0, 0, 0)
  const toDateTime = new Date(toDate)
  toDateTime.setHours(23, 59, 59, 999)
  return { fromDateTime, toDateTime }
}

export default async function AdminStatementPage({
  searchParams,
}: {
  searchParams?: Promise<{ fromDate?: string; toDate?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const fromDate = resolvedSearchParams.fromDate || getTodayString()
  const toDate = resolvedSearchParams.toDate || getTodayString()
  const dateRange = parseDateRange(fromDate, toDate)

  const dateFilter = dateRange
    ? { createdAt: { gte: dateRange.fromDateTime, lte: dateRange.toDateTime } }
    : {}

  const fundDateFilter = dateRange
    ? { fundDate: { gte: dateRange.fromDateTime, lte: dateRange.toDateTime } }
    : {}

  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  })

  const memberLinks = buildMemberLinks(members)

  const rows = await Promise.all(
    members.map(async (member) => {
      const [expenseTotalResult, expenseCountResult, funds, collectionExpenses, advanceTotalResult, salaryTotalResult] = await Promise.all([
        prisma.expense.aggregate({
          where: { createdById: member.id, category: { notIn: ["Advance", "Salary"] }, ...dateFilter },
          _sum: { amount: true },
        }),
        prisma.expense.count({
          where: { createdById: member.id, category: { notIn: ["Advance", "Salary"] }, ...dateFilter },
        }),
        prisma.fund.findMany({
          where: { userId: member.id },
          select: {
            id: true,
            amount: true,
            receivedFrom: true,
            paymentMode: true,
            fundDate: true,
            createdAt: true,
            userId: true,
            status: true,
            rejectReason: true,
          },
        }),
        prisma.expense.findMany({
          where: {
            createdById: { not: member.id },
            description: { not: null },
          },
          select: {
            id: true,
            amount: true,
            description: true,
            title: true,
            createdAt: true,
            createdById: true,
            category: true,
          },
        }),
        prisma.expense.aggregate({
          where: { createdById: member.id, category: "Advance", ...dateFilter },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { createdById: member.id, category: "Salary", ...dateFilter },
          _sum: { amount: true },
        }),
      ])

      const approvedFunds = funds.filter((f) => f.status === "APPROVED")
      const collectionRows = buildStatementCollectionRows({
        memberId: member.id,
        memberLinks,
        funds: approvedFunds,
        expenses: collectionExpenses,
      })

      const expenseTotal = expenseTotalResult._sum.amount || 0
      const expenseCount = expenseCountResult
      const collectionTotal = collectionRows.reduce((sum, row) => sum + row.amount, 0)
      const advanceTotal = advanceTotalResult._sum.amount || 0
      const salaryTotal = salaryTotalResult._sum.amount || 0

      return {
        ...member,
        expenseTotal,
        expenseCount,
        collectionTotal,
        advanceTotal,
        salaryTotal,
        amount: collectionTotal - expenseTotal,
      }
    })
  )

  const pendingFunds = await prisma.fund.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const pendingCollectionFunds = pendingFunds.map((fund) => ({
    id: fund.id,
    amount: fund.amount,
    receivedFrom: fund.receivedFrom,
    paymentMode: fund.paymentMode,
    fundDate: fund.fundDate,
    status: fund.status,
    memberName: fund.user.name || fund.user.email || "Unknown",
    memberId: fund.user.id,
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statement</h1>
        <p className="mt-1 text-gray-600">Select a member to open the bank-style statement</p>
      </div>

      <AdminPendingCollections initialFunds={pendingCollectionFunds} />

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
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

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Member Name</th>
                <th className="px-4 py-3 font-semibold text-right">Exp. Count</th>
                <th className="px-4 py-3 font-semibold text-right">Expense</th>
                <th className="px-4 py-3 font-semibold text-right">Collection</th>
                <th className="px-4 py-3 font-semibold text-right text-orange-700">Advance</th>
                <th className="px-4 py-3 font-semibold text-right text-purple-700">Salary</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No members found
                  </td>
                </tr>
              ) : (
                rows.map((member, index) => (
                  <tr
                    key={member.id}
                    className={`${index % 2 === 0 ? "bg-gray-50" : "bg-gray-100"} border-t border-gray-100`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/admin/statement/${member.id}`} className="text-blue-700 hover:text-blue-800">
                        {member.name || member.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{member.expenseCount || 0}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-medium">{formatCurrency(member.expenseTotal)}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-medium">{formatCurrency(member.collectionTotal)}</td>
                    <td className="px-4 py-3 text-right text-orange-700 font-medium">{formatCurrency(member.advanceTotal)}</td>
                    <td className="px-4 py-3 text-right text-purple-700 font-medium">{formatCurrency(member.salaryTotal)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${member.amount < 0 ? "text-red-700" : "text-gray-900"}`}>
                      {formatCurrency(member.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-100 md:hidden">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No members found</div>
          ) : (
            rows.map((member, index) => (
              <div key={member.id} className={`${index % 2 === 0 ? "bg-gray-50" : "bg-gray-100"} p-4 space-y-3`}>
                <Link href={`/admin/statement/${member.id}`} className="font-semibold text-blue-700 hover:text-blue-800">
                  {member.name || member.email}
                </Link>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Exp. Count</p>
                    <p className="font-medium text-gray-900">{member.expenseCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Expense</p>
                    <p className="font-medium text-gray-900">{formatCurrency(member.expenseTotal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Collection</p>
                    <p className="font-medium text-gray-900">{formatCurrency(member.collectionTotal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Advance</p>
                    <p className="font-medium text-orange-700">{formatCurrency(member.advanceTotal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Salary</p>
                    <p className="font-medium text-purple-700">{formatCurrency(member.salaryTotal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className={`font-semibold ${member.amount < 0 ? "text-red-700" : "text-gray-900"}`}>
                      {formatCurrency(member.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
