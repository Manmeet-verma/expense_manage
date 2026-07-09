'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth, hashPassword } from "@/lib/auth"
import { revalidatePath } from "next/cache"

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

  await prisma.expense.create({
    data: {
      title: title || category,
      description,
      amount,
      category,
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
    },
  })

  if (expenses.length !== ids.length) {
    return { error: "One or more selected expenses are no longer pending" }
  }

  await prisma.$transaction(
    ids.map((id) =>
      prisma.expense.update({
        where: { id },
        data: { status: "APPROVED" },
      })
    )
  )

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

    await tx.user.update({
      where: { id: mentionedMemberId },
      data: { receivedAmount: { increment: expense.amount } },
    })

    await tx.fund.create({
      data: {
        amount: expense.amount,
        receivedFrom,
        paymentMode: "CASH",
        fundDate: new Date(),
        userId: mentionedMemberId,
      },
    })
  })

  if (mentionedMemberId) {
    revalidatePath(`/dashboard/my-statement`)
    revalidatePath(`/dashboard/statement`)
  }

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
    prisma.expense.count({ where }),
    prisma.expense.count({ where: { ...where, status: "PENDING" } }),
    prisma.expense.count({ where: { ...where, status: "APPROVED" } }),
    prisma.expense.count({ where: { ...where, status: "REJECTED" } }),
    prisma.expense.count({ where: { ...where, status: "PAID" } }),
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
    const fundAgg = await prisma.fund.aggregate({
      where: { userId: session.user.id },
      _sum: { amount: true },
    })
    totalCollectionAmount = fundAgg._sum.amount || 0

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
        createdBy: { role: "MEMBER" },
      },
      select: { id: true, amount: true, description: true },
    })

    function escapeRegExp(value: string) {
      return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    }

    for (const exp of otherExpenses) {
      const sourceText = exp.description?.trim() || ""
      if (!sourceText) continue
      for (const link of memberLinks) {
        const matcher = new RegExp(`\\b${escapeRegExp(link.label)}\\b`, "i")
        if (link.id === session.user.id && matcher.test(sourceText)) {
          totalCollectionAmount += exp.amount
          break
        }
      }
    }
  }

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
    totalPendingAmount: totalPendingAmount._sum.amount || 0,
    totalRejectedAmount: totalRejectedAmount._sum.amount || 0,
    collectionAmount: totalCollectionAmount,
    totalBudget,
    submittedAmount: submittedTotal,
    remainingBudget,
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
      upiId: paymentMode === "GPAY" ? upiId || null : null,
      accountNumber: paymentMode === "BANK_ACCOUNT" ? accountNumber || null : null,
      fundDate: fundDate ? new Date(fundDate) : new Date(),
      userId: session.user.id,
    },
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

  await prisma.$transaction([
    prisma.user.update({
      where: { id: memberId },
      data: {
        receivedAmount: {
          increment: amount,
        },
      },
    }),
    prisma.fund.create({
      data: {
        amount,
        receivedFrom,
        paymentMode,
        fundDate: new Date(),
        userId: memberId,
      },
    }),
  ])

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
