import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { LiveDataSync } from "@/components/live-data-sync"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <>
      <Navigation user={session.user} />
      <main className="flex-1">
        <LiveDataSync />
        {children}
      </main>
    </>
  )
}
