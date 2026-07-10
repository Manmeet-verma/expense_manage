import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function parseDateRange(fromDate: string | null, toDate: string | null) {
  if (!fromDate || !toDate) return null

  const fromDateTime = new Date(fromDate)
  fromDateTime.setHours(0, 0, 0, 0)

  const toDateTime = new Date(toDate)
  toDateTime.setHours(23, 59, 59, 999)

  return { fromDateTime, toDateTime }
}

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const fromDate = searchParams.get("fromDate")
  const toDate = searchParams.get("toDate")
  const dateRange = parseDateRange(fromDate, toDate)

  const where: Record<string, unknown> = {
    createdBy: { role: "MEMBER" },
  }

  if (dateRange) {
    where.OR = [
      { status: "PENDING" },
      {
        createdAt: {
          gte: dateRange.fromDateTime,
          lte: dateRange.toDateTime,
        },
      },
    ]
  }

  const expenses = await prisma.expense.findMany({
    where: where as never,
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

  return NextResponse.json(expenses)
}
