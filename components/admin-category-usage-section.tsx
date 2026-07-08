"use client"

import { useState } from "react"
import { getCategoryMemberExpenses } from "@/actions/category"
import { formatCurrency, formatDate } from "@/lib/utils"

type Category = {
  id: string
  name: string
  description: string | null
  memberCount: number
  expenseCount: number
  totalAmount: number
}

type CategoryMemberExpense = {
  id: string
  memberName: string
  description: string | null
  amount: number
  createdAt: Date
}

interface AdminCategoryUsageSectionProps {
  categories: Category[]
  fromDate?: string
  toDate?: string
}

export function AdminCategoryUsageSection({ categories, fromDate, toDate }: AdminCategoryUsageSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [memberExpenses, setMemberExpenses] = useState<CategoryMemberExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleCategoryClick(categoryName: string) {
    setSelectedCategory(categoryName)
    setLoading(true)
    setError("")

    const result = await getCategoryMemberExpenses({ categoryName, fromDate, toDate })

    if (result.error) {
      setError(result.error)
      setMemberExpenses([])
      setLoading(false)
      return
    }

    setMemberExpenses(result.data)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-[760px] w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Members Used</th>
              <th className="px-4 py-3 font-semibold">Expense Count</th>
              <th className="px-4 py-3 font-semibold">Total Expense</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No categories added yet
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr
                  key={category.id}
                  className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedCategory === category.name ? "bg-red-50" : ""
                  }`}
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                  <td className="px-4 py-3 text-gray-700">{category.description || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{category.memberCount}</td>
                  <td className="px-4 py-3 text-gray-700">{category.expenseCount}</td>
                  <td className="px-4 py-3 text-gray-900">{formatCurrency(category.totalAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedCategory && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">
              Members Using Category: {selectedCategory}
            </h3>
          </div>

          <div className="p-4">
            {error && <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            {loading ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
            ) : memberExpenses.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No member expenses found for this category
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[700px] w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Member Name</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberExpenses.map((expense) => (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}
