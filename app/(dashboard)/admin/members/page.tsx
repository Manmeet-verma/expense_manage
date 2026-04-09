import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getMembers } from "@/actions/auth"
import MembersContent from "./members-content"

type MemberRow = {
  id: string
  name: string | null
  email: string
  receivedAmount: number
  totalEdits: number
  createdAt: Date
  _count: {
    expenses: number
  }
}

export default async function AdminMembersPage() {
  let session = null
  try {
    session = await auth()
  } catch (error) {
    console.error("Auth error:", error)
    redirect("/login")
  }

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

  const isAdmin = session.user.role === "ADMIN"
  const isSupervisor = session.user.role === "SUPERVISOR"

  let members: MemberRow[] = []
  try {
    const result = await getMembers()
    members = (result || []) as MemberRow[]
  } catch (error) {
    console.error("getMembers error:", error)
    members = []
  }

  return <MembersContent members={members} canManage={isAdmin} canApproveExpenses={isSupervisor} />
}