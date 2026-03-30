import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { deleteMember, getMembers } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function AdminMembersPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const members = await getMembers()

  async function deleteMemberAction(formData: FormData) {
    "use server"

    const memberId = formData.get("memberId")?.toString()
    if (!memberId) return

    const result = await deleteMember({ memberId })
    if (result?.error) {
      throw new Error(result.error)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Member List</h1>
        <p className="mt-1 text-gray-600">Admin access only: manage member accounts</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Budget</th>
                <th className="px-4 py-3 font-semibold">Expenses</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No members found
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{member.name || "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{member.email}</td>
                    <td className="px-4 py-3 text-gray-900">{formatCurrency(member.totalBudget)}</td>
                    <td className="px-4 py-3 text-gray-700">{member._count.expenses}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(member.createdAt)}</td>
                    <td className="px-4 py-3">
                      <form action={deleteMemberAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <Button type="submit" size="sm" variant="destructive">
                          Delete
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {members.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No members found</div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="p-4 space-y-3">
                <div>
                  <p className="font-semibold text-gray-900">{member.name || "-"}</p>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-medium text-gray-900">{formatCurrency(member.totalBudget)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Expenses</p>
                    <p className="font-medium text-gray-900">{member._count.expenses}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Joined</p>
                    <p className="font-medium text-gray-900">{formatDate(member.createdAt)}</p>
                  </div>
                </div>
                <form action={deleteMemberAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button type="submit" size="sm" variant="destructive" className="w-full">
                    Delete Member
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
