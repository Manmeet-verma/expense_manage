'use client'

import { useEffect, useState } from "react"
import { getExpenseStats } from "@/actions/expense"
import { TrendingUp, Clock, CheckCircle, XCircle, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState<{
    total: number
    submittedAmount: number
    totalBudget: number
    pending: number
    approved: number
    rejected: number
    paid: number
    totalApprovedAmount: number
    totalPaidAmount: number
  } | null>(null)

  useEffect(() => {
    getExpenseStats().then(setStats)
  }, [])

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    window.addEventListener("toggle-mobile-sidebar", handleToggle as EventListener)
    return () => window.removeEventListener("toggle-mobile-sidebar", handleToggle as EventListener)
  }, [])

  if (!stats) {
    return (
      <>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <div className="fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 w-48 md:w-56 shadow-lg md:shadow-none animate-slide-in">
              <div className="sticky top-16">
                <div className="flex flex-col gap-2 p-3">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded p-2 animate-pulse">
                      <div className="h-3 w-16 bg-gray-200 rounded mb-1"></div>
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  const cards = [
    { title: "Total Expense", value: formatCurrency(stats.submittedAmount), icon: TrendingUp, color: "text-blue-600" },
    { title: "Approved Expense", value: formatCurrency(stats.totalApprovedAmount), icon: CheckCircle, color: "text-green-600" },
    { title: "Mark Paid Expense", value: formatCurrency(stats.totalPaidAmount ?? 0), icon: DollarSign, color: "text-teal-600" },
    { title: "Approved Count", value: stats.approved, icon: CheckCircle, color: "text-green-600" },
    { title: "Paid Count", value: stats.paid, icon: DollarSign, color: "text-teal-600" },
    { title: "Rejected Count", value: stats.rejected, icon: XCircle, color: "text-red-600" },
    { title: "Pending Count", value: stats.pending, icon: Clock, color: "text-yellow-600" },
  ]

  return (
    <>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 w-48 md:w-56 shadow-lg md:shadow-none animate-slide-in">
            <div className="sticky top-16">
              <div className="flex flex-col gap-2 p-3">
                {cards.map((card) => (
                  <div key={card.title} className="bg-gray-50 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <card.icon className={`h-3 w-3 ${card.color}`} />
                      <span className="text-xs text-gray-500">{card.title}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}