import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getMembers } from "@/actions/auth"
import { ResetMemberPasswordForm } from "@/components/forms/reset-member-password-form"

export default async function AdminResetPasswordPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const members = await getMembers()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reset Member Password</h1>
        <p className="mt-1 text-gray-600">Admin access only</p>
      </div>
      <ResetMemberPasswordForm members={members} />
    </div>
  )
}
