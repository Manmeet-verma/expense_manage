import Link from "next/link"
import type { ReactNode } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"
import { buildMemberLinks, buildStatementCollectionRows, findFirstMention, type MemberLink } from "@/lib/statement"

type LedgerRow = {
  id: string
  date: Date
  category: string
  description: string
  credit: number | null
  debit: number | null
  amount: number
}

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

function formatCategory(category: string): string {
  if (category === "OFFICE_GOODS") return "Office Goods"
  if (category === "FREIGHT") return "Freight/Gaddi"
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ")
}

function renderMentionedMembers(text: string, members: MemberLink[]): ReactNode {
  if (!text) {
    return "-"
  }

  const parts: ReactNode[] = []
  let remainingText = text
  let keyIndex = 0

  while (remainingText.length > 0) {
    const match = findFirstMention(remainingText, members)

    if (!match) {
      parts.push(remainingText)
      break
    }

    if (match.index > 0) {
      parts.push(remainingText.slice(0, match.index))
    }

    parts.push(
      <Link
        key={`mention-${keyIndex}`}
        href={`/admin/members?memberId=${match.id}&view=collection`}
        className="text-blue-700 hover:text-blue-800"
      >
        {match.matchedText}
      </Link>
    )

    remainingText = remainingText.slice(match.index + match.length)
    keyIndex += 1
  }

  return parts.length > 0 ? parts : text
}

export default async function AdminMemberStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>
  searchParams?: Promise<{ category?: string; fromDate?: string; toDate?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

  const { memberId } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const selectedCategory = resolvedSearchParams.category?.trim() || "all"
  const fromDate = resolvedSearchParams.fromDate || getTodayString()
  const toDate = resolvedSearchParams.toDate || getTodayString()
  const dateRange = parseDateRange(fromDate, toDate)

  const dateFilter = dateRange
    ? { createdAt: { gte: dateRange.fromDateTime, lte: dateRange.toDateTime } }
    : {}

  const fundDateFilter = dateRange
    ? { fundDate: { gte: dateRange.fromDateTime, lte: dateRange.toDateTime } }
    : {}

  const member = await prisma.user.findUnique({
    where: { id: memberId, role: "MEMBER" },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  if (!member) {
    notFound()
  }

  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  const memberLinks = buildMemberLinks(members)

  const [expenses, collectionExpenses, funds] = await Promise.all([
    prisma.expense.findMany({
      where: { createdById: member.id, ...dateFilter },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.expense.findMany({
      where: {
        createdById: { not: member.id },
        description: { not: null },
        ...dateFilter,
      },
      orderBy: [{ createdAt: "desc" }],
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
    prisma.fund.findMany({
      where: { userId: member.id, ...fundDateFilter },
      orderBy: [{ fundDate: "desc" }],
      select: {
        id: true,
        amount: true,
        receivedFrom: true,
        paymentMode: true,
        fundDate: true,
        createdAt: true,
        userId: true,
      },
    }),
  ])

  const collectionRows = buildStatementCollectionRows({
    memberId: member.id,
    memberLinks,
    funds,
    expenses: collectionExpenses,
  })

  const rows: LedgerRow[] = [
    ...collectionRows.map((fund) => ({
      id: `fund-${fund.id}`,
      date: fund.fundDate,
      category: "Collection",
      description: fund.receivedFrom,
      credit: fund.amount,
      debit: null,
      amount: 0,
    })),
    ...expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.createdAt,
      category: formatCategory(expense.category),
      description: expense.description || expense.title,
      credit: null,
      debit: expense.amount,
      amount: 0,
    })),
  ].sort((left, right) => {
    const diff = new Date(right.date).getTime() - new Date(left.date).getTime()
    return diff !== 0 ? diff : right.id.localeCompare(left.id)
  })

  const categoryOptions = Array.from(new Set(rows.map((row) => row.category))).sort((a, b) => a.localeCompare(b))
  const filteredRows = selectedCategory === "all" ? rows : rows.filter((row) => row.category === selectedCategory)
  const categoryExpenseTotal = filteredRows.reduce((sum, row) => sum + (row.debit ?? 0), 0)
  const categoryCollectionTotal = filteredRows.reduce((sum, row) => sum + (row.credit ?? 0), 0)

  const advanceTotal = expenses.filter((e) => e.category?.toLowerCase() === "advance").reduce((sum, e) => sum + e.amount, 0)
  const salaryTotal = expenses.filter((e) => e.category?.toLowerCase() === "salary").reduce((sum, e) => sum + e.amount, 0)

  const ledger = filteredRows.reduce<LedgerRow[]>((accumulator, row) => {
    const previousBalance = accumulator.at(-1)?.amount ?? 0
    const nextBalance = previousBalance + (row.credit ?? 0) - (row.debit ?? 0)
    accumulator.push({ ...row, amount: nextBalance })
    return accumulator
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/admin/statement" className="text-blue-700 hover:text-blue-800">
              Statement
            </Link>
            <span>/</span>
            <span>{member.name || member.email}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{member.name || member.email}</h1>
          <p className="text-gray-600">{member.email}</p>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-3">
          <div>
            <label htmlFor="fromDate" className="block text-xs font-medium text-gray-600">
              From
            </label>
            <input
              type="date"
              id="fromDate"
              name="fromDate"
              defaultValue={fromDate}
              className="mt-1 h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="toDate" className="block text-xs font-medium text-gray-600">
              To
            </label>
            <input
              type="date"
              id="toDate"
              name="toDate"
              defaultValue={toDate}
              className="mt-1 h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-xs font-medium text-gray-600">
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={selectedCategory}
              className="mt-1 h-9 min-w-44 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {selectedCategory === "all" ? "Total Expense" : "Category Expense Total"}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(categoryExpenseTotal)}</p>
          <p className="mt-1 text-xs text-gray-500">Based on the selected category filter</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Collection Total</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{formatCurrency(categoryCollectionTotal)}</p>
          <p className="mt-1 text-xs text-gray-500">Collection rows included in the current view</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-500">Advance Total</p>
          <p className="mt-2 text-2xl font-bold text-orange-700">{formatCurrency(advanceTotal)}</p>
          <p className="mt-1 text-xs text-gray-500">All advance expenses</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-purple-500">Salary Total</p>
          <p className="mt-2 text-2xl font-bold text-purple-700">{formatCurrency(salaryTotal)}</p>
          <p className="mt-1 text-xs text-gray-500">All salary expenses</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Entries</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{ledger.length}</p>
          <p className="mt-1 text-xs text-gray-500">
            {selectedCategory === "all" ? "All statement entries" : `Only ${selectedCategory} entries`}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Sr. No.</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Collection</th>
                <th className="px-4 py-3 font-semibold text-right">Expense</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No statement entries found
                  </td>
                </tr>
              ) : (
                ledger.map((row, index) => (
                  <tr key={row.id} className={`${index % 2 === 0 ? "bg-gray-50" : "bg-gray-100"} border-t border-gray-100`}>
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-gray-700">{row.category}</td>
                    <td className="px-4 py-3 text-gray-700">{renderMentionedMembers(row.description, memberLinks)}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">{row.credit ? formatCurrency(row.credit) : "-"}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">{row.debit ? formatCurrency(row.debit) : "-"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${row.amount < 0 ? "text-red-700" : "text-gray-900"}`}>
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-100 md:hidden">
          {ledger.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No statement entries found</div>
          ) : (
            ledger.map((row, index) => (
              <div key={row.id} className={`${index % 2 === 0 ? "bg-gray-50" : "bg-gray-100"} p-4 space-y-2`}>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Sr. No. {index + 1}</span>
                  <span>{formatDate(row.date)}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="text-gray-900">{row.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Description</p>
                      <p className="text-gray-900">{renderMentionedMembers(row.description, memberLinks)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-gray-500">Collection</p>
                      <p className="font-medium text-blue-700">{row.credit ? formatCurrency(row.credit) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expense</p>
                      <p className="font-medium text-red-700">{row.debit ? formatCurrency(row.debit) : "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className={`font-semibold ${row.amount < 0 ? "text-red-700" : "text-gray-900"}`}>{formatCurrency(row.amount)}</p>
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
