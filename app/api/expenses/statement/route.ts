import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withTimeout } from "@/lib/db"
import { auth } from "@/lib/auth"

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
  const status = searchParams.get("status")
  const userId = searchParams.get("userId")

  if (!fromDate || !toDate || !status) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const dateRange = parseDateRange(fromDate, toDate)
    if (!dateRange) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    const expenses = await withTimeout(
      prisma.expense.findMany({
        where: {
          status: status as "APPROVED" | "REJECTED" | "PENDING" | "PAID",
          createdById: userId || session.user.id,
          ...(status === "PENDING"
            ? {}
            : {
                createdAt: {
                  gte: dateRange.fromDateTime,
                  lte: dateRange.toDateTime,
                },
              }),
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      20_000
    )

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Failed to fetch expenses:", error)
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
  }
}
