'use server'

import { z } from "zod"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hashPassword } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const checkAdminEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function checkIsAdminEmail(email: string) {
  const result = checkAdminEmailSchema.safeParse({ email })

  if (!result.success) {
    return { isAdmin: false }
  }

  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { role: true },
  })

  return { isAdmin: user?.role === "ADMIN" }
}

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

const adminResetMemberPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

const deleteMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
})

const deleteAdminSchema = z.object({
  adminId: z.string().min(1, "Admin ID is required"),
})

const adminForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

export async function signup(data: z.infer<typeof signupSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can create member accounts" }
  }

  const result = signupSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, name, password } = result.data
  const normalizedEmail = email.trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existingUser) {
    return { error: "Email already registered" }
  }

  const hashedPassword = await hashPassword(password)

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      password: hashedPassword,
      role: "MEMBER",
    },
  })

  revalidatePath("/login")
  revalidatePath("/admin")
  return { success: true }
}

export async function createAdmin(data: z.infer<typeof createAdminSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can create admin accounts" }
  }

  const result = createAdminSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, name, password } = result.data
  const normalizedEmail = email.trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existingUser) {
    return { error: "Email already registered" }
  }

  const hashedPassword = await hashPassword(password)

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      password: hashedPassword,
      role: "ADMIN",
    },
  })

  revalidatePath("/login")
  revalidatePath("/admin")
  return { success: true }
}

export async function changeMyPassword(data: z.infer<typeof changePasswordSchema>) {
  const session = await auth()

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const result = changePasswordSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { currentPassword, newPassword } = result.data

  if (currentPassword === newPassword) {
    return { error: "New password must be different from current password" }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })

  if (!user) {
    return { error: "User not found" }
  }

  const isCurrentPasswordValid = await compare(currentPassword, user.password)

  if (!isCurrentPasswordValid) {
    return { error: "Current password is incorrect" }
  }

  const hashedPassword = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  })

  revalidatePath("/dashboard")
  revalidatePath("/admin")

  return { success: true }
}

export async function adminResetMemberPassword(data: z.infer<typeof adminResetMemberPasswordSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can reset member passwords" }
  }

  const result = adminResetMemberPasswordSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, newPassword } = result.data
  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, role: true },
  })

  if (!user) {
    return { error: "Member account not found" }
  }

  if (user.role !== "MEMBER") {
    return { error: "Admin can reset only member passwords" }
  }

  const hashedPassword = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  revalidatePath("/admin")

  return { success: true }
}

export async function getMembers() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return []
  }

  return prisma.user.findMany({
    where: { role: "MEMBER" },
    select: {
      id: true,
      name: true,
      email: true,
      totalBudget: true,
      createdAt: true,
      _count: {
        select: {
          expenses: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAdmins() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return []
  }

  return prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function deleteAdmin(data: z.infer<typeof deleteAdminSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can delete admin accounts" }
  }

  const result = deleteAdminSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { adminId } = result.data

  if (adminId === session.user.id) {
    return { error: "You cannot delete your own account" }
  }

  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true },
  })

  if (!user) {
    return { error: "Admin not found" }
  }

  if (user.role !== "ADMIN") {
    return { error: "Only admin accounts can be deleted" }
  }

  await prisma.user.delete({
    where: { id: adminId },
  })

  revalidatePath("/admin")

  return { success: true }
}

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
    select: { id: true, role: true },
  })

  if (!user) {
    return { error: "Member not found" }
  }

  if (user.role !== "MEMBER") {
    return { error: "Only member accounts can be deleted" }
  }

  await prisma.user.delete({
    where: { id: memberId },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/members")

  return { success: true }
}

export async function adminForgotPassword(data: z.infer<typeof adminForgotPasswordSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can reset their password" }
  }

  const result = adminForgotPasswordSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, newPassword } = result.data
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedEmail !== session.user.email) {
    return { error: "You can only reset your own password" }
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, role: true },
  })

  if (!user || user.role !== "ADMIN") {
    return { error: "Admin account not found" }
  }

  const hashedPassword = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  revalidatePath("/dashboard")

  return { success: true }
}
