'use client'

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"
import { deleteMember } from "@/actions/delete-member"
import { approveOrRejectExpense } from "@/actions/expense"

interface MemberRow {
  id: string
  name: string | null
  email: string
  totalEdits: number
  createdAt: Date
  _count: {
    expenses: number
  }
}

interface MembersContentProps {
  members?: MemberRow[]
}

interface MemberExpense {
  id: string
  title: string
  amount: number
  category: string
  status: "APPROVED" | "REJECTED" | "PENDING"
  createdAt: string
  adminRemark: string | null
}

type ExpenseView = "approved" | "rejected" | "pending"

export default function MembersContent({ members: initialMembers }: MembersContentProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null)
  const [activeView, setActiveView] = useState<ExpenseView>("pending")
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [approving, setApproving] = useState(false)
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([])
  const [expensesByStatus, setExpensesByStatus] = useState<{
    approved: MemberExpense[]
    rejected: MemberExpense[]
    pending: MemberExpense[]
  }>({ approved: [], rejected: [], pending: [] })
  const members = useMemo(() => initialMembers ?? [], [initialMembers])

  async function handleDelete(memberId: string) {
    try {
      if (deletingId) return
      
      const confirmed = window.confirm("Are you sure you want to delete this member?")
      if (!confirmed) return
      
      setDeletingId(memberId)
      
      const result = await deleteMember({ memberId })
      
      if (result && 'error' in result) {
        alert(result.error)
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Error deleting member")
    } finally {
      setDeletingId(null)
    }
  }

  async function openMemberExpenses(member: MemberRow) {
    setSelectedMember(member)
    setActiveView("pending")
    setSelectedPendingIds([])
    setLoadingExpenses(true)

    try {
      const response = await fetch(`/api/expenses/member/${member.id}`, { method: "GET" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load expenses")
      }

      setExpensesByStatus({
        approved: data.approved || [],
        rejected: data.rejected || [],
        pending: data.pending || [],
      })
    } catch (error) {
      console.error("Failed to load member expenses:", error)
      alert("Could not load member expenses")
      setExpensesByStatus({ approved: [], rejected: [], pending: [] })
    } finally {
      setLoadingExpenses(false)
    }
  }

  async function approveSingleExpense(id: string) {
    setApproving(true)
    const result = await approveOrRejectExpense({ id, status: "APPROVED" })
    if (result?.error) {
      alert(result.error)
      setApproving(false)
      return
    }

    if (selectedMember) {
      await openMemberExpenses(selectedMember)
    }
    setApproving(false)
  }

  async function approveSelectedExpenses() {
    if (selectedPendingIds.length === 0) {
      alert("Please select pending expenses first")
      return
    }

    setApproving(true)

    for (const expenseId of selectedPendingIds) {
      const result = await approveOrRejectExpense({ id: expenseId, status: "APPROVED" })
      if (result?.error) {
        alert(result.error)
        setApproving(false)
        return
      }
    }

    if (selectedMember) {
      await openMemberExpenses(selectedMember)
    }
    setApproving(false)
  }

  function toggleSelectAllPending() {
    if (selectedPendingIds.length === expensesByStatus.pending.length) {
      setSelectedPendingIds([])
      return
    }

    setSelectedPendingIds(expensesByStatus.pending.map((expense) => expense.id))
  }

  function togglePendingSelection(id: string) {
    setSelectedPendingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const currentExpenses =
    activeView === "approved"
      ? expensesByStatus.approved
      : activeView === "rejected"
        ? expensesByStatus.rejected
        : expensesByStatus.pending

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6">
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
                  <th className="px-4 py-3 font-semibold">Expenses</th>
                  <th className="px-4 py-3 font-semibold">Edits</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
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
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <button
                          onClick={() => openMemberExpenses(member)}
                          className="text-blue-700 hover:text-blue-800"
                        >
                          {member.name || "-"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{member.email}</td>
                      <td className="px-4 py-3 text-gray-700">{member._count.expenses}</td>
                      <td className="px-4 py-3 text-gray-700">{member.totalEdits}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(member.createdAt)}</td>
                      <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleDelete(member.id)}
                            disabled={deletingId === member.id}
                            className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                          >
                            {deletingId === member.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
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
                    <button
                      onClick={() => openMemberExpenses(member)}
                      className="font-semibold text-blue-700 hover:text-blue-800"
                    >
                      {member.name || "-"}
                    </button>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
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
                  <button
                    onClick={() => handleDelete(member.id)}
                    disabled={deletingId === member.id}
                    className="w-full mt-2 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === member.id ? "Deleting..." : "Delete Member"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedMember && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedMember.name || selectedMember.email} - Expense List
                </h2>
                <p className="text-sm text-gray-600">{selectedMember.email}</p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-4 max-w-xs">
              <button
                onClick={() => setActiveView("approved")}
                className={`w-full text-left px-3 py-2 text-sm rounded ${activeView === "approved" ? "bg-green-100 text-green-700 border border-green-300" : "bg-gray-50 text-gray-700"}`}
              >
                Approved ({expensesByStatus.approved.length})
              </button>
              <button
                onClick={() => setActiveView("rejected")}
                className={`w-full text-left px-3 py-2 text-sm rounded ${activeView === "rejected" ? "bg-red-100 text-red-700 border border-red-300" : "bg-gray-50 text-gray-700"}`}
              >
                Rejected ({expensesByStatus.rejected.length})
              </button>
              <button
                onClick={() => setActiveView("pending")}
                className={`w-full text-left px-3 py-2 text-sm rounded ${activeView === "pending" ? "bg-yellow-100 text-yellow-700 border border-yellow-300" : "bg-gray-50 text-gray-700"}`}
              >
                Pending ({expensesByStatus.pending.length})
              </button>
            </div>

            {activeView === "pending" && expensesByStatus.pending.length > 0 && (
              <div className="flex flex-col items-start gap-3 mb-4 max-w-xs">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedPendingIds.length === expensesByStatus.pending.length}
                    onChange={toggleSelectAllPending}
                  />
                  Select All
                </label>
                <button
                  onClick={approveSelectedExpenses}
                  disabled={approving || selectedPendingIds.length === 0}
                  className="w-full px-3 py-2 text-sm rounded bg-green-600 text-white disabled:opacity-50"
                >
                  {approving ? "Approving..." : `Approve Selected (${selectedPendingIds.length})`}
                </button>
              </div>
            )}

            {loadingExpenses ? (
              <div className="py-8 text-center text-gray-500">Loading expenses...</div>
            ) : currentExpenses.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No expenses found in this section</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      {activeView === "pending" && <th className="px-3 py-2 font-semibold">Select</th>}
                      <th className="px-3 py-2 font-semibold">Title</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Amount</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentExpenses.map((expense) => (
                      <tr key={expense.id} className="border-t border-gray-100">
                        {activeView === "pending" && (
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedPendingIds.includes(expense.id)}
                              onChange={() => togglePendingSelection(expense.id)}
                            />
                          </td>
                        )}
                        <td className="px-3 py-2 text-gray-900">{expense.title}</td>
                        <td className="px-3 py-2 text-gray-700">{expense.category}</td>
                        <td className="px-3 py-2 text-gray-900">{formatCurrency(expense.amount)}</td>
                        <td className="px-3 py-2 text-gray-700">{formatDate(expense.createdAt)}</td>
                        <td className="px-3 py-2 text-gray-700">{expense.status}</td>
                        <td className="px-3 py-2">
                          {activeView === "pending" ? (
                            <button
                              onClick={() => approveSingleExpense(expense.id)}
                              disabled={approving}
                              className="px-2 py-1 text-xs rounded bg-green-600 text-white disabled:opacity-50"
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
