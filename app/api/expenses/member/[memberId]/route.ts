import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    memberId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { memberId } = await context.params

  if (!memberId) {
    return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
  }

  const expenses = await prisma.expense.findMany({
    where: {
      createdById: memberId,
      status: {
        in: ["APPROVED", "REJECTED", "PENDING"],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
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
