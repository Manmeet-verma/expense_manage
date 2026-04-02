import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getMembers } from "@/actions/auth"
import MembersContent from "./members-content"

type MemberRow = {
  id: string
  name: string | null
  email: string
  totalBudget: number
  totalEdits: number
  createdAt: Date
  _count: {
    expenses: number
  }
}

export default async function AdminMembersPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const members = await getMembers()

  return <MembersContent members={members as MemberRow[]} />
}
