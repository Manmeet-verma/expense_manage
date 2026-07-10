'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Clock, CheckCircle, Ban, RefreshCw } from "lucide-react"
import { approveFund, rejectFund } from "@/actions/expense"

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

export function AdminPendingCollections({ initialFunds }: { initialFunds: PendingFund[] }) {
  const router = useRouter()
  const [funds, setFunds] = useState<PendingFund[]>(initialFunds)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleApprove(fundId: string) {
    setLoading(fundId)
    const result = await approveFund(fundId)
    if (!result?.error) {
      setFunds((prev) => prev.filter((f) => f.id !== fundId))
    }
    setLoading(null)
    router.refresh()
  }

  async function handleReject(fundId: string) {
    const reason = window.prompt("Enter rejection reason:")
    if (!reason?.trim()) return

    setLoading(fundId)
    const result = await rejectFund(fundId, reason.trim())
    if (!result?.error) {
      setFunds((prev) => prev.filter((f) => f.id !== fundId))
    }
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Pending Collections</h2>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
            <Clock className="w-3 h-3" />
            {funds.length}
          </span>
        </div>
      </div>

      <div className="p-4">
        {funds.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            No pending collections from members.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold text-gray-600">Date</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Member</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Received From</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Mode</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-right">Amount</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-right">Actions</th>
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
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => void handleApprove(fund.id)}
                          disabled={loading === fund.id}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2"
                          onClick={() => void handleReject(fund.id)}
                          disabled={loading === fund.id}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}