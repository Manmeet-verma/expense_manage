import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { buildMemberLinks, buildStatementCollectionRows } from "@/lib/statement"

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
    const members = await prisma.user.findMany({
      where: { role: "MEMBER" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const memberLinks = buildMemberLinks(members)

    const fundsWhere = {
      userId: targetUserId,
      ...(fromDate && toDate
        ? {
            fundDate: {
              gte: (() => {
                const fromDateTime = new Date(fromDate)
                fromDateTime.setHours(0, 0, 0, 0)
                return fromDateTime
              })(),
              lte: (() => {
                const toDateTime = new Date(toDate)
                toDateTime.setHours(23, 59, 59, 999)
                return toDateTime
              })(),
            },
          }
        : {}),
    }

    const expensesWhere = {
      createdById: { not: targetUserId },
      description: { not: null },
      ...(fromDate && toDate
        ? {
            createdAt: {
              gte: (() => {
                const fromDateTime = new Date(fromDate)
                fromDateTime.setHours(0, 0, 0, 0)
                return fromDateTime
              })(),
              lte: (() => {
                const toDateTime = new Date(toDate)
                toDateTime.setHours(23, 59, 59, 999)
                return toDateTime
              })(),
            },
          }
        : {}),
    }

    const [funds, collectionExpenses] = await Promise.all([
      prisma.fund.findMany({
        where: fundsWhere,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          amount: true,
          receivedFrom: true,
          paymentMode: true,
          fundDate: true,
        },
      }),
      prisma.expense.findMany({
        where: expensesWhere,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          amount: true,
          description: true,
          title: true,
          createdAt: true,
          createdById: true,
        },
      }),
    ])

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
