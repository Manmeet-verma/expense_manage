'use server'

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const deleteMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
})

export async function deleteMember(data: z.infer<typeof deleteMemberSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can delete member accounts" }
  }

  const result = deleteMemberSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { memberId } = result.data

  if (memberId === session.user.id) {
    return { error: "You cannot delete your own account" }
  }

  const user = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, _count: { select: { expenses: true } } },
  })

  if (!user) {
    return { error: "Member not found" }
  }

  if (user.role !== "MEMBER") {
    return { error: "Only member accounts can be deleted" }
  }

  if (user._count.expenses > 0) {
    return { error: "This member has expense data. Use password reset instead of deleting the account." }
  }

  await prisma.user.delete({
    where: { id: memberId },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/members")

  return { success: true }
}