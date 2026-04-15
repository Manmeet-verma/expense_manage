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
    collectionAmount?: number
    totalBudget?: number
    submittedAmount?: number
    remainingBudget?: number
  }
}

export function StatsCards({ stats, mode = "member" }: StatsCardsProps) {
  const totalExpenseAmount = stats.submittedAmount ?? 0
  const collectionAmount = stats.collectionAmount ?? stats.totalBudget ?? 0
  const remainingCollectionAmount = collectionAmount - totalExpenseAmount

  const memberCards = [
    {
      title: "Total Expense",
      value: formatCurrency(totalExpenseAmount),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      barColor: "bg-blue-500",
    },
    {
      title: "Collection",
      value: formatCurrency(collectionAmount),
      icon: DollarSign,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      barColor: "bg-indigo-500",
    },
    {
      title: "Remaining Collection",
      value: formatCurrency(remainingCollectionAmount),
      icon: DollarSign,
      color: remainingCollectionAmount < 0 ? "text-red-600" : "text-emerald-600",
      bgColor: remainingCollectionAmount < 0 ? "bg-red-50" : "bg-emerald-50",
      barColor: remainingCollectionAmount < 0 ? "bg-red-500" : "bg-emerald-500",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      barColor: "bg-green-500",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      barColor: "bg-yellow-500",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      barColor: "bg-red-500",
    },
    {
      title: "Paid",
      value: stats.paid ?? 0,
      icon: DollarSign,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      barColor: "bg-teal-500",
    },
  ]

  const adminCards = [
    {
      title: "Total Expense",
      value: formatCurrency(totalExpenseAmount),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      barColor: "bg-blue-500",
    },
    {
      title: "Approved Expense",
      value: formatCurrency(stats.totalApprovedAmount),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      barColor: "bg-green-500",
    },
    {
      title: "Mark Paid Expense",
      value: formatCurrency(stats.totalPaidAmount ?? 0),
      icon: DollarSign,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      barColor: "bg-teal-500",
    },
    {
      title: "Approved Count",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      barColor: "bg-green-500",
    },
    {
      title: "Paid Count",
      value: stats.paid ?? 0,
      icon: DollarSign,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      barColor: "bg-teal-500",
    },
    {
      title: "Rejected Count",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      barColor: "bg-red-500",
    },
    {
      title: "Pending Count",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      barColor: "bg-yellow-500",
    },
  ]

  const cards = mode === "admin" ? adminCards : memberCards
  const gridClass =
    mode === "admin"
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      : "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7"

  return (
    <div className={gridClass}>
      {cards.map((card) => (
        <Card
          key={card.title}
          className="border-gray-200/80 bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">{card.title}</p>
                <p className="mt-2 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                  {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">Live summary</p>
              </div>
              <div className={`rounded-xl p-2.5 ring-1 ring-inset ring-gray-200 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>

            <div className="mt-4">
              <div className={`h-1.5 w-full rounded-full ${card.barColor}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
