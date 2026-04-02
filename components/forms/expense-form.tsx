"use client"

import { useState } from "react"
import { createExpense, updateExpense } from "@/actions/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ExpenseCategory } from "@/lib/types"

interface ExpenseFormProps {
  expense?: {
    id: string
    title: string
    description: string | null
    amount: number
    category: ExpenseCategory
  }
  onSuccess?: () => void
}

const categories = [
  { value: "FREIGHT", label: "Freight/Gaddi" },
  { value: "PORTER", label: "Porter" },
  { value: "FOOD", label: "Food" },
  { value: "OFFICE_GOODS", label: "Office Goods" },
  { value: "HOTEL", label: "Hotel" },
  { value: "PETROL", label: "Petrol" },
  { value: "DIESEL", label: "Diesel" },
  { value: "OTHER", label: "Other" },
] as const

export function ExpenseForm({ expense, onSuccess }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      amount: parseFloat(formData.get("amount") as string),
      category: formData.get("category") as ExpenseCategory,
    }

    let result
    if (expense) {
      result = await updateExpense(expense.id, data)
    } else {
      result = await createExpense(data)
    }

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      if (onSuccess) onSuccess()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense ? "Edit Expense" : "Create New Expense"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Expense title"
              defaultValue={expense?.title}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Add details about this expense..."
              defaultValue={expense?.description || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
                placeholder="₹0.00"
              defaultValue={expense?.amount}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              id="category" 
              name="category" 
              defaultValue={expense?.category || "OTHER"}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : expense ? "Update Expense" : "Create Expense"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
