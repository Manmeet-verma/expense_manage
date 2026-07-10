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
  const statusFilter = searchParams.get("status")
  const targetUserId = userId || session.user.id

  try {
    const dateRange = parseDateRange(fromDate, toDate)

    const fundsWhere: Record<string, unknown> = {
      userId: targetUserId,
    }

    if (statusFilter) {
      fundsWhere.status = statusFilter
    }

    if (dateRange) {
      fundsWhere.fundDate = {
        gte: dateRange.fromDateTime,
        lte: dateRange.toDateTime,
      }
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
            status: true,
            rejectReason: true,
            approvedAt: true,
            createdAt: true,
            userId: true,
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
            category: true,
          },
          take: 5000,
        }),
        20_000
      ),
    ])

    const memberLinks = buildMemberLinks(members)

    function extractMentionedBy(receivedFrom: string): string | null {
      if (receivedFrom.startsWith("Admin Distribution:")) {
        return "Admin"
      }
      const expenseMatch = receivedFrom.match(/^(.+?)\s*\|\s*from expense/)
      if (expenseMatch) {
        return expenseMatch[1].trim()
      }
      return receivedFrom || null
    }

    const fundsWithMentionedBy = funds.map((f) => ({
      ...f,
      mentionedBy: extractMentionedBy(f.receivedFrom),
    }))

    const approvedFunds = fundsWithMentionedBy.filter((f) => f.status === "APPROVED")

    const collectionRows = buildStatementCollectionRows({
      memberId: targetUserId,
      memberLinks,
      funds: approvedFunds,
      expenses: collectionExpenses,
    })

    return NextResponse.json({ funds: fundsWithMentionedBy, collectionRows })
  } catch (error) {
    console.error("Failed to fetch funds:", error)
    return NextResponse.json({ error: "Failed to fetch funds" }, { status: 500 })
  }
}
