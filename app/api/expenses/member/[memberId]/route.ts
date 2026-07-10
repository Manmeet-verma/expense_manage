import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type ExpenseStatus = "APPROVED" | "REJECTED" | "PENDING"

type MemberExpenseRecord = {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
  status: ExpenseStatus
  createdAt: Date
  adminRemark: string | null
}

type RouteContext = {
  params: Promise<{
    memberId: string
  }>
}

// Helper function to parse dates consistently
function parseDateRange(fromDate: string | null, toDate: string | null) {
  if (!fromDate || !toDate) return null

  const fromDateTime = new Date(fromDate)
  fromDateTime.setHours(0, 0, 0, 0)

  const toDateTime = new Date(toDate)
  toDateTime.setHours(23, 59, 59, 999)

  return { fromDateTime, toDateTime }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth()

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { memberId } = await context.params

  if (!memberId) {
    return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
  }

  const searchParams = request.nextUrl.searchParams
  const fromDate = searchParams.get("fromDate")
  const toDate = searchParams.get("toDate")

  const dateRange = parseDateRange(fromDate, toDate)

  const where: {
    createdById: string
    status?: {
      in: ExpenseStatus[]
    }
    OR?: Array<Record<string, unknown>>
    createdAt?: {
      gte: Date
      lte: Date
    }
  } = {
    createdById: memberId,
  }

  if (dateRange) {
    where.OR = [
      { status: "PENDING" },
      {
        status: {
          in: ["APPROVED", "REJECTED"],
        },
        createdAt: {
          gte: dateRange.fromDateTime,
          lte: dateRange.toDateTime,
        },
      },
    ]
  } else {
    where.status = {
      in: ["APPROVED", "REJECTED", "PENDING"],
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      amount: true,
      category: true,
      status: true,
      createdAt: true,
      adminRemark: true,
    },
    take: 5000, // Limit results to prevent memory issues
  })

  const approved = expenses.filter((expense): expense is MemberExpenseRecord => expense.status === "APPROVED")
  const rejected = expenses.filter((expense): expense is MemberExpenseRecord => expense.status === "REJECTED")
  const pending = expenses.filter((expense): expense is MemberExpenseRecord => expense.status === "PENDING")

  return NextResponse.json({ approved, rejected, pending })
}
