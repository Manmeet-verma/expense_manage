'use server'

import { randomUUID } from "crypto"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

type CategoryRow = {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

type ExpenseUsageRow = {
  category: string
  amount: number
  createdById: string
}

type CategoryUsageRow = {
  expenseCount: number
  totalAmount: number
  memberIds: Set<string>
}

const categoryMembersSchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
})

const DEFAULT_CATEGORY_NAMES = [
  "Freight/Gaddi",
  "Porter",
  "Food",
  "Office Goods",
  "Hotel",
  "Fuel",
  "Advance",
  "Salary",
] as const

function normalizeCategoryName(name: string) {
  const value = name.trim()
  if (!value) return ""

  const upper = value.toUpperCase()
  if (upper === "FREIGHT" || upper === "FREIGHT/GADDI") return "Freight/Gaddi"
  if (upper === "PORTER") return "Porter"
  if (upper === "FOOD") return "Food"
  if (upper === "OFFICE_GOODS" || upper === "OFFICE GOODS") return "Office Goods"
  if (upper === "HOTEL") return "Hotel"
  if (upper === "PETROL" || upper === "DIESEL" || upper === "FUEL") return "Fuel"

  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(50, "Category name is too long"),
  description: z.string().max(200, "Description is too long").optional(),
})

export async function createCategory(data: z.infer<typeof createCategorySchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can create categories" }
  }

  const result = createCategorySchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const normalizedName = normalizeCategoryName(result.data.name)
  const description = result.data.description?.trim() || undefined

  const existingCategory = await prisma.$queryRaw<CategoryRow[]>`
    SELECT "id", "name", "description", "createdAt", "updatedAt"
    FROM "Category"
    WHERE "name" = ${normalizedName}
    LIMIT 1
  `

  if (existingCategory.length > 0) {
    return { error: "Category already exists" }
  }

  await prisma.$executeRaw`
    INSERT INTO "Category" ("id", "name", "description", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${normalizedName}, ${description ?? null}, NOW(), NOW())
  `

  revalidatePath("/admin/add-category")
  return { success: true }
}

export async function getCategories() {
  const session = await auth()

  if (!session?.user) {
    return []
  }

  const rows = await prisma.$queryRaw<CategoryRow[]>`
    SELECT "id", "name", "description", "createdAt", "updatedAt"
    FROM "Category"
    ORDER BY "createdAt" DESC
  `

  const deduped = new Map<string, CategoryRow>()

  for (const row of rows) {
    const normalized = normalizeCategoryName(row.name)
    if (!normalized) continue
    if (!deduped.has(normalized)) {
      deduped.set(normalized, {
        ...row,
        name: normalized,
      })
    }
  }

  for (const defaultName of DEFAULT_CATEGORY_NAMES) {
    if (!deduped.has(defaultName)) {
      deduped.set(defaultName, {
        id: `default-${defaultName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: defaultName,
        description: "",
        createdAt: new Date(0),
        updatedAt: new Date(0),
      })
    }
  }

  return Array.from(deduped.values())
}

export async function getCategoryStatistics(): Promise<Array<CategoryRow & { expenseCount: number; totalAmount: number; memberCount: number }>> {
  const session = await auth()

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
    return []
  }

  const [categories, expenses] = await Promise.all([
    prisma.$queryRaw<CategoryRow[]>`
      SELECT "id", "name", "description", "createdAt", "updatedAt"
      FROM "Category"
      ORDER BY "createdAt" DESC
    `,
    prisma.$queryRaw<ExpenseUsageRow[]>`
      SELECT "category", "amount", "createdById"
      FROM "Expense"
    `,
  ])

  const usageMap = expenses.reduce<Map<string, CategoryUsageRow>>(
    (map: Map<string, CategoryUsageRow>, expense) => {
      const key = normalizeCategoryName(expense.category)
      const current = map.get(key) ?? {
        expenseCount: 0,
        totalAmount: 0,
        memberIds: new Set<string>(),
      }

      current.expenseCount += 1
      current.totalAmount += expense.amount
      current.memberIds.add(expense.createdById)
      map.set(key, current)

      return map
    },
    new Map()
  )

  const deduped = new Map<string, CategoryRow>()
  for (const category of categories) {
    const normalized = normalizeCategoryName(category.name)
    if (!normalized) continue
    if (!deduped.has(normalized)) {
      deduped.set(normalized, { ...category, name: normalized })
    }
  }

  for (const defaultName of DEFAULT_CATEGORY_NAMES) {
    if (!deduped.has(defaultName)) {
      deduped.set(defaultName, {
        id: `default-${defaultName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: defaultName,
        description: "",
        createdAt: new Date(0),
        updatedAt: new Date(0),
      })
    }
  }

  return Array.from(deduped.values()).map((category) => {
    const usage = usageMap.get(normalizeCategoryName(category.name)) ?? {
      expenseCount: 0,
      totalAmount: 0,
      memberIds: new Set<string>(),
    }

    return {
      ...category,
      expenseCount: usage.expenseCount,
      totalAmount: usage.totalAmount,
      memberCount: usage.memberIds.size,
    }
  })
}

export async function getCategoryMemberExpenses(data: z.infer<typeof categoryMembersSchema>) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can view category member expenses", data: [] as Array<{
      id: string
      memberName: string
      description: string | null
      amount: number
      createdAt: Date
    }> }
  }

  const result = categoryMembersSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.issues[0].message, data: [] }
  }

  const normalizedCategory = normalizeCategoryName(result.data.categoryName)

  const expenses = await prisma.expense.findMany({
    where: {
      createdBy: {
        role: "MEMBER",
      },
    },
    select: {
      id: true,
      category: true,
      description: true,
      amount: true,
      createdAt: true,
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const filtered = expenses
    .filter((expense) => normalizeCategoryName(expense.category) === normalizedCategory)
    .map((expense) => ({
      id: expense.id,
      memberName: expense.createdBy.name || expense.createdBy.email,
      description: expense.description,
      amount: expense.amount,
      createdAt: expense.createdAt,
    }))

  return { success: true, data: filtered }
}
