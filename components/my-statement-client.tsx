'use client'

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Search, CheckCircle, XCircle, Clock, Plus, Wallet } from "lucide-react"
import { createFund } from "@/actions/expense"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Expense {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
  status: "APPROVED" | "REJECTED" | "PENDING" | "PAID"
  createdAt: Date
}

interface MyStatementClientProps {
  userId: string
}

function formatCategory(category: string): string {
  if (category === "OFFICE_GOODS") return "Office Goods"
  if (category === "FREIGHT") return "Freight/Gaddi"
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ")
}

function FundDepositModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: "",
    receivedFrom: "",
    receivedFromDescription: "",
    paymentMode: "CASH" as "CASH" | "GPAY" | "BANK_ACCOUNT",
    fundDate: new Date().toISOString().split("T")[0],
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await createFund({
      amount: parseFloat(formData.amount),
      receivedFrom: formData.receivedFrom === "OTHER" 
        ? formData.receivedFromDescription 
        : formData.receivedFrom,
      paymentMode: formData.paymentMode,
      fundDate: formData.fundDate,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      onClose()
      setSuccess(false)
      setFormData({
        amount: "",
        receivedFrom: "",
        receivedFromDescription: "",
        paymentMode: "CASH",
        fundDate: new Date().toISOString().split("T")[0],
      })
    }, 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Deposit Fund</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-green-600 font-medium">Fund deposited successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fundDate">Date *</Label>
              <Input
                id="fundDate"
                type="date"
                value={formData.fundDate}
                onChange={(e) => setFormData({ ...formData, fundDate: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="receivedFrom">Received From *</Label>
              <Select
                id="receivedFrom"
                value={formData.receivedFrom}
                onChange={(e) => setFormData({ ...formData, receivedFrom: e.target.value, receivedFromDescription: "" })}
                className="mt-1"
                required
              >
                <option value="">Select</option>
                <option value="Ajay">Ajay</option>
                <option value="Rishav">Rishav</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>

            {formData.receivedFrom === "OTHER" && (
              <div>
                <Label htmlFor="receivedFromDescription">Description *</Label>
                <Textarea
                  id="receivedFromDescription"
                  value={formData.receivedFromDescription}
                  onChange={(e) => setFormData({ ...formData, receivedFromDescription: e.target.value })}
                  placeholder="Enter description"
                  required
                  className="mt-1"
                  rows={2}
                />
              </div>
            )}

            <div>
              <Label htmlFor="paymentMode">Payment Mode *</Label>
              <Select
                id="paymentMode"
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as "CASH" | "GPAY" | "BANK_ACCOUNT" })}
                className="mt-1"
              >
                <option value="CASH">Cash</option>
                <option value="GPAY">GPay</option>
                <option value="BANK_ACCOUNT">Bank Account</option>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Submitting..." : "Submit"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function MyStatementClient({ userId }: MyStatementClientProps) {
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [approvedExpenses, setApprovedExpenses] = useState<Expense[]>([])
  const [rejectedExpenses, setRejectedExpenses] = useState<Expense[]>([])
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([])
  const [activeTab, setActiveTab] = useState<"approved" | "rejected" | "pending">("approved")
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showFundModal, setShowFundModal] = useState(false)

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

      const [approvedRes, rejectedRes, pendingRes] = await Promise.all([
        fetch(`/api/expenses/statement?${params.toString()}&status=APPROVED`),
        fetch(`/api/expenses/statement?${params.toString()}&status=REJECTED`),
        fetch(`/api/expenses/statement?${params.toString()}&status=PENDING`),
      ])

      const approvedData = await approvedRes.json()
      const rejectedData = await rejectedRes.json()
      const pendingData = await pendingRes.json()

      setApprovedExpenses(approvedData)
      setRejectedExpenses(rejectedData)
      setPendingExpenses(pendingData)
    } catch (error) {
      console.error("Failed to fetch expenses:", error)
    }

    setLoading(false)
  }

  const approvedTotal = approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const rejectedTotal = rejectedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const pendingTotal = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const currentExpenses = activeTab === "approved" ? approvedExpenses : activeTab === "rejected" ? rejectedExpenses : pendingExpenses
  const currentTotal = activeTab === "approved" ? approvedTotal : activeTab === "rejected" ? rejectedTotal : pendingTotal

  const statusColors = {
    approved: "bg-green-100 text-green-700 border-green-300",
    rejected: "bg-red-100 text-red-700 border-red-300",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
  }

  const totalColor = activeTab === "approved" ? "text-green-600" : activeTab === "rejected" ? "text-red-600" : "text-yellow-600"

  return (
    <div className="space-y-3">
      <Card className="bg-white">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">From</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-7 w-32 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">To</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-7 w-32 text-xs"
              />
            </div>
            <Button
              onClick={() => void handleSearch()}
              disabled={!fromDate || !toDate || loading}
              className="h-7 text-xs px-3"
            >
              <Search className="w-3 h-3 mr-1" />
              {loading ? "..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab("approved")}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded font-medium transition border ${
                activeTab === "approved" ? statusColors.approved : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              Approved ({approvedExpenses.length})
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded font-medium transition border ${
                activeTab === "rejected" ? statusColors.rejected : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <XCircle className="w-3 h-3" />
              Not Approved ({rejectedExpenses.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded font-medium transition border ${
                activeTab === "pending" ? statusColors.pending : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Clock className="w-3 h-3" />
              Pending ({pendingExpenses.length})
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-500">Total:</span>
              <span className={`text-sm font-bold ${totalColor}`}>
                {formatCurrency(currentTotal)}
              </span>
            </div>
          </div>

          <Card className="bg-white">
            <CardContent className="p-0">
              {currentExpenses.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No {activeTab === "approved" ? "approved" : activeTab === "rejected" ? "rejected" : "pending"} expenses found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-gray-600">Date</th>
                        <th className="px-3 py-2 font-semibold text-gray-600">Category</th>
                        <th className="px-3 py-2 font-semibold text-gray-600 text-right">Amount</th>
                        <th className="px-3 py-2 font-semibold text-gray-600 text-right">Day Total</th>
                        <th className="px-3 py-2 font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentExpenses.map((expense) => {
                        const dayTotal = currentExpenses
                          .filter(e => formatDate(e.createdAt) === formatDate(expense.createdAt))
                          .reduce((sum, e) => sum + e.amount, 0)
                        return (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-700">{formatDate(expense.createdAt)}</td>
                            <td className="px-3 py-2 text-gray-700">{formatCategory(expense.category)}</td>
                            <td className="px-3 py-2 font-semibold text-gray-900 text-right">{formatCurrency(expense.amount)}</td>
                            <td className="px-3 py-2 text-gray-600 text-right">{formatCurrency(dayTotal)}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                activeTab === "approved" 
                                  ? "bg-green-100 text-green-700" 
                                  : activeTab === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                                {activeTab === "approved" ? "Approved" : activeTab === "rejected" ? "Not Approved" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <FundDepositModal isOpen={showFundModal} onClose={() => setShowFundModal(false)} />
    </div>
  )
}

export { FundDepositModal }