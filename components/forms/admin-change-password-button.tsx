"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { KeyRound } from "lucide-react"
import { AdminChangePasswordForm } from "@/components/forms/admin-change-password-form"

export function AdminChangePasswordButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <KeyRound className="h-4 w-4 mr-2" />
        Change Password
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Change Password">
        <AdminChangePasswordForm />
      </Modal>
    </>
  )
}
