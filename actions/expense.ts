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

const paymentSchema = z.object({
  id: z.string(),
})

export async function createExpense(data: z.infer<typeof expenseSchema>) {
  const session = await auth()
  
  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== "MEMBER") {
    return { error: "Only members can create expenses" }
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

  if (session.user.role !== "MEMBER") {
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
          totalBudget: true,
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

  if (session.user.role !== "MEMBER") {
    return { error: "Only members can edit expenses" }
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

  if (session.user.role !== "MEMBER") {
    return { error: "Only members can delete expenses" }
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

  const expense = await prisma.expense.findUnique({
    where: { id },
  })

  if (!expense) {
    return { error: "Expense not found" }
  }

  if (expense.status === "PAID") {
    return { error: "Paid expenses cannot be changed" }
  }

  if (expense.status === "APPROVED" && status === "APPROVED") {
    return { error: "Expense is already approved" }
  }

  if (expense.status === "REJECTED" && status === "REJECTED") {
    return { error: "Expense is already rejected" }
  }

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

export async function markExpensePaid(data: z.infer<typeof paymentSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized - Admin access required" }
  }

  const result = paymentSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { id } = result.data

  const expense = await prisma.expense.findUnique({
    where: { id },
  })

  if (!expense) {
    return { error: "Expense not found" }
  }

  if (expense.status !== ExpenseStatus.APPROVED) {
    return { error: "Only approved expenses can be marked as paid" }
  }

  await prisma.expense.update({
    where: { id },
    data: {
      status: ExpenseStatus.PAID,
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

  const [total, pending, approved, rejected, paid] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.count({ where: { ...where, status: "PENDING" } }),
    prisma.expense.count({ where: { ...where, status: "APPROVED" } }),
    prisma.expense.count({ where: { ...where, status: "REJECTED" } }),
    prisma.expense.count({ where: { ...where, status: "PAID" } }),
  ])

  const totalApprovedAmount = await prisma.expense.aggregate({
    where: { ...where, status: "APPROVED" },
    _sum: { amount: true },
  })

  const totalPaidAmount = await prisma.expense.aggregate({
    where: { ...where, status: "PAID" },
    _sum: { amount: true },
  })

  // Get submitted expenses total (PENDING + APPROVED + REJECTED)
  const submittedAmount = await prisma.expense.aggregate({
    where,
    _sum: { amount: true },
  })

  // Get user's total budget
  let totalBudget = 0
  if (session.user.role !== "ADMIN") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totalBudget: true },
    })
    totalBudget = user?.totalBudget || 0
  }

  const submittedTotal = submittedAmount._sum.amount || 0
  const remainingBudget = totalBudget - submittedTotal

  return {
    total,
    pending,
    approved,
    rejected,
    paid,
    totalApprovedAmount: totalApprovedAmount._sum.amount || 0,
    totalPaidAmount: totalPaidAmount._sum.amount || 0,
    totalBudget,
    submittedAmount: submittedTotal,
    remainingBudget,
  }
}

export async function updateUserBudget(newBudget: number) {
  const session = await auth()
  
  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  if (session.user.role === "ADMIN") {
    return { error: "Admins cannot update budget" }
  }

  if (newBudget < 0) {
    return { error: "Budget must be 0 or greater" }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { totalBudget: newBudget },
    select: { totalBudget: true },
  })

  revalidatePath("/dashboard")
  revalidatePath("/admin")
  revalidatePath("/admin/members")

  return { success: true, totalBudget: updated.totalBudget }
}
