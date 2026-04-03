import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { LiveDataSync } from "@/components/live-data-sync"
import { MemberSidebar } from "@/components/member-sidebar"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Footer } from "@/components/footer"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session = null
  try {
    session = await auth()
  } catch (error) {
    console.error("Dashboard layout auth error:", error)
    redirect("/login")
  }

  if (!session?.user) {
    redirect("/login")
  }

  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation user={session.user} />
      <div className="flex flex-1 relative">
        {!isAdmin && <MemberSidebar />}
        {isAdmin && <AdminSidebar />}
        <main className="flex-1 min-w-0">
          <LiveDataSync />
          {children}
        </main>
      </div>
      <Footer />
    </div>
  )
}
