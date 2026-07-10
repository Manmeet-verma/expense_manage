"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { approveOrRejectExpense, markExpensePaid, bulkApprovePendingMemberExpenses, updatePendingMemberExpense, deletePendingMemberExpense } from "@/actions/expense"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

type Expense = {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID"
  createdAt: string
  createdBy: {
    id: string
    name: string | null
    email: string | null
    totalBudget: number | null
  } | null
}

type CategoryStat = {
  name: string
  expenseCount: number
  totalAmount: number
  memberCount: number
}

type CategoryMemberExpense = {
  id: string
  memberName: string
  description: string | null
  amount: number
  createdAt: string
}

const EXPENSE_CATEGORIES = [
  "FREIGHT",
  "PORTER",
  "FOOD",
  "OFFICE_GOODS",
  "HOTEL",
  "PETROL",
  "DIESEL",
  "ADVANCE",
  "SALARY",
  "OTHER",
] as const

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

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

interface AdminExpenseReviewClientProps {
  isAdmin: boolean
  isSupervisor: boolean
}

export function AdminExpenseReviewClient({ isAdmin, isSupervisor }: AdminExpenseReviewClientProps) {
  const router = useRouter()
  const today = getTodayString()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editCategory, setEditCategory] = useState("OTHER")
  const [editError, setEditError] = useState("")

  const canReviewPending = isAdmin || isSupervisor

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ fromDate, toDate })
      const res = await fetch(`/api/expenses/admin?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setExpenses(data)
    } catch (error) {
      console.error("Failed to fetch expenses:", error)
      setExpenses([])
    }
    setLoading(false)
  }, [fromDate, toDate])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const categoryStats: CategoryStat[] = (() => {
    const map = new Map<string, { expenseCount: number; totalAmount: number; members: Set<string> }>()
    for (const exp of expenses) {
      const key = formatCategory(exp.category)
      const existing = map.get(key) ?? { expenseCount: 0, totalAmount: 0, members: new Set<string>() }
      existing.expenseCount += 1
      existing.totalAmount += exp.amount
      if (exp.createdBy?.name || exp.createdBy?.email) {
        existing.members.add(exp.createdBy.name || exp.createdBy.email || "")
      }
      map.set(key, existing)
    }
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        expenseCount: stats.expenseCount,
        totalAmount: stats.totalAmount,
        memberCount: stats.members.size,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
  })()

  const categoryMemberExpenses: CategoryMemberExpense[] = selectedCategory
    ? expenses
        .filter((exp) => formatCategory(exp.category) === selectedCategory)
        .map((exp) => ({
          id: exp.id,
          memberName: exp.createdBy?.name || exp.createdBy?.email || "Unknown",
          description: exp.description,
          amount: exp.amount,
          createdAt: exp.createdAt,
        }))
    : []

  const memberOptions = (() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const exp of expenses) {
      if (exp.createdBy?.id) {
        const name = exp.createdBy.name || exp.createdBy.email || "Unknown"
        if (!map.has(exp.createdBy.id)) {
          map.set(exp.createdBy.id, { id: exp.createdBy.id, name })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  })()

  const memberPendingExpenses = selectedMemberId
    ? expenses.filter((exp) => exp.createdBy?.id === selectedMemberId && exp.status === "PENDING")
    : []

  function toggleSelectAllPending() {
    if (selectedPendingIds.length === memberPendingExpenses.length) {
      setSelectedPendingIds([])
    } else {
      setSelectedPendingIds(memberPendingExpenses.map((exp) => exp.id))
    }
  }

  function togglePendingSelection(id: string) {
    setSelectedPendingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  async function handleApproveSelected() {
    if (selectedPendingIds.length === 0) return
    const result = await bulkApprovePendingMemberExpenses({ ids: selectedPendingIds })
    if (result?.error) {
      console.error(result.error)
      return
    }
    setSelectedPendingIds([])
    router.refresh()
    fetchExpenses()
  }

  async function handleApprove(id: string) {
    const result = await approveOrRejectExpense({ id, status: "APPROVED" })
    if (result?.error) {
      console.error(result.error)
      return
    }
    router.refresh()
    fetchExpenses()
  }

  async function handleReject(id: string) {
    const result = await approveOrRejectExpense({ id, status: "REJECTED" })
    if (result?.error) {
      console.error(result.error)
      return
    }
    router.refresh()
    fetchExpenses()
  }

  async function handlePaid(id: string) {
    const result = await markExpensePaid({ id })
    if (result?.error) {
      console.error(result.error)
      return
    }
    router.refresh()
    fetchExpenses()
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id)
    setEditTitle(expense.title)
    setEditDescription(expense.description || "")
    setEditAmount(String(expense.amount))
    setEditCategory(expense.category)
    setEditError("")
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle("")
    setEditDescription("")
    setEditAmount("")
    setEditCategory("OTHER")
    setEditError("")
  }

  async function saveEdit(expenseId: string) {
    const parsedAmount = parseFloat(editAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setEditError("Amount must be greater than 0")
      return
    }
    if (!editTitle.trim()) {
      setEditError("Title is required")
      return
    }

    setEditError("")
    const result = await updatePendingMemberExpense(expenseId, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      amount: parsedAmount,
      category: editCategory,
    })

    if (result?.error) {
      setEditError(result.error)
      return
    }

    cancelEdit()
    router.refresh()
    fetchExpenses()
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Are you sure you want to delete this pending expense?")) return

    const result = await deletePendingMemberExpense(expenseId)
    if (result?.error) {
      console.error(result.error)
      return
    }
    router.refresh()
    fetchExpenses()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">From</span>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">To</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>
        <Button
          onClick={() => fetchExpenses()}
          disabled={!fromDate || !toDate || loading}
          className="h-8 text-sm px-3"
        >
          <Search className="w-3.5 h-3.5 mr-1" />
          {loading ? "Loading..." : "Search"}
        </Button>

        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">Member</span>
          <select
            value={selectedMemberId}
            onChange={(e) => { setSelectedMemberId(e.target.value); setSelectedPendingIds([]) }}
            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Members</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedMemberId && memberPendingExpenses.length > 0 && canReviewPending && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selectedPendingIds.length === memberPendingExpenses.length}
              onChange={toggleSelectAllPending}
            />
            Select All Pending ({memberPendingExpenses.length})
          </label>
          <Button
            onClick={() => void handleApproveSelected()}
            disabled={selectedPendingIds.length === 0}
            size="sm"
            variant="success"
          >
            Approve Selected ({selectedPendingIds.length})
          </Button>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        <h3 className="text-base font-semibold text-gray-900">Expenses</h3>
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
            Loading...
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
            No expenses found for selected date range
          </div>
        ) : (
          expenses.map((expense) => {
            const isEditing = editingId === expense.id
            return (
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

                {isEditing ? (
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    {editError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{editError}</div>}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Title</p>
                      <Input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Description</p>
                      <Input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Amount</p>
                        <Input type="number" step="0.01" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Category</p>
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{formatCategory(cat)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(expense.id)} className="flex-1">Save</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-medium text-gray-900">{formatCurrency(expense.amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-medium text-gray-900">{formatDate(expense.createdAt)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500">Description</p>
                        <p className="font-medium text-gray-900">{expense.description || "-"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {expense.status === "PENDING" && canReviewPending && (
                        <>
                          <Button onClick={() => handleApprove(expense.id)} size="sm" variant="success" className="flex-1 min-w-[80px]">Approve</Button>
                          <Button onClick={() => handleReject(expense.id)} size="sm" variant="destructive" className="flex-1 min-w-[80px]">Reject</Button>
                          <Button onClick={() => startEdit(expense)} size="sm" variant="outline" className="flex-1 min-w-[80px]">Edit</Button>
                          <Button onClick={() => handleDelete(expense.id)} size="sm" variant="ghost" className="flex-1 min-w-[80px] text-red-600 hover:bg-red-50">Delete</Button>
                        </>
                      )}

                      {expense.status === "PENDING" && isAdmin && (
                        <span className="text-xs text-gray-500">Waiting for supervisor review</span>
                      )}

                      {expense.status === "APPROVED" && isAdmin && (
                        <Button onClick={() => handlePaid(expense.id)} size="sm" variant="default" className="w-full">Mark Paid</Button>
                      )}

                      {expense.status === "APPROVED" && isSupervisor && (
                        <span className="text-xs text-gray-500">Sent to admin for payment</span>
                      )}

                      {expense.status === "PAID" && (
                        <span className="text-xs text-gray-500">No further action</span>
                      )}

                      {expense.status === "REJECTED" && (
                        <span className="text-xs text-gray-500">Rejected by supervisor</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
        <table className="min-w-[760px] w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              {selectedMemberId && <th className="px-4 py-3 font-semibold w-10">Select</th>}
              <th className="px-4 py-3 font-semibold">Member Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading...</td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">No expenses found for selected date range</td>
              </tr>
            ) : (
              expenses.map((expense) => {
                const isEditing = editingId === expense.id
                return (
                  <tr key={expense.id} className="border-t border-gray-100">
                    {selectedMemberId && (
                      <td className="px-4 py-3">
                        {expense.status === "PENDING" && (
                          <input type="checkbox" checked={selectedPendingIds.includes(expense.id)} onChange={() => togglePendingSelection(expense.id)} />
                        )}
                      </td>
                    )}
                    {isEditing ? (
                      <>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {expense.createdBy?.name || expense.createdBy?.email || "Unknown"}
                        </td>
                        <td className="px-4 py-3">
                          <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="h-7 w-full rounded border border-gray-300 bg-white px-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{formatCategory(cat)}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="h-7 text-xs" />
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" step="0.01" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="h-7 w-24 text-xs" />
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(expense.createdAt)}</td>
                        <td className="px-4 py-3"><Badge variant="warning">Editing</Badge></td>
                        <td className="px-4 py-3">
                          {editError && <div className="text-xs text-red-600 mb-1">{editError}</div>}
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => saveEdit(expense.id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {expense.createdBy?.name || expense.createdBy?.email || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatCategory(expense.category)}</td>
                        <td className="px-4 py-3 text-gray-700">{expense.description || "-"}</td>
                        <td className="px-4 py-3 text-gray-900">{formatCurrency(expense.amount)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(expense.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusVariant(expense.status)}>{expense.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {expense.status === "PENDING" && canReviewPending && (
                              <>
                                <Button onClick={() => handleApprove(expense.id)} size="sm" variant="success">Approve</Button>
                                <Button onClick={() => handleReject(expense.id)} size="sm" variant="destructive">Reject</Button>
                                <Button onClick={() => startEdit(expense)} size="sm" variant="outline">Edit</Button>
                                <Button onClick={() => handleDelete(expense.id)} size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">Delete</Button>
                              </>
                            )}

                            {expense.status === "PENDING" && isAdmin && (
                              <span className="text-xs text-gray-500">Waiting for supervisor review</span>
                            )}

                            {expense.status === "APPROVED" && isAdmin && (
                              <Button onClick={() => handlePaid(expense.id)} size="sm" variant="default">Mark Paid</Button>
                            )}

                            {expense.status === "APPROVED" && isSupervisor && (
                              <span className="text-xs text-gray-500">Sent to admin for payment</span>
                            )}

                            {expense.status === "PAID" && (
                              <span className="text-xs text-gray-500">No further action</span>
                            )}

                            {expense.status === "REJECTED" && (
                              <span className="text-xs text-gray-500">Rejected by supervisor</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {categoryStats.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Category-wise Expenses</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-[600px] w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Members Used</th>
                  <th className="px-4 py-3 font-semibold">Expense Count</th>
                  <th className="px-4 py-3 font-semibold">Total Expense</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((cat) => (
                  <tr
                    key={cat.name}
                    className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedCategory === cat.name ? "bg-red-50" : ""
                    }`}
                    onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-700">{cat.memberCount}</td>
                    <td className="px-4 py-3 text-gray-700">{cat.expenseCount}</td>
                    <td className="px-4 py-3 text-gray-900">{formatCurrency(cat.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedCategory && categoryMemberExpenses.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Members Using Category: {selectedCategory}
                </h3>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="min-w-[600px] w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Member Name</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryMemberExpenses.map((expense) => (
                      <tr key={expense.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-900 font-medium">{expense.memberName}</td>
                        <td className="px-4 py-3 text-gray-700">{expense.description || "-"}</td>
                        <td className="px-4 py-3 text-gray-900">{formatCurrency(expense.amount)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(expense.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
