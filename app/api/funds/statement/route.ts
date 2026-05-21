import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withTimeout } from "@/lib/db"
import { auth } from "@/lib/auth"
import { buildMemberLinks, buildStatementCollectionRows } from "@/lib/statement"

// Helper function to parse dates consistently
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

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const fromDate = searchParams.get("fromDate")
  const toDate = searchParams.get("toDate")
  const userId = searchParams.get("userId")
  const targetUserId = userId || session.user.id

  try {
    const dateRange = parseDateRange(fromDate, toDate)

    // Build where clauses with parsed dates
    const fundsWhere = {
      userId: targetUserId,
      ...(dateRange
        ? {
            fundDate: {
              gte: dateRange.fromDateTime,
              lte: dateRange.toDateTime,
            },
          }
        : {}),
    }

    const expensesWhere = {
      createdById: { not: targetUserId },
      description: { not: null },
      ...(dateRange
        ? {
            createdAt: {
              gte: dateRange.fromDateTime,
              lte: dateRange.toDateTime,
            },
          }
        : {}),
    }

    // Run database queries with a timeout to avoid Vercel runtime 300s hangs
    const [members, funds, collectionExpenses] = await Promise.all([
      withTimeout(
        prisma.user.findMany({
          where: { role: "MEMBER" },
          select: {
            id: true,
            name: true,
            email: true,
          },
          take: 1000,
        }),
        15_000
      ),
      withTimeout(
        prisma.fund.findMany({
          where: fundsWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            receivedFrom: true,
            paymentMode: true,
            fundDate: true,
          },
          take: 5000,
        }),
        20_000
      ),
      withTimeout(
        prisma.expense.findMany({
          where: expensesWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            description: true,
            title: true,
            createdAt: true,
            createdById: true,
          },
          take: 5000,
        }),
        20_000
      ),
    ])

    const memberLinks = buildMemberLinks(members)

    const collectionRows = buildStatementCollectionRows({
      memberId: targetUserId,
      memberLinks,
      funds,
      expenses: collectionExpenses,
    })

    return NextResponse.json(collectionRows)
  } catch (error) {
    console.error("Failed to fetch funds:", error)
    return NextResponse.json({ error: "Failed to fetch funds" }, { status: 500 })
  }
}
