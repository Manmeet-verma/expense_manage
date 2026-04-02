import { NextResponse } from "next/server"
import { getApprovedExpenses } from "@/actions/expense"

export async function GET() {
  const expenses = await getApprovedExpenses()
  return NextResponse.json(expenses)
}
