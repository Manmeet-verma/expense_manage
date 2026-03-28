"use client"

import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ExpenseStatus } from "@prisma/client"
import { Edit, Trash2, Check, X } from "lucide-react"

interface Expense {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
  status: ExpenseStatus
  adminRemark: string | null
  createdAt: Date
  createdBy?: {
    id: string
    name: string | null
    email: string
  }
}

interface ExpenseListProps {
  expenses: Expense[]
  isAdmin?: boolean
  onEdit?: (expense: Expense) => void
  onDelete?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

const categoryLabels: Record<string, string> = {
  FOOD: "Food & Dining",
  TRAVEL: "Travel",
  TRANSPORTATION: "Transportation",
  ACCOMMODATION: "Accommodation",
  OFFICE_SUPPLIES: "Office Supplies",
  COMMUNICATION: "Communication",
  ENTERTAINMENT: "Entertainment",
  OTHER: "Other",
}

const statusVariants: Record<ExpenseStatus, "default" | "success" | "destructive" | "warning"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
}

export function ExpenseList({ expenses, isAdmin, onEdit, onDelete, onApprove, onReject }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No expenses found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <Card key={expense.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">{expense.title}</h3>
                  <Badge variant={statusVariants[expense.status]}>
                    {expense.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {categoryLabels[expense.category]}
                </p>
                {expense.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {expense.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="font-medium text-green-600">
                    {formatCurrency(expense.amount)}
                  </span>
                  <span>{formatDate(expense.createdAt)}</span>
                  {isAdmin && expense.createdBy && (
                    <span>by {expense.createdBy.name || expense.createdBy.email}</span>
                  )}
                </div>
                {expense.adminRemark && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <span className="font-medium">Admin remark: </span>
                    {expense.adminRemark}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {expense.status === "PENDING" && !isAdmin && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit?.(expense)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete?.(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {isAdmin && expense.status === "PENDING" && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => onApprove?.(expense.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject?.(expense.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
