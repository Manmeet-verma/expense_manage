"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createExpense } from "@/actions/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"
import { PencilIcon, CheckIcon, XIcon } from "lucide-react"

interface EnhancedExpenseFormProps {
  memberName: string
  submittedExpenseAmount: number
  totalAmountUsed: number
  onSuccess?: () => void
}

const CATEGORIES = [
  { value: "TRAVEL", label: "Travel" },
  { value: "FOOD", label: "Food & Dining" },
  { value: "OFFICE_SUPPLIES", label: "Office" },
] as const

export function EnhancedExpenseForm({ 
  memberName,
  submittedExpenseAmount,
  totalAmountUsed,
  onSuccess 
}: EnhancedExpenseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expenseAmount, setExpenseAmount] = useState(0)
  const [liveSubmittedAmount, setLiveSubmittedAmount] = useState(submittedExpenseAmount)
  const [editingSubmitted, setEditingSubmitted] = useState(false)
  const [submittedEditValue, setSubmittedEditValue] = useState(submittedExpenseAmount.toString())
  const [submittedLoading, setSubmittedLoading] = useState(false)
  const [submittedError, setSubmittedError] = useState("")

  useEffect(() => {
    setLiveSubmittedAmount(submittedExpenseAmount)
    setSubmittedEditValue(submittedExpenseAmount.toString())
  }, [submittedExpenseAmount])

  const editValue = Number.parseFloat(submittedEditValue)
  const previewSubmittedAmount = editingSubmitted && !Number.isNaN(editValue)
    ? editValue
    : liveSubmittedAmount

  const remainingExpense = previewSubmittedAmount - totalAmountUsed

  async function handleSubmittedExpenseUpdate() {
    setSubmittedLoading(true)
    setSubmittedError("")
    const newSubmitted = parseFloat(submittedEditValue)

    if (isNaN(newSubmitted) || newSubmitted < 0) {
      setSubmittedError("Amount must be 0 or greater")
      setSubmittedLoading(false)
      return
    }

    // Allow the edit locally (submitted expense is now editable by member)
    setLiveSubmittedAmount(newSubmitted)
    setSubmittedEditValue(newSubmitted.toString())
    setEditingSubmitted(false)
    setSubmittedLoading(false)
  }
  const totalAfterExpense = totalAmountUsed + expenseAmount
  const remainingAfterExpense = previewSubmittedAmount - totalAfterExpense

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      amount: parseFloat(formData.get("amount") as string),
      category: formData.get("category") as "TRAVEL" | "FOOD" | "OFFICE_SUPPLIES",
    }

    const result = await createExpense(data)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      e.currentTarget.reset()
      setExpenseAmount(0)
      router.refresh()
      if (onSuccess) onSuccess()
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Budget Overview Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-blue-900">Budget Overview</CardTitle>
          {!editingSubmitted && (
            <button
              onClick={() => {
                setSubmittedEditValue(liveSubmittedAmount.toString())
                setEditingSubmitted(true)
              }}
              className="p-2 text-blue-600 hover:bg-blue-200 rounded-lg transition"
              title="Edit submitted expense"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {submittedError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {submittedError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700 mb-1">Member Name</p>
              <p className="text-lg font-semibold text-blue-900">{memberName}</p>
            </div>
            {/* Editable Submitted Expense */}
            <div>
              {editingSubmitted ? (
                <div className="space-y-2">
                  <p className="text-sm text-blue-700">Submitted Expense</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={submittedEditValue}
                      onChange={(e) => setSubmittedEditValue(e.target.value)}
                      step="0.01"
                      min="0"
                      className="p-1 h-8 text-sm"
                    />
                    <button
                      onClick={handleSubmittedExpenseUpdate}
                      disabled={submittedLoading}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                      title="Save"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingSubmitted(false)
                        setSubmittedEditValue(liveSubmittedAmount.toString())
                        setSubmittedError("")
                      }}
                      disabled={submittedLoading}
                      className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
                      title="Cancel"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                  {submittedEditValue && !Number.isNaN(editValue) && (
                    <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                      New Remaining: {formatCurrency(editValue - totalAmountUsed)}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-blue-700 mb-1">Submitted Expense</p>
                  <p className="text-lg font-semibold text-blue-900">{formatCurrency(liveSubmittedAmount)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-blue-700 mb-1">Total Expense</p>
              <p className="text-lg font-semibold text-blue-900">{formatCurrency(totalAmountUsed)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 mb-1">Remaining</p>
              <p className={`text-lg font-semibold ${remainingExpense >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatCurrency(remainingExpense)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Expense title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                id="category" 
                name="category" 
                defaultValue="TRAVEL"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Add details about this expense..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Expense Amount (INR) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="₹0.00"
              onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          {/* Real-time calculation */}
          <Card className="bg-gray-50 border-0">
            <CardContent className="pt-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Expense (before):</span>
                  <span className="font-semibold">{formatCurrency(totalAmountUsed)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">+ New Expense:</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(expenseAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">= Total Expense (after):</span>
                  <span className="font-semibold">{formatCurrency(totalAfterExpense)}</span>
                </div>
                <div className={`flex justify-between border-t pt-2 ${remainingAfterExpense < 0 ? "text-red-600" : "text-green-600"}`}>
                  <span className="font-semibold">Remaining (after):</span>
                  <span className="font-bold text-lg">{formatCurrency(remainingAfterExpense)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Create Expense"}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  )
    }
