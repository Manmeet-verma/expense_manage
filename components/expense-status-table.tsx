'use client'

import { formatCurrency, formatDate } from "@/lib/utils"
import { CheckCircle, XCircle } from "lucide-react"

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  status: "APPROVED" | "REJECTED"
  createdAt: Date
}

interface ApprovedExpenseTableProps {
  expenses: Expense[]
}

function formatCategory(category: string): string {
  if (category === "OFFICE_GOODS") return "Office Goods"
  if (category === "FREIGHT") return "Freight/Gaddi"
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ")
}

export function ApprovedExpenseTable({ expenses }: ApprovedExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No approved expenses found
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-green-50 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-green-800">Date</th>
              <th className="px-4 py-3 font-semibold text-green-800">Category</th>
              <th className="px-4 py-3 font-semibold text-green-800">Total Expense</th>
              <th className="px-4 py-3 font-semibold text-green-800">Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-700">{formatDate(expense.createdAt)}</td>
                <td className="px-4 py-3 text-gray-700">{formatCategory(expense.category)}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{formatCurrency(expense.amount)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Approve
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100">
        {expenses.map((expense) => (
          <div key={expense.id} className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{formatDate(expense.createdAt)}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3" />
                Approve
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{formatCategory(expense.category)}</span>
              <span className="font-medium text-gray-900">{formatCurrency(expense.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface RejectedExpenseTableProps {
  expenses: Expense[]
}

export function RejectedExpenseTable({ expenses }: RejectedExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No rejected expenses found
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-red-50 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-red-800">Date</th>
              <th className="px-4 py-3 font-semibold text-red-800">Category</th>
              <th className="px-4 py-3 font-semibold text-red-800">Total Expense</th>
              <th className="px-4 py-3 font-semibold text-red-800">Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-700">{formatDate(expense.createdAt)}</td>
                <td className="px-4 py-3 text-gray-700">{formatCategory(expense.category)}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{formatCurrency(expense.amount)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <XCircle className="h-3 w-3" />
                    Not Approved
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100">
        {expenses.map((expense) => (
          <div key={expense.id} className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{formatDate(expense.createdAt)}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <XCircle className="h-3 w-3" />
                Not Approved
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{formatCategory(expense.category)}</span>
              <span className="font-medium text-gray-900">{formatCurrency(expense.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
