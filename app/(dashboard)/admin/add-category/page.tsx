import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CreateCategorySection } from "@/components/forms/create-category-section"
import { getCategoryStatistics } from "@/actions/category"
import { formatCurrency } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function AddCategoryPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/dashboard")
  }

  const categories = await getCategoryStatistics()
  const canCreate = session.user.role === "ADMIN"

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Category Dashboard</h1>
        <p className="mt-1 text-gray-600">Create and manage expense categories for your organization</p>
      </div>

      <div className="space-y-6">
        <CreateCategorySection canCreate={canCreate} />

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Category Usage</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">No categories added yet.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Members Used</th>
                    <th className="px-4 py-3 font-semibold">Expense Count</th>
                    <th className="px-4 py-3 font-semibold">Total Expense</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                      <td className="px-4 py-3 text-gray-700">{category.description || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{category.memberCount}</td>
                      <td className="px-4 py-3 text-gray-700">{category.expenseCount}</td>
                      <td className="px-4 py-3 text-gray-900">{formatCurrency(category.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
