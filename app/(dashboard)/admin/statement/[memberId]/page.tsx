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

export default async function AdminMemberStatementPage({ params }: { params: Promise<{ memberId: string }> }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

  const { memberId } = await params

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
      where: { createdById: member.id },
      orderBy: [{ createdAt: "asc" }],
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
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        amount: true,
        description: true,
        title: true,
        createdAt: true,
        createdById: true,
      },
    }),
    prisma.fund.findMany({
      where: { userId: member.id },
      orderBy: [{ fundDate: "asc" }],
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
    const diff = new Date(left.date).getTime() - new Date(right.date).getTime()
    return diff !== 0 ? diff : left.id.localeCompare(right.id)
  })

  let runningBalance = 0
  const ledger = rows.map((row) => {
    runningBalance += (row.credit ?? 0) - (row.debit ?? 0)
    return { ...row, amount: runningBalance }
  })

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
