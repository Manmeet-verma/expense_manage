import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { buildMemberLinks, buildStatementCollectionRows } from "@/lib/statement"

export default async function AdminStatementPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

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
      const [expenseTotalResult, expenseCountResult, funds, collectionExpenses] = await Promise.all([
        prisma.expense.aggregate({
          where: { createdById: member.id },
          _sum: { amount: true },
        }),
        prisma.expense.count({
          where: { createdById: member.id },
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
          },
        }),
      ])

      const collectionRows = buildStatementCollectionRows({
        memberId: member.id,
        memberLinks,
        funds,
        expenses: collectionExpenses,
      })

      const expenseTotal = expenseTotalResult._sum.amount || 0
      const expenseCount = expenseCountResult
      const collectionTotal = collectionRows.reduce((sum, row) => sum + row.amount, 0)

      return {
        ...member,
        expenseTotal,
        expenseCount,
        collectionTotal,
        amount: collectionTotal - expenseTotal,
      }
    })
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statement</h1>
        <p className="mt-1 text-gray-600">Select a member to open the bank-style statement</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Member Name</th>
                <th className="px-4 py-3 font-semibold text-right">Exp. Count</th>
                <th className="px-4 py-3 font-semibold text-right">Expense</th>
                <th className="px-4 py-3 font-semibold text-right">Collection</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
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
                  <div className="col-span-2">
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
