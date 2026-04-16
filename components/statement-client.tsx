'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Search, CheckCircle, XCircle, Clock, DollarSign, List, Edit, Trash2 } from "lucide-react"
import { updateExpense, deleteExpense } from "@/actions/expense"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { broadcastExpenseChange } from "@/lib/supabase/realtime"

interface Expense {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
  status: "APPROVED" | "REJECTED" | "PENDING" | "PAID"
  createdAt: Date
}

interface Fund {
  id: string
  amount: number
  receivedFrom: string
  paymentMode: string
  fundDate: Date
  createdAt: Date
}

type TabType = "all" | "approved" | "rejected" | "pending" | "collection"

const CATEGORIES = [
  { value: "FREIGHT", label: "Freight/Gaddi" },
  { value: "PORTER", label: "Porter" },
  { value: "FOOD", label: "Food" },
  { value: "OFFICE_GOODS", label: "Office Goods" },
  { value: "HOTEL", label: "Hotel" },
  { value: "PETROL", label: "Petrol" },
  { value: "DIESEL", label: "Diesel" },
  { value: "OTHER", label: "Other" },
]

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getCurrentMonthDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  }
}

function formatCategory(category: string): string {
  if (category === "OFFICE_GOODS") return "Office Goods"
  if (category === "FREIGHT") return "Freight/Gaddi"
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ")
}

export function StatementClient({ userId }: { userId: string }) {
  const router = useRouter()
  const defaultRange = getCurrentMonthDateRange()
  const [fromDate, setFromDate] = useState(defaultRange.from)
  const [toDate, setToDate] = useState(defaultRange.to)
  const [searchTerm, setSearchTerm] = useState("")
  const [approvedExpenses, setApprovedExpenses] = useState<Expense[]>([])
  const [rejectedExpenses, setRejectedExpenses] = useState<Expense[]>([])
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([])
  const [collectionFunds, setCollectionFunds] = useState<Fund[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("collection")
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [pendingActionLoading, setPendingActionLoading] = useState(false)
  const [pendingActionError, setPendingActionError] = useState("")
  const [pendingActionSuccess, setPendingActionSuccess] = useState("")
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    amount: "",
    category: "",
  })

  async function handleSearch() {
    if (!fromDate || !toDate) return

    setLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        userId,
      })

      const [approvedRes, rejectedRes, pendingRes, collectionRes] = await Promise.all([
        fetch(`/api/expenses/statement?${params.toString()}&status=APPROVED`),
        fetch(`/api/expenses/statement?${params.toString()}&status=REJECTED`),
        fetch(`/api/expenses/statement?${params.toString()}&status=PENDING`),
        fetch(`/api/funds/statement?${params.toString()}`),
      ])

      const [approvedData, rejectedData, pendingData, collectionData] = await Promise.all([
        approvedRes.json(),
        rejectedRes.json(),
        pendingRes.json(),
        collectionRes.json(),
      ])

      setApprovedExpenses(approvedData || [])
      setRejectedExpenses(rejectedData || [])
      setPendingExpenses(pendingData || [])
      setCollectionFunds(collectionData || [])
      setActiveTab("collection")
    } catch (error) {
      console.error("Failed to fetch data:", error)
    }

    setLoading(false)
  }

  function openEditModal(expense: Expense) {
    setPendingActionError("")
    setPendingActionSuccess("")
    setEditingExpense(expense)
    setEditForm({
      title: expense.title,
      description: expense.description || "",
      amount: expense.amount.toString(),
      category: expense.category,
    })
  }

  function closeEditModal() {
    if (pendingActionLoading) return
    setEditingExpense(null)
  }

  async function handlePendingEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingExpense) return

    setPendingActionLoading(true)
    setPendingActionError("")

    const result = await updateExpense(editingExpense.id, {
      title: editForm.title.trim() || editingExpense.title,
      description: editForm.description.trim() || undefined,
      amount: parseFloat(editForm.amount),
      category: editForm.category,
    })

    if (result?.error) {
      setPendingActionError(result.error)
      setPendingActionLoading(false)
      return
    }

    setPendingActionLoading(false)
    setEditingExpense(null)
    setPendingActionSuccess("Pending expense updated successfully")
    void broadcastExpenseChange("member-edit")
    await handleSearch()
    router.refresh()
    setTimeout(() => setPendingActionSuccess(""), 2500)
  }

  async function handlePendingDelete(expenseId: string) {
    const confirmed = window.confirm("Delete this pending expense?")
    if (!confirmed) return

    setPendingActionLoading(true)
    setPendingActionError("")

    const result = await deleteExpense(expenseId)
    if (result?.error) {
      setPendingActionError(result.error)
      setPendingActionLoading(false)
      return
    }

    setPendingActionLoading(false)
    setPendingActionSuccess("Pending expense deleted successfully")
    void broadcastExpenseChange("member-delete")
    await handleSearch()
    router.refresh()
    setTimeout(() => setPendingActionSuccess(""), 2500)
  }

  const allExpenses = [...approvedExpenses, ...rejectedExpenses, ...pendingExpenses]

  const filteredExpenses = (expenses: Expense[]) => {
    if (!searchTerm) return expenses
    return expenses.filter(
      (exp) =>
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredFunds = (funds: Fund[]) => {
    if (!searchTerm) return funds
    return funds.filter(
      (fund) =>
        fund.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fund.paymentMode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case "approved":
        return { data: filteredExpenses(approvedExpenses), total: approvedExpenses.reduce((sum, e) => sum + e.amount, 0) }
      case "rejected":
        return { data: filteredExpenses(rejectedExpenses), total: rejectedExpenses.reduce((sum, e) => sum + e.amount, 0) }
      case "pending":
        return { data: filteredExpenses(pendingExpenses), total: pendingExpenses.reduce((sum, e) => sum + e.amount, 0) }
      case "collection":
        return { data: filteredFunds(collectionFunds), total: collectionFunds.reduce((sum, f) => sum + f.amount, 0), isCollection: true }
      case "all":
      default:
        return { data: filteredExpenses(allExpenses), total: allExpenses.reduce((sum, e) => sum + e.amount, 0) }
    }
  }

  const { data: currentData, total: currentTotal, isCollection } = getCurrentData()

  const statusColors = {
    all: "bg-blue-100 text-blue-700 border-blue-300",
    approved: "bg-green-100 text-green-700 border-green-300",
    rejected: "bg-red-100 text-red-700 border-red-300",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    collection: "bg-purple-100 text-purple-700 border-purple-300",
  }

  const tabColors = {
    all: "text-blue-600",
    approved: "text-green-600",
    rejected: "text-red-600",
    pending: "text-yellow-600",
    collection: "text-purple-600",
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">From</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 w-32 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">To</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 w-32 text-xs"
                />
              </div>
              <Button
                onClick={() => void handleSearch()}
                disabled={!fromDate || !toDate || loading}
                className="h-8 text-xs px-3"
              >
                <Search className="w-3 h-3 mr-1" />
                {loading ? "..." : "Search"}
              </Button>
            </div>
            {hasSearched && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <>
          {pendingActionError && (
            <div className="rounded border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {pendingActionError}
            </div>
          )}
          {pendingActionSuccess && (
            <div className="rounded border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
              {pendingActionSuccess}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab("collection")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition border ${
                activeTab === "collection" ? statusColors.collection : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <DollarSign className="w-3 h-3" />
              Collection ({collectionFunds.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition border ${
                activeTab === "all" ? statusColors.all : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <List className="w-3 h-3" />
              All ({allExpenses.length})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition border ${
                activeTab === "approved" ? statusColors.approved : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              Approved ({approvedExpenses.length})
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition border ${
                activeTab === "rejected" ? statusColors.rejected : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <XCircle className="w-3 h-3" />
              Not Approved ({rejectedExpenses.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition border ${
                activeTab === "pending" ? statusColors.pending : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Clock className="w-3 h-3" />
              Pending ({pendingExpenses.length})
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-500">Total:</span>
              <span className={`text-sm font-bold ${tabColors[activeTab]}`}>
                {formatCurrency(currentTotal)}
              </span>
            </div>
          </div>

          <Card className="bg-white">
            <CardContent className="p-0">
              {currentData.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">
                  No records found
                </div>
              ) : isCollection ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-2 py-1.5 font-medium text-gray-600">Date</th>
                        <th className="px-2 py-1.5 font-medium text-gray-600">Received From</th>
                        <th className="px-2 py-1.5 font-medium text-gray-600">Mode</th>
                        <th className="px-2 py-1.5 font-medium text-gray-600 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(currentData as Fund[]).map((fund) => (
                        <tr key={fund.id} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 text-gray-700">{formatDate(fund.createdAt)}</td>
                          <td className="px-2 py-1.5 text-gray-700 truncate max-w-32">{fund.receivedFrom}</td>
                          <td className="px-2 py-1.5 text-gray-700">
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              {fund.paymentMode}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 font-medium text-gray-900 text-right">{formatCurrency(fund.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-2 py-1.5 font-medium text-gray-600">Date</th>
                        <th className="px-2 py-1.5 font-medium text-gray-600">Category</th>
                        <th className="px-2 py-1.5 font-medium text-gray-600">Title</th>
                        <th className="px-2 py-1.5 font-medium text-gray-600">Description</th>
                        <th className="px-2 py-1.5 font-medium text-gray-600 text-right">Amount</th>
                        <th className="px-2 py-1.5 font-medium text-gray-600">Status</th>
                        {activeTab === "pending" && <th className="px-2 py-1.5 font-medium text-gray-600 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(currentData as Expense[]).map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 text-gray-700">{formatDate(expense.createdAt)}</td>
                          <td className="px-2 py-1.5 text-gray-700 truncate max-w-24">{formatCategory(expense.category)}</td>
                          <td className="px-2 py-1.5 text-gray-700 truncate max-w-32">{expense.title}</td>
                          <td className="px-2 py-1.5 text-gray-700 truncate max-w-40">{expense.description || "-"}</td>
                          <td className="px-2 py-1.5 font-medium text-gray-900 text-right">{formatCurrency(expense.amount)}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              expense.status === "APPROVED" || expense.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : expense.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {expense.status === "REJECTED" ? "Not Approved" : expense.status}
                            </span>
                          </td>
                          {activeTab === "pending" && (
                            <td className="px-2 py-1.5">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => openEditModal(expense)}
                                  disabled={pendingActionLoading}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 px-2"
                                  onClick={() => void handlePendingDelete(expense.id)}
                                  disabled={pendingActionLoading}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {editingExpense && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-md">
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">Edit Pending Expense</h3>
                    <Button variant="ghost" size="sm" onClick={closeEditModal} disabled={pendingActionLoading}>
                      x
                    </Button>
                  </div>

                  <form onSubmit={handlePendingEditSubmit} className="space-y-3">
                    <div>
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editForm.title}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-category">Category</Label>
                      <Select
                        id="edit-category"
                        value={editForm.category}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.currentTarget.value }))}
                        required
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-amount">Amount</Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.amount}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        rows={3}
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button type="button" variant="outline" className="flex-1" onClick={closeEditModal} disabled={pendingActionLoading}>
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={pendingActionLoading}>
                        {pendingActionLoading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
