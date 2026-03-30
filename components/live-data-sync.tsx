"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface LiveDataSyncProps {
  intervalMs?: number
}

export function LiveDataSync({ intervalMs = 3000 }: LiveDataSyncProps) {
  const router = useRouter()

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        router.refresh()
      }
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh()
      }
    }, intervalMs)

    document.addEventListener("visibilitychange", handleVisible)

    return () => {
      document.removeEventListener("visibilitychange", handleVisible)
      window.clearInterval(timer)
    }
  }, [intervalMs, router])

  return null
}
