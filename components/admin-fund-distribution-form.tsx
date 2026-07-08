'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { distributeFund, getAllMembers } from "@/actions/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { DollarSign } from "lucide-react"

type Member = Awaited<ReturnType<typeof getAllMembers>>[number]

export function FundDistributionForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [paymentMode, setPaymentMode] = useState<"CASH" | "GPAY" | "BANK_ACCOUNT">("CASH")

  useEffect(() => {
    setMembersLoading(true)
    getAllMembers().then((data) => {
      setMembers(data)
      setMembersLoading(false)
    })
  }, [])

  async function loadMembers() {
    setMembersLoading(true)
    const data = await getAllMembers()
    setMembers(data)
    setMembersLoading(false)
  }

  if (membersLoading) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">Loading members...</div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8">
        <Button onClick={loadMembers} variant="outline">
          Load Members
        </Button>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await distributeFund({
      memberId: selectedMember,
      amount: parseFloat(amount),
      description,
      paymentMode,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()
    setTimeout(() => {
      setSuccess(false)
      setSelectedMember("")
      setAmount("")
      setDescription("")
      setPaymentMode("CASH")
    }, 1500)
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-green-600 font-medium">Fund distributed successfully!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="member">Select Member *</Label>
        <select
          id="member"
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        >
          <option value="">Select a member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name || member.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="amount">Amount *</Label>
        <div className="relative mt-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
            <DollarSign className="h-4 w-4" />
          </span>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount to give"
            required
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note for this distribution"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="paymentMode">Payment Method *</Label>
        <select
          id="paymentMode"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value as "CASH" | "GPAY" | "BANK_ACCOUNT")}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        >
          <option value="CASH">Cash</option>
          <option value="GPAY">GPay</option>
          <option value="BANK_ACCOUNT">Bank Account</option>
        </select>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Distributing..." : "Distribute Fund"}
      </Button>
    </form>
  )
}
