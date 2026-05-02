import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    memberId: string
  }>
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

  const where: any = {
    createdById: memberId,
    status: {
      in: ["APPROVED", "REJECTED", "PENDING"],
    },
  }

  if (fromDate && toDate) {
    const fromDateTime = new Date(fromDate)
    fromDateTime.setHours(0, 0, 0, 0)

    const toDateTime = new Date(toDate)
    toDateTime.setHours(23, 59, 59, 999)

    where.createdAt = {
      gte: fromDateTime,
      lte: toDateTime,
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
  })

  const approved = expenses.filter((expense) => expense.status === "APPROVED")
  const rejected = expenses.filter((expense) => expense.status === "REJECTED")
  const pending = expenses.filter((expense) => expense.status === "PENDING")

  return NextResponse.json({ approved, rejected, pending })
}
