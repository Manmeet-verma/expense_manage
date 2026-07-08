import { auth } from "@/lib/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getAdmins } from "@/actions/auth"
import { getCategoryStatistics } from "@/actions/category"
import { AdminSection } from "@/components/forms/admin-section"
import { AdminCategoryUsageSection } from "@/components/admin-category-usage-section"
import { buttonVariants } from "@/components/ui/button"

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ fromDate?: string; toDate?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/admin")
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const fromDate = resolvedSearchParams.fromDate || getTodayString()
  const toDate = resolvedSearchParams.toDate || getTodayString()

  const admins = await getAdmins()
  const categories = await getCategoryStatistics(fromDate, toDate)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-gray-600">Create admin accounts and manage admin list</p>
      </div>

      <AdminSection admins={admins} currentAdminId={session.user.id} />

      <div className="mt-10">
        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-gray-900">Category Usage</h2>
          <Link href="/admin/add-category" className={buttonVariants()}>
            Create Category
          </Link>
        </div>

        <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <div>
            <label htmlFor="fromDate" className="block text-xs font-medium text-gray-600 mb-1">
              From
            </label>
            <input
              type="date"
              id="fromDate"
              name="fromDate"
              defaultValue={fromDate}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="toDate" className="block text-xs font-medium text-gray-600 mb-1">
              To
            </label>
            <input
              type="date"
              id="toDate"
              name="toDate"
              defaultValue={toDate}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        <AdminCategoryUsageSection
          categories={categories}
          fromDate={fromDate}
          toDate={toDate}
        />
      </div>
    </div>
  )
}
