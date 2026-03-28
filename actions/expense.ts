'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { ExpenseCategory, ExpenseStatus } from "@prisma/client"

const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(["FOOD", "TRAVEL", "TRANSPORTATION", "ACCOMMODATION", "OFFICE_SUPPLIES", "COMMUNICATION", "ENTERTAINMENT", "OTHER"]),
})

const approvalSchema = z.object({
  id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminRemark: z.string().optional(),
})

export async function createExpense(data: z.infer<typeof expenseSchema>) {
  const session = await auth()
  
  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const result = expenseSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { title, description, amount, category } = result.data

  await prisma.expense.create({
    data: {
      title,
      description,
      amount,
      category: category as ExpenseCategory,
      createdById: session.user.id,
    },
  })

  revalidatePath("/dashboard")
  return { success: true }
}

export async function getMyExpenses() {
  const session = await auth()
  
  if (!session?.user) {
    return []
  }

  return await prisma.expense.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAllExpenses() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return []
  }

  return await prisma.expense.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function updateExpense(id: string, data: z.infer<typeof expenseSchema>) {
  const session = await auth()
  
  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
  })

  if (!expense) {
    return { error: "Expense not found" }
  }

  if (expense.createdById !== session.user.id) {
    return { error: "You can only edit your own expenses" }
  }

  if (expense.status !== "PENDING") {
    return { error: "Cannot edit approved or rejected expenses" }
  }

  const result = expenseSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { title, description, amount, category } = result.data

  await prisma.expense.update({
    where: { id },
    data: {
      title,
      description,
      amount,
      category: category as ExpenseCategory,
    },
  })

  revalidatePath("/dashboard")
  return { success: true }
}

export async function deleteExpense(id: string) {
  const session = await auth()
  
  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
  })

  if (!expense) {
    return { error: "Expense not found" }
  }

  if (expense.createdById !== session.user.id) {
    return { error: "You can only delete your own expenses" }
  }

  if (expense.status !== "PENDING") {
    return { error: "Cannot delete approved or rejected expenses" }
  }

  await prisma.expense.delete({
    where: { id },
  })

  revalidatePath("/dashboard")
  return { success: true }
}

export async function approveOrRejectExpense(data: z.infer<typeof approvalSchema>) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized - Admin access required" }
  }

  const result = approvalSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { id, status, adminRemark } = result.data

  await prisma.expense.update({
    where: { id },
    data: {
      status: status as ExpenseStatus,
      adminRemark,
    },
  })

  revalidatePath("/admin")
  return { success: true }
}

export async function getExpenseStats() {
  const session = await auth()
  
  if (!session?.user) {
    return null
  }

  const where = session.user.role === "ADMIN" 
    ? {} 
    : { createdById: session.user.id }

  const [total, pending, approved, rejected] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.count({ where: { ...where, status: "PENDING" } }),
    prisma.expense.count({ where: { ...where, status: "APPROVED" } }),
    prisma.expense.count({ where: { ...where, status: "REJECTED" } }),
  ])

  const totalAmount = await prisma.expense.aggregate({
    where: { ...where, status: "APPROVED" },
    _sum: { amount: true },
  })

  return {
    total,
    pending,
    approved,
    rejected,
    totalApprovedAmount: totalAmount._sum.amount || 0,
  }
}
