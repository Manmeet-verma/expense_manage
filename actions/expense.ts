'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth, hashPassword } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { findFirstMention } from "@/lib/statement"
import { createNotificationsForAllUsers, createNotification } from "./notification"

const optionalStringSchema = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.string().optional()
)

const expenseSchema = z.object({
  title: optionalStringSchema,
  description: optionalStringSchema,
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
})

const approvalSchema = z.object({
  id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminRemark: z.string().optional(),
})

const bulkApprovalSchema = z.object({
  ids: z.array(z.string()).min(1, "Select at least one expense"),
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

  const expense = await prisma.expense.create({
    data: {
      title: title || category,
      description,
      amount,
      category,
      createdById: session.user.id,
    },
  })

  const memberName = session.user.name || session.user.email

  await createNotificationsForAllUsers({
    title: "New Expense Added",
    message: `${memberName} added a ${category} expense of ₹${amount.toLocaleString("en-IN")}`,
    type: "EXPENSE_CREATED",
    excludeUserId: session.user.id,
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
  
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    return []
  }

  return await prisma.expense.findMany({
    where: {
      createdBy: {
        role: "MEMBER",
      },
    },
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
      category,
      editCount: {
        increment: 1,
      },
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/admin")
  revalidatePath("/admin/members")
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
  revalidatePath("/admin")
  revalidatePath("/admin/members")
  return { success: true }
}

export async function updatePendingMemberExpense(id: string, data: z.infer<typeof expenseSchema>) {
  const session = await auth()

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    return { error: "Unauthorized" }
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          role: true,
        },
      },
    },
  })

  if (!expense) {
    return { error: "Expense not found" }
  }

  if (expense.createdBy.role !== "MEMBER") {
    return { error: "Only member expenses can be edited here" }
  }

  if (expense.status !== "PENDING") {
    return { error: "Only pending expenses can be edited" }
  }

  const result = expenseSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { title, description, amount, category } = result.data

  await prisma.expense.update({
    where: { id },
    data: {
      title: title || category,
      description,
      amount,
      category,
      editCount: {
        increment: 1,
      },
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/admin")
  revalidatePath("/admin/members")
  return { success: true }
}

export async function deletePendingMemberExpense(id: string) {
  const session = await auth()

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    return { error: "Unauthorized" }
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          role: true,
        },
      },
    },
  })

  if (!expense) {
    return { error: "Expense not found" }
  }

  if (expense.createdBy.role !== "MEMBER") {
    return { error: "Only member expenses can be deleted here" }
  }

  if (expense.status !== "PENDING") {
    return { error: "Only pending expenses can be deleted" }
  }

  await prisma.expense.delete({
    where: { id },
  })

  revalidatePath("/dashboard")
  revalidatePath("/admin")
  revalidatePath("/admin/members")
  return { success: true }
}

export async function approveOrRejectExpense(data: z.infer<typeof approvalSchema>) {
  const session = await auth()
  
  if (!session?.user || (session.user.role !== "SUPERVISOR" && session.user.role !== "ADMIN")) {
    return { error: "Unauthorized - Admin or supervisor access required" }
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

  if (expense.status !== "PENDING") {
    return { error: "Only pending expenses can be approved or rejected by admin or supervisor" }
  }

  await prisma.expense.update({
    where: { id },
    data: {
      status,
      adminRemark,
    },
  })

  const reviewerName = session.user.name || session.user.email
  const actionText = status === "APPROVED" ? "approved" : "rejected"
  const notificationType = status === "APPROVED" ? "EXPENSE_APPROVED" : "EXPENSE_REJECTED"

  await createNotification({
    title: `Expense ${status.charAt(0) + status.slice(1).toLowerCase()}`,
    message: `${reviewerName} ${actionText} your ${expense.category} expense of ₹${expense.amount.toLocaleString("en-IN")}${adminRemark ? ` - ${adminRemark}` : ""}`,
    type: notificationType,
    userId: expense.createdById,
  })

  revalidatePath("/admin")
  revalidatePath("/admin/members")
  return { success: true }
}

export async function bulkApprovePendingMemberExpenses(data: { ids: string[] }) {
  const session = await auth()

  if (!session?.user || (session.user.role !== "SUPERVISOR" && session.user.role !== "ADMIN")) {
    return { error: "Unauthorized - Admin or supervisor access required" }
  }

  const result = bulkApprovalSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const ids = [...new Set(result.data.ids.map((id) => id.trim()).filter(Boolean))]

  if (ids.length === 0) {
    return { error: "Select at least one expense" }
  }

  const expenses = await prisma.expense.findMany({
    where: {
      id: { in: ids },
      status: "PENDING",
      createdBy: {
        role: "MEMBER",
      },
    },
    select: {
      id: true,
      amount: true,
      category: true,
      createdById: true,
    },
  })

  if (expenses.length !== ids.length) {
    return { error: "One or more selected expenses are no longer pending" }
  }

  const reviewerName = session.user.name || session.user.email

  await prisma.$transaction(
    ids.map((id) =>
      prisma.expense.update({
        where: { id },
        data: { status: "APPROVED" },
      })
    )
  )

  for (const exp of expenses) {
    await createNotification({
      title: "Expense Approved",
      message: `${reviewerName} approved your ${exp.category} expense of ₹${exp.amount.toLocaleString("en-IN")}`,
      type: "EXPENSE_APPROVED",
      userId: exp.createdById,
    })
  }

  revalidatePath("/dashboard")
  revalidatePath("/admin")
  revalidatePath("/admin/members")
  revalidatePath("/admin/statement")
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

  if (expense.status !== "APPROVED") {
    return { error: "Only approved expenses can be marked as paid" }
  }

  function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  let mentionedMemberId: string | null = null

  if (expense.description) {
    const members = await prisma.user.findMany({
      where: { role: "MEMBER" },
      select: { id: true, name: true, email: true },
    })

    const text = expense.description
    let best: { memberId: string; index: number; length: number; isPayer: boolean } | null = null

    for (const member of members) {
      const labels = Array.from(new Set([member.name, member.email].filter((v): v is string => Boolean(v && v.trim())).map((v) => v.trim())))

      for (const label of labels) {
        const re = new RegExp(`\\b${escapeRegExp(label)}\\b`, "i")
        const match = re.exec(text)
        if (!match || match.index === undefined) continue

        const candidate = {
          memberId: member.id,
          index: match.index,
          length: match[0].length,
          isPayer: member.id === expense.createdById,
        }

        if (
          !best ||
          (best.isPayer && !candidate.isPayer) ||
          (!candidate.isPayer && candidate.index < best.index) ||
          (!candidate.isPayer && candidate.index === best.index && candidate.length > best.length) ||
          (candidate.isPayer === best.isPayer && candidate.index < best.index) ||
          (candidate.isPayer === best.isPayer && candidate.index === best.index && candidate.length > best.length)
        ) {
          best = candidate
        }
      }
    }

    if (best && !best.isPayer) {
      mentionedMemberId = best.memberId
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id },
      data: {
        status: "PAID",
      },
    })

    if (!mentionedMemberId) return

    const payer = await tx.user.findUnique({
      where: { id: expense.createdById },
      select: { name: true, email: true },
    })

    const receivedFrom = `${payer?.name || payer?.email || "Unknown"} | from expense ${expense.id}`

    await tx.fund.create({
      data: {
        amount: expense.amount,
        receivedFrom,
        paymentMode: "CASH",
        status: "PENDING",
        createdById: session.user.id,
        fundDate: new Date(),
        userId: mentionedMemberId,
      },
    })
  })

  if (mentionedMemberId) {
    const mentionedUser = await prisma.user.findUnique({
      where: { id: mentionedMemberId },
      select: { name: true, email: true },
    })

    await createNotification({
      title: "Collection Pending Approval",
      message: `Expense transfer of ₹${expense.amount.toLocaleString("en-IN")} from ${expense.createdById} - awaiting your approval`,
      type: "FUND_RECEIVED",
      userId: mentionedMemberId,
    })

    revalidatePath(`/dashboard/my-statement`)
    revalidatePath(`/dashboard/statement`)
  }

  const adminName = session.user.name || session.user.email

  await createNotification({
    title: "Expense Paid",
    message: `${adminName} marked your ${expense.category} expense of ₹${expense.amount.toLocaleString("en-IN")} as paid`,
    type: "EXPENSE_PAID",
    userId: expense.createdById,
  })

  revalidatePath("/admin")
  revalidatePath("/admin/members")
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
    prisma.expense.count({ where: { ...where, category: { notIn: ["Advance", "Salary"] } } }),
    prisma.expense.count({ where: { ...where, status: "PENDING", category: { notIn: ["Advance", "Salary"] } } }),
    prisma.expense.count({ where: { ...where, status: "APPROVED", category: { notIn: ["Advance", "Salary"] } } }),
    prisma.expense.count({ where: { ...where, status: "REJECTED", category: { notIn: ["Advance", "Salary"] } } }),
    prisma.expense.count({ where: { ...where, status: "PAID", category: { notIn: ["Advance", "Salary"] } } }),
  ])

  const [totalApprovedAmount, totalPaidAmount, totalPendingAmount, totalRejectedAmount] = await Promise.all([
    prisma.expense.aggregate({
      where: { ...where, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...where, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...where, status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...where, status: "REJECTED" },
      _sum: { amount: true },
    }),
  ])

  let totalCollectionAmount = 0
  if (session.user.role === "ADMIN") {
    const adminCollection = await prisma.fund.aggregate({
      where: {},
      _sum: { amount: true },
    })
    totalCollectionAmount = adminCollection._sum.amount || 0
  } else {
    const funds = await prisma.fund.findMany({
      where: { userId: session.user.id, status: "APPROVED" },
      select: { id: true, amount: true, receivedFrom: true },
    })
    totalCollectionAmount = funds.reduce((sum, f) => sum + f.amount, 0)

    const referencedExpenseIds = new Set<string>()
    for (const fund of funds) {
      const match = fund.receivedFrom?.match(/from expense\s+([^\s]+)$/i)
      if (match?.[1]) {
        referencedExpenseIds.add(match[1])
      }
    }

    const allMembers = await prisma.user.findMany({
      where: { role: "MEMBER" },
      select: { id: true, name: true, email: true },
    })

    const memberLinks = allMembers
      .map((m) => ({ id: m.id, label: (m.name?.trim() || m.email.trim()) }))
      .filter((m) => m.label.length > 0)
      .sort((a, b) => b.label.length - a.label.length)

    const otherExpenses = await prisma.expense.findMany({
      where: {
        createdById: { not: session.user.id },
        description: { not: null },
      },
      select: { id: true, amount: true, description: true, title: true, category: true },
    })

    for (const exp of otherExpenses) {
      if (referencedExpenseIds.has(exp.id)) continue
      const cat = exp.category?.toLowerCase()
      if (cat === "advance" || cat === "salary") continue
      const sourceText = exp.description?.trim() || exp.title.trim()
      if (!sourceText) continue
      const mention = findFirstMention(sourceText, memberLinks)
      if (mention && mention.id === session.user.id) {
        totalCollectionAmount += exp.amount
      }
    }
  }

  // Get submitted expenses total (PENDING + APPROVED + REJECTED) - excluding Advance and Salary
  const submittedAmount = await prisma.expense.aggregate({
    where: { ...where, category: { notIn: ["Advance", "Salary"] } },
    _sum: { amount: true },
  })

  // Get Advance and Salary totals
  const [advanceTotal, salaryTotal] = await Promise.all([
    prisma.expense.aggregate({
      where: { ...where, category: "Advance" },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...where, category: "Salary" },
      _sum: { amount: true },
    }),
  ])

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
    totalPendingAmount: totalPendingAmount._sum.amount || 0,
    totalRejectedAmount: totalRejectedAmount._sum.amount || 0,
    collectionAmount: totalCollectionAmount,
    totalBudget,
    submittedAmount: submittedTotal,
    remainingBudget,
    totalAdvanceAmount: advanceTotal._sum.amount || 0,
    totalSalaryAmount: salaryTotal._sum.amount || 0,
  }
}

export async function getApprovedExpenses() {
  const session = await auth()
  
  if (!session?.user) {
    return []
  }

  if (session.user.role !== "MEMBER" && session.user.role !== "ADMIN") {
    return []
  }

  const where =
    session.user.role === "ADMIN"
      ? { status: "APPROVED" as const }
      : { createdById: session.user.id, status: "APPROVED" as const }

  return await prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })
}

export async function getRejectedExpenses() {
  const session = await auth()
  
  if (!session?.user) {
    return []
  }

  if (session.user.role !== "MEMBER" && session.user.role !== "ADMIN") {
    return []
  }

  const where =
    session.user.role === "ADMIN"
      ? { status: "REJECTED" as const }
      : { createdById: session.user.id, status: "REJECTED" as const }

  return await prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })
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

const fundSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  receivedFrom: z.string().min(1, "Received from is required"),
  paymentMode: z.enum(["CASH", "GPAY", "BANK_ACCOUNT"]),
  upiId: z.string().optional(),
  accountNumber: z.string().optional(),
  fundDate: z.string().optional(),
})

export async function createFund(data: z.infer<typeof fundSchema>) {
  const session = await auth()
  
  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== "MEMBER") {
    return { error: "Only members can deposit funds" }
  }

  const result = fundSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { amount, receivedFrom, paymentMode, upiId, accountNumber, fundDate } = result.data

  await prisma.fund.create({
    data: {
      amount,
      receivedFrom,
      paymentMode,
      status: "PENDING",
      upiId: paymentMode === "GPAY" ? upiId || null : null,
      accountNumber: paymentMode === "BANK_ACCOUNT" ? accountNumber || null : null,
      fundDate: fundDate ? new Date(fundDate) : new Date(),
      userId: session.user.id,
    },
  })

  const memberName = session.user.name || session.user.email

  await createNotificationsForAllUsers({
    title: "Collection Pending Approval",
    message: `${memberName} deposited ₹${amount.toLocaleString("en-IN")} via ${paymentMode.replace("_", " ").toLowerCase()} - awaiting approval`,
    type: "FUND_RECEIVED",
    excludeUserId: session.user.id,
  })

  revalidatePath("/dashboard/my-statement")
  return { success: true }
}

export async function getMyFunds() {
  const session = await auth()
  
  if (!session?.user) {
    return []
  }

  if (session.user.role !== "MEMBER") {
    return []
  }

  return await prisma.fund.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function updateFund(id: string, data: z.infer<typeof fundSchema>) {
  const session = await auth()

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const fund = await prisma.fund.findUnique({ where: { id } })
  if (!fund) return { error: "Fund not found" }

  if (fund.userId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "You can only edit your own funds" }
  }

  const result = fundSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { amount, receivedFrom, paymentMode, upiId, accountNumber, fundDate } = result.data

  await prisma.fund.update({
    where: { id },
    data: {
      amount,
      receivedFrom,
      paymentMode,
      upiId: paymentMode === "GPAY" ? upiId || null : null,
      accountNumber: paymentMode === "BANK_ACCOUNT" ? accountNumber || null : null,
      fundDate: fundDate ? new Date(fundDate) : new Date(),
    },
  })

  revalidatePath("/dashboard/my-statement")
  revalidatePath("/dashboard/statement")
  revalidatePath("/admin/statement")
  return { success: true }
}

export async function deleteFund(id: string) {
  const session = await auth()

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const fund = await prisma.fund.findUnique({ where: { id } })
  if (!fund) return { error: "Fund not found" }

  if (fund.userId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "You can only delete your own funds" }
  }

  await prisma.fund.delete({ where: { id } })

  revalidatePath("/dashboard/my-statement")
  revalidatePath("/dashboard/statement")
  revalidatePath("/admin/statement")
  return { success: true }
}

export async function approveFund(id: string) {
  const session = await auth()

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const fund = await prisma.fund.findUnique({ where: { id } })
  if (!fund) return { error: "Fund not found" }

  if (fund.userId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "You can only approve your own funds" }
  }

  if (fund.status !== "PENDING") {
    return { error: "Only pending funds can be approved" }
  }

  await prisma.$transaction([
    prisma.fund.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: fund.userId },
      data: { receivedAmount: { increment: fund.amount } },
    }),
  ])

  await createNotification({
    title: "Fund Approved",
    message: `Your fund of ₹${fund.amount.toFixed(2)} has been approved by ${session.user.name || "Admin"}.`,
    type: "fund-approved",
    userId: fund.userId,
  })

  if (fund.createdById && fund.createdById !== session.user.id) {
    const approverName = session.user.name || "Member"
    const memberDetails = await prisma.user.findUnique({ where: { id: fund.userId }, select: { name: true } })
    await createNotification({
      title: "Distribution Approved",
      message: `${memberDetails?.name || "Member"} approved your distribution of ₹${fund.amount.toFixed(2)}.`,
      type: "distribution-approved",
      userId: fund.createdById,
    })
  }

  revalidatePath("/dashboard/my-statement")
  revalidatePath("/dashboard/statement")
  revalidatePath("/admin/statement")
  revalidatePath("/admin/members")
  revalidatePath("/admin/fund-distribution")
  return { success: true }
}

export async function rejectFund(id: string, reason: string) {
  const session = await auth()

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const fund = await prisma.fund.findUnique({ where: { id } })
  if (!fund) return { error: "Fund not found" }

  if (fund.userId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "You can only reject your own funds" }
  }

  if (fund.status !== "PENDING") {
    return { error: "Only pending funds can be rejected" }
  }

  if (!reason?.trim()) {
    return { error: "Rejection reason is required" }
  }

  await prisma.fund.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectReason: reason.trim(),
    },
  })

  await createNotification({
    title: "Fund Rejected",
    message: `Your fund of ₹${fund.amount.toFixed(2)} has been rejected. Reason: ${reason.trim()}`,
    type: "fund-rejected",
    userId: fund.userId,
  })

  if (fund.createdById && fund.createdById !== session.user.id) {
    const memberDetails = await prisma.user.findUnique({ where: { id: fund.userId }, select: { name: true } })
    await createNotification({
      title: "Distribution Rejected",
      message: `${memberDetails?.name || "Member"} rejected your distribution of ₹${fund.amount.toFixed(2)}. Reason: ${reason.trim()}`,
      type: "distribution-rejected",
      userId: fund.createdById,
    })
  }

  revalidatePath("/dashboard/my-statement")
  revalidatePath("/dashboard/statement")
  revalidatePath("/admin/statement")
  revalidatePath("/admin/members")
  revalidatePath("/admin/fund-distribution")
  return { success: true }
}

const distributeFundSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  amount: z.number().positive("Amount must be positive"),
  description: optionalStringSchema,
  paymentMode: z.enum(["CASH", "GPAY", "BANK_ACCOUNT"]),
})

const updateDistributedFundTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  amount: z.number().positive("Amount must be positive"),
  fundDate: z.string().min(1, "Fund date is required"),
  description: optionalStringSchema,
  paymentMode: z.enum(["CASH", "GPAY", "BANK_ACCOUNT"]),
})

const deleteDistributedFundTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
})

const ADMIN_DISTRIBUTION_PREFIX = "Admin Distribution"

function buildDistributionReceivedFrom(source: string, description?: string) {
  const normalizedDescription = description?.trim()
  return normalizedDescription ? `${source} | ${normalizedDescription}` : source
}

function getDistributionSource(receivedFrom: string) {
  return receivedFrom.split("|")[0]?.trim() || receivedFrom
}

function parseDistributionDescription(receivedFrom: string) {
  const description = receivedFrom.split("|").slice(1).join("|").trim()
  return description || null
}

function revalidateDistributionPaths() {
  revalidatePath("/admin")
  revalidatePath("/admin/fund-distribution")
  revalidatePath("/admin/dashboard")
  revalidatePath("/dashboard/my-statement")
  revalidatePath("/dashboard/statement")
}

export async function distributeFund(data: z.infer<typeof distributeFundSchema>) {
  const session = await auth()
  
  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== "ADMIN") {
    return { error: "Only admins can distribute funds" }
  }

  const result = distributeFundSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { memberId, amount, description, paymentMode } = result.data

  const member = await prisma.user.findFirst({
    where: {
      id: memberId,
      role: "MEMBER",
    },
    select: {
      id: true,
    },
  })

  if (!member) {
    return { error: "Member not found" }
  }

  const distributedBy = session.user.name || session.user.email
  const source = `${ADMIN_DISTRIBUTION_PREFIX}: ${distributedBy}`
  const receivedFrom = buildDistributionReceivedFrom(source, description)

  await prisma.fund.create({
    data: {
      amount,
      receivedFrom,
      paymentMode,
      status: "PENDING",
      createdById: session.user.id,
      fundDate: new Date(),
      userId: memberId,
    },
  })

  const memberDetails = await prisma.user.findUnique({
    where: { id: memberId },
    select: { name: true, email: true },
  })
  const memberName = memberDetails?.name || memberDetails?.email || "Member"

  await createNotification({
    title: "Fund Pending Approval",
    message: `${distributedBy} sent ₹${amount.toLocaleString("en-IN")}${description ? ` for ${description}` : ""} to ${memberName} - awaiting approval`,
    type: "FUND_RECEIVED",
    userId: memberId,
  })

  revalidateDistributionPaths()
  return { success: true }
}

export async function updateDistributedFundTransaction(
  data: z.infer<typeof updateDistributedFundTransactionSchema>
) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can update distribution transactions" }
  }

  const result = updateDistributedFundTransactionSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { transactionId, amount, fundDate, description, paymentMode } = result.data
  const parsedFundDate = new Date(fundDate)

  if (Number.isNaN(parsedFundDate.getTime())) {
    return { error: "Invalid fund date" }
  }

  const transaction = await prisma.fund.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      amount: true,
      userId: true,
      receivedFrom: true,
      user: {
        select: {
          id: true,
          receivedAmount: true,
        },
      },
    },
  })

  if (!transaction) {
    return { error: "Transaction not found" }
  }

  if (!transaction.receivedFrom.startsWith(ADMIN_DISTRIBUTION_PREFIX)) {
    return { error: "Only admin distribution transactions can be edited" }
  }

  const amountDelta = amount - transaction.amount
  const nextReceivedAmount = Math.max(0, transaction.user.receivedAmount + amountDelta)
  const source = getDistributionSource(transaction.receivedFrom)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: transaction.userId },
      data: { receivedAmount: nextReceivedAmount },
    }),
    prisma.fund.update({
      where: { id: transactionId },
      data: {
        amount,
        fundDate: parsedFundDate,
        paymentMode,
        receivedFrom: buildDistributionReceivedFrom(source, description),
      },
    }),
  ])

  revalidateDistributionPaths()
  return { success: true }
}

export async function deleteDistributedFundTransaction(
  data: z.infer<typeof deleteDistributedFundTransactionSchema>
) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can delete distribution transactions" }
  }

  const result = deleteDistributedFundTransactionSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { transactionId } = result.data

  const transaction = await prisma.fund.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      amount: true,
      userId: true,
      receivedFrom: true,
      user: {
        select: {
          receivedAmount: true,
        },
      },
    },
  })

  if (!transaction) {
    return { error: "Transaction not found" }
  }

  if (!transaction.receivedFrom.startsWith(ADMIN_DISTRIBUTION_PREFIX)) {
    return { error: "Only admin distribution transactions can be deleted" }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: transaction.userId },
      data: {
        receivedAmount: Math.max(0, transaction.user.receivedAmount - transaction.amount),
      },
    }),
    prisma.fund.delete({
      where: { id: transactionId },
    }),
  ])

  revalidateDistributionPaths()
  return { success: true }
}

export async function getDistributedFundTransactions(fromDate?: string, toDate?: string) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return []
  }

  let dateFilter: { gte?: Date; lte?: Date } = {}
  if (fromDate && toDate) {
    const from = new Date(fromDate)
    from.setHours(0, 0, 0, 0)
    const to = new Date(toDate)
    to.setHours(23, 59, 59, 999)
    dateFilter = { gte: from, lte: to }
  }

  return await prisma.fund.findMany({
    where: {
      receivedFrom: {
        startsWith: ADMIN_DISTRIBUTION_PREFIX,
      },
      ...(Object.keys(dateFilter).length > 0 ? { fundDate: dateFilter } : {}),
    },
    select: {
      id: true,
      amount: true,
      receivedFrom: true,
      paymentMode: true,
      fundDate: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
  .then((transactions) =>
    transactions.map((transaction) => ({
      ...transaction,
      description: parseDistributionDescription(transaction.receivedFrom),
    }))
  )
}

export async function getAllMembers() {
  const session = await auth()
  
  if (!session?.user) {
    return []
  }

  if (session.user.role !== "ADMIN") {
    return []
  }

  return await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: {
      id: true,
      name: true,
      email: true,
      receivedAmount: true,
    },
    orderBy: { name: "asc" },
  })
}

const createMemberByNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

export async function createMemberByName(data: z.infer<typeof createMemberByNameSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized" }
  }

  const result = createMemberByNameSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const rawName = result.data.name.trim()
  const suffix = Date.now()
  const email = `${rawName.toLowerCase().replace(/\s+/g, ".")}.${suffix}@expense.com`
  const password = await hashPassword("member@123")

  const user = await prisma.user.create({
    data: {
      email,
      name: rawName,
      password,
      role: "MEMBER",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/fund-distribution")
  revalidatePath("/admin/dashboard")

  return { success: true as const, id: user.id, name: user.name!, email: user.email }
}

export async function getPendingDistributions() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return []
  }

  const funds = await prisma.fund.findMany({
    where: {
      createdById: session.user.id,
      status: "PENDING",
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return funds.map((fund) => ({
    id: fund.id,
    amount: fund.amount,
    receivedFrom: fund.receivedFrom,
    paymentMode: fund.paymentMode,
    fundDate: fund.fundDate,
    status: fund.status,
    memberName: fund.user.name || fund.user.email,
    memberId: fund.user.id,
  }))
}

export async function autoApproveOldFunds() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized" }
  }

  const startOfThisMonth = new Date()
  startOfThisMonth.setDate(1)
  startOfThisMonth.setHours(0, 0, 0, 0)

  const oldPendingFunds = await prisma.fund.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: startOfThisMonth },
    },
  })

  if (oldPendingFunds.length === 0) {
    return { success: true, approved: 0 }
  }

  for (const fund of oldPendingFunds) {
    await prisma.$transaction([
      prisma.fund.update({
        where: { id: fund.id },
        data: {
          status: "APPROVED",
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: fund.userId },
        data: { receivedAmount: { increment: fund.amount } },
      }),
    ])
  }

  revalidatePath("/dashboard/my-statement")
  revalidatePath("/dashboard/statement")
  revalidatePath("/admin/statement")
  revalidatePath("/admin/members")
  revalidatePath("/admin/fund-distribution")

  return { success: true, approved: oldPendingFunds.length }
}

export async function getPendingAdvanceSalary() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return []
  }

  const expenses = await prisma.expense.findMany({
    where: {
      category: { in: ["Advance", "Salary"] },
      status: "PENDING",
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return expenses.map((exp) => ({
    id: exp.id,
    title: exp.title,
    description: exp.description,
    amount: exp.amount,
    category: exp.category,
    status: exp.status,
    createdAt: exp.createdAt,
    memberName: exp.createdBy?.name || exp.createdBy?.email || "Unknown",
    memberId: exp.createdBy?.id || "",
  }))
}
