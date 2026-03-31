"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { subscribeToExpenseChanges } from "@/lib/supabase/realtime"

interface LiveDataSyncProps {
  intervalMs?: number
}

const hasRealtimeConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL
    && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
)

export function LiveDataSync({ intervalMs = 30000 }: LiveDataSyncProps) {
  const router = useRouter()

  useEffect(() => {
    let lastRefresh = 0
    const refreshWithCooldown = () => {
      const now = Date.now()
      if (now - lastRefresh < 1200) return
      lastRefresh = now
      router.refresh()
    }

    const unsubscribe = subscribeToExpenseChanges(() => {
      refreshWithCooldown()
    })

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        refreshWithCooldown()
      }
    }

    // Poll only when realtime credentials are unavailable.
    const timer = hasRealtimeConfig
      ? null
      : window.setInterval(() => {
          if (document.visibilityState === "visible") {
            refreshWithCooldown()
          }
        }, intervalMs)

    document.addEventListener("visibilitychange", handleVisible)

    return () => {
      unsubscribe()
      document.removeEventListener("visibilitychange", handleVisible)
      if (timer) {
        window.clearInterval(timer)
      }
    }
  }, [intervalMs, router])

  return null
}
