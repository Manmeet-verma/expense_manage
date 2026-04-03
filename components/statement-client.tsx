'use client'

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Search, CheckCircle, XCircle, Clock, DollarSign, List } from "lucide-react"

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

function formatCategory(category: string): string {
  if (category === "OFFICE_GOODS") return "Office Goods"
  if (category === "FREIGHT") return "Freight/Gaddi"
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ")
}

export function StatementClient({ userId }: { userId: string }) {
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [approvedExpenses, setApprovedExpenses] = useState<Expense[]>([])
  const [rejectedExpenses, setRejectedExpenses] = useState<Expense[]>([])
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([])
  const [collectionFunds, setCollectionFunds] = useState<Fund[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("collection")
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

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
                        <th className="px-2 py-2 font-semibold text-gray-600">Date</th>
                        <th className="px-2 py-2 font-semibold text-gray-600">Received From</th>
                        <th className="px-2 py-2 font-semibold text-gray-600">Mode</th>
                        <th className="px-2 py-2 font-semibold text-gray-600 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(currentData as Fund[]).map((fund) => (
                        <tr key={fund.id} className="hover:bg-gray-50">
                          <td className="px-2 py-2 text-gray-700">{formatDate(fund.createdAt)}</td>
                          <td className="px-2 py-2 text-gray-700">{fund.receivedFrom}</td>
                          <td className="px-2 py-2 text-gray-700">
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              {fund.paymentMode}
                            </span>
                          </td>
                          <td className="px-2 py-2 font-semibold text-gray-900 text-right">{formatCurrency(fund.amount)}</td>
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
                        <th className="px-2 py-2 font-semibold text-gray-600">Date</th>
                        <th className="px-2 py-2 font-semibold text-gray-600">Category</th>
                        <th className="px-2 py-2 font-semibold text-gray-600">Title</th>
                        <th className="px-2 py-2 font-semibold text-gray-600 text-right">Amount</th>
                        <th className="px-2 py-2 font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(currentData as Expense[]).map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-2 py-2 text-gray-700">{formatDate(expense.createdAt)}</td>
                          <td className="px-2 py-2 text-gray-700">{formatCategory(expense.category)}</td>
                          <td className="px-2 py-2 text-gray-700">{expense.title}</td>
                          <td className="px-2 py-2 font-semibold text-gray-900 text-right">{formatCurrency(expense.amount)}</td>
                          <td className="px-2 py-2">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
