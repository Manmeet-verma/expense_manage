"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteExpense } from "@/actions/expense"
import { broadcastExpenseChange } from "@/lib/supabase/realtime"
import { ExpenseList } from "@/components/expense-list"
import { EditExpenseModal } from "@/components/edit-expense-modal"
import { DeleteExpenseConfirm } from "@/components/delete-expense-confirm"
import { ExpenseStatus } from "@/lib/types"

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

interface MemberExpenseListProps {
  expenses: Expense[]
  budget: number
  totalAmountUsed: number
}

export function MemberExpenseList({ expenses, budget, totalAmountUsed }: MemberExpenseListProps) {
  const router = useRouter()
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteConfirmExpense = expenses.find((e) => e.id === deletingExpenseId)

  async function handleDelete() {
    if (!deletingExpenseId) return
    setIsDeleting(true)
    const result = await deleteExpense(deletingExpenseId)
    if (result?.success) {
      void broadcastExpenseChange("member-delete")
      router.refresh()
    }
    setIsDeleting(false)
    setDeletingExpenseId(null)
  }

  return (
    <>
      <ExpenseList
        expenses={expenses}
        onEdit={(expense) => setEditingExpense(expense)}
        onDelete={(id) => setDeletingExpenseId(id)}
      />

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          budget={budget}
          totalAmountUsed={totalAmountUsed}
          isOpen={Boolean(editingExpense)}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => {
            void broadcastExpenseChange("member-edit")
            setEditingExpense(null)
            router.refresh()
          }}
        />
      )}

      {deleteConfirmExpense && (
        <DeleteExpenseConfirm
          isOpen={Boolean(deletingExpenseId)}
          onClose={() => setDeletingExpenseId(null)}
          onConfirm={handleDelete}
          expenseTitle={deleteConfirmExpense.title}
          isLoading={isDeleting}
        />
      )}
    </>
  )
}
