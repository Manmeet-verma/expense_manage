'use client'

import { useState } from "react"
import { MyMenuSidebar } from "@/components/my-menu-sidebar"
import { ApprovedExpenseTable, RejectedExpenseTable } from "@/components/expense-status-table"
import { formatCurrency, formatDate } from "@/lib/utils"

interface MemberRow {
  id: string
  name: string | null
  email: string
  totalBudget: number
  totalEdits: number
  createdAt: Date
  _count: {
    expenses: number
  }
}

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  status: "APPROVED" | "REJECTED"
  createdAt: Date
}

interface MembersContentProps {
  members: MemberRow[]
}

export default function MembersContent({ members }: MembersContentProps) {
  const [activeView, setActiveView] = useState<"members" | "approve" | "reject">("members")
  const [approvedExpenses, setApprovedExpenses] = useState<Expense[]>([])
  const [rejectedExpenses, setRejectedExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchApprovedExpenses() {
    setLoading(true)
    try {
      const res = await fetch("/api/expenses/approved")
      const data = await res.json()
      setApprovedExpenses(data)
    } catch (error) {
      console.error("Failed to fetch approved expenses:", error)
    }
    setLoading(false)
  }

  async function fetchRejectedExpenses() {
    setLoading(true)
    try {
      const res = await fetch("/api/expenses/rejected")
      const data = await res.json()
      setRejectedExpenses(data)
    } catch (error) {
      console.error("Failed to fetch rejected expenses:", error)
    }
    setLoading(false)
  }

  function handleApproveClick() {
    setActiveView("approve")
    if (approvedExpenses.length === 0) {
      void fetchApprovedExpenses()
    }
  }

  function handleRejectClick() {
    setActiveView("reject")
    if (rejectedExpenses.length === 0) {
      void fetchRejectedExpenses()
    }
  }

  function handleBackToMembers() {
    setActiveView("members")
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <MyMenuSidebar
        onApproveClick={handleApproveClick}
        onRejectClick={handleRejectClick}
        activeView={activeView === "approve" ? "approve" : activeView === "reject" ? "reject" : null}
      />

      <main className="flex-1 p-6">
        {activeView === "approve" && (
          <div>
            <button
              onClick={handleBackToMembers}
              className="mb-4 text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Members
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Approved Expenses</h2>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
              <ApprovedExpenseTable expenses={approvedExpenses} />
            )}
          </div>
        )}

        {activeView === "reject" && (
          <div>
            <button
              onClick={handleBackToMembers}
              className="mb-4 text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Members
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Not Approved Expenses</h2>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
              <RejectedExpenseTable expenses={rejectedExpenses} />
            )}
          </div>
        )}

        {activeView === "members" && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Member List</h1>
              <p className="mt-1 text-gray-600">Admin access only: manage member accounts</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Budget</th>
                      <th className="px-4 py-3 font-semibold">Expenses</th>
                      <th className="px-4 py-3 font-semibold">Edits</th>
                      <th className="px-4 py-3 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          No members found
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => (
                        <tr key={member.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">{member.name || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">{member.email}</td>
                          <td className="px-4 py-3 text-gray-900">{formatCurrency(member.totalBudget)}</td>
                          <td className="px-4 py-3 text-gray-700">{member._count.expenses}</td>
                          <td className="px-4 py-3 text-gray-700">{member.totalEdits}</td>
                          <td className="px-4 py-3 text-gray-700">{formatDate(member.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-100">
                {members.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">No members found</div>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="p-4 space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900">{member.name || "-"}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Budget</p>
                          <p className="font-medium text-gray-900">{formatCurrency(member.totalBudget)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Expenses</p>
                          <p className="font-medium text-gray-900">{member._count.expenses}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Edits</p>
                          <p className="font-medium text-gray-900">{member.totalEdits}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Joined</p>
                          <p className="font-medium text-gray-900">{formatDate(member.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
