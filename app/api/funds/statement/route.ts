import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const fromDate = searchParams.get("fromDate")
  const toDate = searchParams.get("toDate")
  const userId = searchParams.get("userId")

  try {
    let funds

    if (fromDate && toDate) {
      const fromDateTime = new Date(fromDate)
      fromDateTime.setHours(0, 0, 0, 0)

      const toDateTime = new Date(toDate)
      toDateTime.setHours(23, 59, 59, 999)

      funds = await prisma.fund.findMany({
        where: {
          fundDate: {
            gte: fromDateTime,
            lte: toDateTime,
          },
          userId: userId || session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    } else {
      funds = await prisma.fund.findMany({
        where: {
          userId: userId || session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }

    return NextResponse.json(funds)
  } catch (error) {
    console.error("Failed to fetch funds:", error)
    return NextResponse.json({ error: "Failed to fetch funds" }, { status: 500 })
  }
}
