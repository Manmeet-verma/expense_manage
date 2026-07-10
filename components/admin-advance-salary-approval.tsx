'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Clock, CheckCircle, XCircle, RefreshCw, Wallet } from "lucide-react"
import { approveOrRejectExpense } from "@/actions/expense"

interface AdvanceSalaryRequest {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
  status: string
  createdAt: Date
  memberName: string
  memberId: string
}

export function AdminAdvanceSalaryApproval({ initialRequests }: { initialRequests: AdvanceSalaryRequest[] }) {
  const router = useRouter()
  const [requests, setRequests] = useState<AdvanceSalaryRequest[]>(initialRequests)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleApprove(id: string) {
    setLoading(id)
    const result = await approveOrRejectExpense({
      id,
      status: "APPROVED",
    })
    if (!result?.error) {
      setRequests((prev) => prev.filter((r) => r.id !== id))
    }
    setLoading(null)
    router.refresh()
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Enter rejection reason:")
    if (!reason?.trim()) return

    setLoading(id)
    const result = await approveOrRejectExpense({
      id,
      status: "REJECTED",
      adminRemark: reason.trim(),
    })
    if (!result?.error) {
      setRequests((prev) => prev.filter((r) => r.id !== id))
    }
    setLoading(null)
    router.refresh()
  }

  const advanceRequests = requests.filter((r) => r.category === "Advance")
  const salaryRequests = requests.filter((r) => r.category === "Salary")

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Advance / Salary Requests</h2>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
            <Clock className="w-3 h-3" />
            {requests.length}
          </span>
        </div>
      </div>

      <div className="p-4">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            No pending Advance/Salary requests.
          </div>
        ) : (
          <div className="space-y-4">
            {advanceRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1">
                  <Wallet className="w-4 h-4" />
                  Advance Requests ({advanceRequests.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-orange-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-gray-600">Date</th>
                        <th className="px-3 py-2 font-semibold text-gray-600">Member</th>
                        <th className="px-3 py-2 font-semibold text-gray-600">Title</th>
                        <th className="px-3 py-2 font-semibold text-gray-600 text-right">Amount</th>
                        <th className="px-3 py-2 font-semibold text-gray-600 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {advanceRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{formatDate(req.createdAt)}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{req.memberName}</td>
                          <td className="px-3 py-2 text-gray-700 truncate max-w-48">{req.title}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900 text-right">{formatCurrency(req.amount)}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => void handleApprove(req.id)}
                                disabled={loading === req.id}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2"
                                onClick={() => void handleReject(req.id)}
                                disabled={loading === req.id}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {salaryRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-1">
                  <Wallet className="w-4 h-4" />
                  Salary Requests ({salaryRequests.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-purple-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-gray-600">Date</th>
                        <th className="px-3 py-2 font-semibold text-gray-600">Member</th>
                        <th className="px-3 py-2 font-semibold text-gray-600">Title</th>
                        <th className="px-3 py-2 font-semibold text-gray-600 text-right">Amount</th>
                        <th className="px-3 py-2 font-semibold text-gray-600 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salaryRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{formatDate(req.createdAt)}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{req.memberName}</td>
                          <td className="px-3 py-2 text-gray-700 truncate max-w-48">{req.title}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900 text-right">{formatCurrency(req.amount)}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => void handleApprove(req.id)}
                                disabled={loading === req.id}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2"
                                onClick={() => void handleReject(req.id)}
                                disabled={loading === req.id}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}