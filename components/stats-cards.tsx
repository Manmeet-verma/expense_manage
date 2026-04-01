"use client"

import { formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Clock, CheckCircle, XCircle, DollarSign } from "lucide-react"

interface StatsCardsProps {
  mode?: "member" | "admin"
  stats: {
    total: number
    pending: number
    approved: number
    rejected: number
    paid?: number
    totalApprovedAmount: number
    totalPaidAmount?: number
    totalBudget?: number
    submittedAmount?: number
    remainingBudget?: number
  }
}

export function StatsCards({ stats, mode = "member" }: StatsCardsProps) {
  const totalExpenseAmount = stats.submittedAmount ?? 0

  const memberCards = [
    {
      title: "Total Expense",
      value: formatCurrency(totalExpenseAmount),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Budget",
      value: formatCurrency(stats.totalBudget ?? 0),
      icon: DollarSign,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Paid",
      value: stats.paid ?? 0,
      icon: CheckCircle,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ]

  const adminCards = [
    {
      title: "Total Expense",
      value: formatCurrency(totalExpenseAmount),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Approved Expense",
      value: formatCurrency(stats.totalApprovedAmount),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Mark Paid Expense",
      value: formatCurrency(stats.totalPaidAmount ?? 0),
      icon: DollarSign,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      title: "Approved Count",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Paid Count",
      value: stats.paid ?? 0,
      icon: DollarSign,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      title: "Rejected Count",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Pending Count",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ]

  const cards = mode === "admin" ? adminCards : memberCards
  const gridClass = mode === "admin" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4"

  return (
    <div className={gridClass}>
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
