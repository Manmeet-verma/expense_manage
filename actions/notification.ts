'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function createNotification(data: {
  title: string
  message: string
  type: string
  userId: string
}) {
  return await prisma.notification.create({
    data: {
      title: data.title,
      message: data.message,
      type: data.type,
      userId: data.userId,
    },
  })
}

export async function createNotificationsForAllUsers(data: {
  title: string
  message: string
  type: string
  excludeUserId?: string
}) {
  const where: Record<string, unknown> = {}
  if (data.excludeUserId) {
    where.id = { not: data.excludeUserId }
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  })

  if (users.length === 0) return []

  return await prisma.notification.createMany({
    data: users.map((user) => ({
      title: data.title,
      message: data.message,
      type: data.type,
      userId: user.id,
    })),
  })
}

export async function getMyNotifications() {
  const session = await auth()
  if (!session?.user) return []

  return await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export async function getUnreadNotificationCount() {
  const session = await auth()
  if (!session?.user) return 0

  return await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  })
}

export async function markNotificationAsRead(id: string) {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  })

  revalidatePath("/")
  return { success: true }
}

export async function markAllNotificationsAsRead() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })

  revalidatePath("/")
  return { success: true }
}
