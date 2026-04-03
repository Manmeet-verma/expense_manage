"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { createFund } from "@/actions/expense"
import { formatDate } from "@/lib/utils"

export function MyFundForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    amount: "",
    receivedFrom: "",
    paymentMode: "CASH" as "CASH" | "GPAY" | "BANK_ACCOUNT",
    upiId: "",
    accountNumber: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const fundDate = new Date().toISOString().split("T")[0]

    const result = await createFund({
      amount: parseFloat(formData.amount),
      receivedFrom: formData.receivedFrom,
      paymentMode: formData.paymentMode,
      upiId: formData.paymentMode === "GPAY" ? formData.upiId : undefined,
      accountNumber: formData.paymentMode === "BANK_ACCOUNT" ? formData.accountNumber : undefined,
      fundDate,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.refresh()
      setFormData({
        amount: "",
        receivedFrom: "",
        paymentMode: "CASH",
        upiId: "",
        accountNumber: "",
      })
      setSuccess(false)
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
        <p className="text-green-600 font-medium">Fund deposited successfully!</p>
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
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="Enter amount"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label>Date *</Label>
        <div className="mt-1 px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-900">
          {formatDate(new Date())}
        </div>
      </div>

      <div>
        <Label htmlFor="receivedFrom">Received From *</Label>
        <Input
          id="receivedFrom"
          value={formData.receivedFrom}
          onChange={(e) => setFormData({ ...formData, receivedFrom: e.target.value })}
          placeholder="Enter sender name"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="paymentMode">Payment Mode *</Label>
        <Select
          id="paymentMode"
          value={formData.paymentMode}
          onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as "CASH" | "GPAY" | "BANK_ACCOUNT" })}
          className="mt-1"
        >
          <option value="CASH">Cash</option>
          <option value="GPAY">GPay</option>
          <option value="BANK_ACCOUNT">Bank Account</option>
        </Select>
      </div>

      {formData.paymentMode === "GPAY" && (
        <div>
          <Label htmlFor="upiId">UPI ID *</Label>
          <Input
            id="upiId"
            value={formData.upiId}
            onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
            placeholder="Enter UPI ID (e.g., mobile@upi)"
            required
            className="mt-1"
          />
        </div>
      )}

      {formData.paymentMode === "BANK_ACCOUNT" && (
        <div>
          <Label htmlFor="accountNumber">Account Number *</Label>
          <Input
            id="accountNumber"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            placeholder="Enter account number"
            required
            className="mt-1"
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  )
}
