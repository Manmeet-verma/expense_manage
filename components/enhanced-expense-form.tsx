"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createExpense } from "@/actions/expense"
import { updateUserBudget } from "@/actions/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"
import { broadcastExpenseChange } from "@/lib/supabase/realtime"
import { PencilIcon, CheckIcon, XIcon } from "lucide-react"

interface EnhancedExpenseFormProps {
  memberName: string
  budget: number
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
  budget,
  totalAmountUsed,
  onSuccess 
}: EnhancedExpenseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expenseAmount, setExpenseAmount] = useState(0)
  const [liveTotalAmountUsed, setLiveTotalAmountUsed] = useState(totalAmountUsed)
  const [liveBudget, setLiveBudget] = useState(budget)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetEditValue, setBudgetEditValue] = useState(budget.toString())
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetError, setBudgetError] = useState("")

  useEffect(() => {
    setLiveTotalAmountUsed(totalAmountUsed)
    setLiveBudget(budget)
    setBudgetEditValue(budget.toString())
  }, [budget, totalAmountUsed])

  async function handleBudgetUpdate() {
    setBudgetLoading(true)
    setBudgetError("")
    const newBudget = parseFloat(budgetEditValue)

    if (isNaN(newBudget) || newBudget < 0) {
      setBudgetError("Amount must be 0 or greater")
      setBudgetLoading(false)
      return
    }

    const result = await updateUserBudget(newBudget)
    if (result?.error) {
      setBudgetError(result.error)
      setBudgetLoading(false)
      return
    }

    setLiveBudget(newBudget)
    setBudgetEditValue(newBudget.toString())
    setEditingBudget(false)
    void broadcastExpenseChange("member-budget-update")
    router.refresh()
    setBudgetLoading(false)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = e.currentTarget
    const formData = new FormData(form)
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      amount: parseFloat(formData.get("amount") as string),
      category: formData.get("category") as "TRAVEL" | "FOOD" | "OFFICE_SUPPLIES",
    }
    const createdAmount = data.amount

    const result = await createExpense(data)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      form.reset()
      setExpenseAmount(0)
      setLiveTotalAmountUsed((prev) => prev + createdAmount)
      void broadcastExpenseChange("member-create")
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
          {!editingBudget && (
            <button
              onClick={() => {
                setBudgetEditValue(liveBudget.toString())
                setEditingBudget(true)
              }}
              className="p-2 text-blue-600 hover:bg-blue-200 rounded-lg transition"
              title="Edit budget"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {budgetError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {budgetError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700 mb-1">Member Name</p>
              <p className="text-lg font-semibold text-blue-900">{memberName}</p>
            </div>
            {/* Editable Budget */}
            <div>
              {editingBudget ? (
                <div className="space-y-2">
                  <p className="text-sm text-blue-700">Budget</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={budgetEditValue}
                      onChange={(e) => setBudgetEditValue(e.target.value)}
                      step="0.01"
                      min="0"
                      className="p-1 h-8 text-sm"
                    />
                    <button
                      onClick={handleBudgetUpdate}
                      disabled={budgetLoading}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                      title="Save"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingBudget(false)
                        setBudgetEditValue(liveBudget.toString())
                        setBudgetError("")
                      }}
                      disabled={budgetLoading}
                      className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
                      title="Cancel"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-blue-700 mb-1">Budget</p>
                  <p className="text-lg font-semibold text-blue-900">{formatCurrency(liveBudget)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-blue-700 mb-1">Total Expense</p>
              <p className="text-lg font-semibold text-blue-900">{formatCurrency(liveTotalAmountUsed)}</p>
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
                  <span className="font-semibold">{formatCurrency(liveTotalAmountUsed)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">+ New Expense:</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(expenseAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">= Total (after):</span>
                  <span className="font-semibold">{formatCurrency(liveTotalAmountUsed + expenseAmount)}</span>
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
