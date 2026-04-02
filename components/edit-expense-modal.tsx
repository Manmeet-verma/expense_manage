"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateExpense } from "@/actions/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { broadcastExpenseChange } from "@/lib/supabase/realtime"
import { X } from "lucide-react"

interface Expense {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
}

interface EditExpenseModalProps {
  expense: Expense
  budget: number
  totalAmountUsed: number
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

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

export function EditExpenseModal({ expense, budget, totalAmountUsed, isOpen, onClose, onSuccess }: EditExpenseModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    title: expense.title,
    description: expense.description || "",
    amount: expense.amount.toString(),
    category: expense.category,
  })

  if (!isOpen) return null

  const editedAmount = parseFloat(formData.amount) || 0
  const adjustedTotalExpense = totalAmountUsed - expense.amount + editedAmount
  const adjustedRemaining = budget - adjustedTotalExpense

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await updateExpense(expense.id, {
      title: formData.title,
      description: formData.description || undefined,
      amount: parseFloat(formData.amount),
      category: formData.category as "FREIGHT" | "PORTER" | "FOOD" | "OFFICE_GOODS" | "HOTEL" | "PETROL" | "DIESEL" | "OTHER",
    })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      void broadcastExpenseChange("member-edit")
      router.refresh()
      onClose()
      onSuccess?.()
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-center">
        <Card className="w-full md:max-w-md md:rounded-lg rounded-t-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Edit Expense</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Expense title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.currentTarget.value })}
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details about this expense..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="₹0.00"
                  required
                />
              </div>

              <Card className="bg-gray-50 border-0">
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Budget:</span>
                      <span className="font-semibold">{formatCurrency(budget)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expense (after edit):</span>
                      <span className="font-semibold">{formatCurrency(adjustedTotalExpense)}</span>
                    </div>
                    <div className={`flex justify-between border-t pt-2 ${adjustedRemaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                      <span className="font-semibold">Remaining (real-time):</span>
                      <span className="font-bold">{formatCurrency(adjustedRemaining)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
