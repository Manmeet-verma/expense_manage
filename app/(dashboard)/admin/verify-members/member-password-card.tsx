'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { verifyMemberPassword } from '@/actions/auth'

type MemberRow = {
  id: string
  name: string | null
  email: string
  createdAt: Date
  _count: {
    expenses: number
  }
}

type PasswordStatus = {
  hasPassword?: boolean
  error?: string
  message?: string
}

export function MemberPasswordCard({ member }: { member: MemberRow }) {
  const [status, setStatus] = React.useState<PasswordStatus | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleCheck = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await verifyMemberPassword({ memberId: member.id })
      setStatus(result)
    } catch {
      setStatus({ error: 'Failed to check password' })
    } finally { 
      setLoading(false)
    }
  }, [member.id])

  React.useEffect(() => {
    // Auto-check on mount
    void handleCheck()
  }, [handleCheck])

  const hasPassword = status?.hasPassword
  const isError = status?.error

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{member.name || member.email}</p>
            <p className="text-sm text-gray-600">{member.email}</p>
          </div>

          <div className="flex items-center gap-3">
            {!isError && status && (
              <div className="flex items-center gap-2">
                {hasPassword ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Password Set</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">No Password</span>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleCheck}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {isError && (
          <div className="mt-4 text-sm text-red-600">
            {isError}
          </div>
        )}

        {status?.message && (
          <div className="mt-3 text-sm text-gray-600">
            {status.message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}