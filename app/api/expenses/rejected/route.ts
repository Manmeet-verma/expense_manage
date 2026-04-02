import { NextResponse } from "next/server"
import { getRejectedExpenses } from "@/actions/expense"

export async function GET() {
  const expenses = await getRejectedExpenses()
  return NextResponse.json(expenses)
}
