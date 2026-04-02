'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"
import { deleteMember } from "@/actions/delete-member"

interface MemberRow {
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

interface MembersContentProps {
  members: MemberRow[]
}

export default function MembersContent({ members: initialMembers }: MembersContentProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberRow[]>(initialMembers)

  async function handleDelete(memberId: string) {
    try {
      if (deletingId) return
      
      const confirmed = window.confirm("Are you sure you want to delete this member?")
      if (!confirmed) return
      
      setDeletingId(memberId)
      
      const result = await deleteMember({ memberId })
      
      if (result && 'error' in result) {
        alert(result.error)
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        router.refresh()
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Error deleting member")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6">
      <div>
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
                  <th className="px-4 py-3 font-semibold">Edits</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
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
                      <td className="px-4 py-3 text-gray-700">{member.totalEdits}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(member.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(member.id)}
                          disabled={deletingId === member.id}
                          className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                        >
                          {deletingId === member.id ? "Deleting..." : "Delete"}
                        </button>
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
                      <p className="text-gray-500">Edits</p>
                      <p className="font-medium text-gray-900">{member.totalEdits}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Joined</p>
                      <p className="font-medium text-gray-900">{formatDate(member.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(member.id)}
                    disabled={deletingId === member.id}
                    className="w-full mt-2 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === member.id ? "Deleting..." : "Delete Member"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
