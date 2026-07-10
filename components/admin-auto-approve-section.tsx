'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Zap } from "lucide-react"
import { autoApproveOldFunds } from "@/actions/expense"

export function AdminAutoApproveSection() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ approved?: number; error?: string } | null>(null)

  async function handleAutoApprove() {
    setLoading(true)
    const res = await autoApproveOldFunds()
    setResult(res)
    setLoading(false)
    router.refresh()
  }

  if (result && result.approved !== undefined && result.approved === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        <p className="text-sm text-green-700">All old collections are already approved. No pending funds before this month.</p>
      </div>
    )
  }

  if (result && result.approved !== undefined && result.approved > 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        <p className="text-sm text-green-700">Successfully auto-approved {result.approved} collection(s) from before this month.</p>
      </div>
    )
  }

  if (result?.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{result.error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Zap className="w-5 h-5 text-orange-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-orange-800">Auto-Approve Old Collections</p>
          <p className="text-xs text-orange-600">Approve all pending collections from before this month</p>
        </div>
      </div>
      <Button
        size="sm"
        className="bg-orange-600 hover:bg-orange-700 text-white"
        onClick={() => void handleAutoApprove()}
        disabled={loading}
      >
        {loading ? "Approving..." : "Approve All"}
      </Button>
    </div>
  )
}