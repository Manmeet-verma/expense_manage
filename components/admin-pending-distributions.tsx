'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Clock, CheckCircle, RefreshCw, Ban } from "lucide-react"
import { getPendingDistributions } from "@/actions/expense"

interface PendingFund {
  id: string
  amount: number
  receivedFrom: string
  paymentMode: string
  fundDate: Date
  status: string
  memberName: string
  memberId: string
}

export function AdminPendingDistributions({ initialFunds }: { initialFunds: PendingFund[] }) {
  const router = useRouter()
  const [funds, setFunds] = useState<PendingFund[]>(initialFunds)
  const [loading, setLoading] = useState(false)

  async function handleRefresh() {
    setLoading(true)
    const updated = await getPendingDistributions()
    setFunds(updated)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Pending Distributions</h2>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
            <Clock className="w-3 h-3" />
            {funds.length}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleRefresh()}
          disabled={loading}
          className="h-8 text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="p-4">
        {funds.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            No pending distributions. All funds have been approved by members.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold text-gray-600">Date</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Member</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Description</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Mode</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-right">Amount</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {funds.map((fund) => (
                  <tr key={fund.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">{formatDate(fund.fundDate)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{fund.memberName}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-48">{fund.receivedFrom}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        {fund.paymentMode}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-900 text-right">{formatCurrency(fund.amount)}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                        <Clock className="w-3 h-3" />
                        Awaiting Approval
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-right text-gray-700">Total Pending:</td>
                  <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(funds.reduce((sum, f) => sum + f.amount, 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}