'use client'

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"
import { deleteMember } from "@/actions/auth"
import { approveOrRejectExpense } from "@/actions/expense"

interface MemberRow {
  id: string
  name: string | null
  email: string
  receivedAmount: number
  totalEdits: number
  createdAt: Date
  _count: {
    expenses: number
  }
}

interface MembersContentProps {
  members?: MemberRow[]
  canManage?: boolean
  canApproveExpenses?: boolean
}

interface MemberExpense {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
  status: "APPROVED" | "REJECTED" | "PENDING"
  createdAt: string
  adminRemark: string | null
}

interface MemberCollection {
  id: string
  amount: number
  receivedFrom: string
  paymentMode: "CASH" | "GPAY" | "BANK_ACCOUNT"
  fundDate: string
  createdAt: string
}

type ExpenseView = "approved" | "rejected" | "pending" | "collection"

export default function MembersContent({
  members: initialMembers,
  canManage = false,
  canApproveExpenses = false,
}: MembersContentProps) {
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
  const [collectionFunds, setCollectionFunds] = useState<MemberCollection[]>([])
  const members = useMemo(() => initialMembers ?? [], [initialMembers])

  async function handleDelete(memberId: string) {
    if (!canManage) {
      return
    }

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
      const [expensesResponse, collectionsResponse] = await Promise.all([
        fetch(`/api/expenses/member/${member.id}`, { method: "GET" }),
        fetch(`/api/funds/statement?userId=${member.id}`, { method: "GET" }),
      ])

      const [expensesData, collectionsData] = await Promise.all([
        expensesResponse.json(),
        collectionsResponse.json(),
      ])

      if (!expensesResponse.ok) {
        throw new Error(expensesData?.error || "Failed to load expenses")
      }

      if (!collectionsResponse.ok) {
        throw new Error(collectionsData?.error || "Failed to load collections")
      }

      setExpensesByStatus({
        approved: expensesData.approved || [],
        rejected: expensesData.rejected || [],
        pending: expensesData.pending || [],
      })
      setCollectionFunds(collectionsData || [])
    } catch (error) {
      console.error("Failed to load member expenses:", error)
      alert("Could not load member expenses")
      setExpensesByStatus({ approved: [], rejected: [], pending: [] })
      setCollectionFunds([])
    } finally {
      setLoadingExpenses(false)
    }
  }

  async function approveSingleExpense(id: string) {
    if (!canApproveExpenses) {
      return
    }

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
    if (!canApproveExpenses) {
      return
    }

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
        : activeView === "collection"
          ? collectionFunds
          : expensesByStatus.pending

  const currentTotal =
    activeView === "approved"
      ? expensesByStatus.approved.reduce((sum, expense) => sum + expense.amount, 0)
      : activeView === "rejected"
        ? expensesByStatus.rejected.reduce((sum, expense) => sum + expense.amount, 0)
        : activeView === "collection"
          ? collectionFunds.reduce((sum, fund) => sum + fund.amount, 0)
          : expensesByStatus.pending.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="min-h-[calc(100vh-4rem)] p-3 sm:p-6">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Member List</h1>
          <p className="mt-1 text-gray-600">
            {canManage ? "Admin access: manage member accounts" : "Supervisor access: view member accounts"}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Expenses</th>
                  <th className="px-4 py-3 font-semibold">Collection</th>
                  <th className="px-4 py-3 font-semibold">Edits</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
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
                      <td className="px-4 py-3 text-gray-700">{formatCurrency(member.receivedAmount)}</td>
                      <td className="px-4 py-3 text-gray-700">{member.totalEdits}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(member.createdAt)}</td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleDelete(member.id)}
                              disabled={deletingId === member.id}
                              className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                            >
                              {deletingId === member.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">View only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="hidden divide-y divide-gray-100">
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
                      <p className="text-gray-500">Collection</p>
                      <p className="font-medium text-gray-900">{formatCurrency(member.receivedAmount)}</p>
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
                  {canManage ? (
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={deletingId === member.id}
                      className="w-full mt-2 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === member.id ? "Deleting..." : "Delete Member"}
                    </button>
                  ) : (
                    <p className="w-full mt-2 py-2 text-center text-xs text-gray-500 border border-gray-200 rounded">
                      View only
                    </p>
                  )}
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
              <button
                onClick={() => setActiveView("collection")}
                className={`w-full text-left px-3 py-2 text-sm rounded ${activeView === "collection" ? "bg-purple-100 text-purple-700 border border-purple-300" : "bg-gray-50 text-gray-700"}`}
              >
                Collection ({collectionFunds.length})
              </button>
            </div>

            {activeView === "pending" && canApproveExpenses && expensesByStatus.pending.length > 0 && (
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

            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-600">
                {activeView === "collection" ? "Total Collection" : "Total Amount"}
              </span>
              <span className={`font-semibold ${activeView === "collection" ? "text-purple-700" : "text-gray-900"}`}>
                {formatCurrency(currentTotal)}
              </span>
            </div>

            {loadingExpenses ? (
              <div className="py-8 text-center text-gray-500">Loading records...</div>
            ) : currentExpenses.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No {activeView === "collection" ? "collections" : "expenses"} found in this section
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full text-xs sm:text-sm ${activeView === "collection" ? "min-w-[760px]" : "min-w-[860px]"}`}>
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      {activeView === "pending" && canApproveExpenses && <th className="px-3 py-2 font-semibold">Select</th>}
                      {activeView === "collection" ? (
                        <>
                          <th className="px-3 py-2 font-semibold">Date</th>
                          <th className="px-3 py-2 font-semibold">Received From</th>
                          <th className="px-3 py-2 font-semibold">Payment Mode</th>
                          <th className="px-3 py-2 font-semibold">Amount</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 font-semibold">Title</th>
                          <th className="px-3 py-2 font-semibold">Description</th>
                          <th className="px-3 py-2 font-semibold">Category</th>
                          <th className="px-3 py-2 font-semibold">Amount</th>
                          <th className="px-3 py-2 font-semibold">Date</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                          <th className="px-3 py-2 font-semibold">Action</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeView === "collection"
                      ? (currentExpenses as MemberCollection[]).map((fund) => (
                          <tr key={fund.id} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-700">{formatDate(fund.fundDate)}</td>
                            <td className="px-3 py-2 text-gray-900">{fund.receivedFrom}</td>
                            <td className="px-3 py-2 text-gray-700">{fund.paymentMode}</td>
                            <td className="px-3 py-2 text-gray-900">{formatCurrency(fund.amount)}</td>
                          </tr>
                        ))
                      : (currentExpenses as MemberExpense[]).map((expense) => (
                          <tr key={expense.id} className="border-t border-gray-100">
                            {activeView === "pending" && canApproveExpenses && (
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedPendingIds.includes(expense.id)}
                                  onChange={() => togglePendingSelection(expense.id)}
                                />
                              </td>
                            )}
                            <td className="px-3 py-2 text-gray-900">{expense.title}</td>
                            <td className="px-3 py-2 text-gray-700">{expense.description || "-"}</td>
                            <td className="px-3 py-2 text-gray-700">{expense.category}</td>
                            <td className="px-3 py-2 text-gray-900">{formatCurrency(expense.amount)}</td>
                            <td className="px-3 py-2 text-gray-700">{formatDate(expense.createdAt)}</td>
                            <td className="px-3 py-2 text-gray-700">{expense.status}</td>
                            <td className="px-3 py-2">
                              {activeView === "pending" && canApproveExpenses ? (
                                <button
                                  onClick={() => approveSingleExpense(expense.id)}
                                  disabled={approving}
                                  className="px-2 py-1 text-xs rounded bg-green-600 text-white disabled:opacity-50"
                                >
                                  Approve
                                </button>
                              ) : activeView === "pending" ? (
                                <span className="text-xs text-gray-400">Waiting for supervisor</span>
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
