'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
})

export async function signup(data: z.infer<typeof signupSchema>) {
  const result = signupSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, name, password, role } = result.data

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: "Email already registered" }
  }

  const hashedPassword = await hashPassword(password)

  await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role,
    },
  })

  revalidatePath("/login")
  return { success: true }
}
