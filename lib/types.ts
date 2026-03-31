export const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const

export type Role = (typeof Role)[keyof typeof Role]

export const ExpenseCategory = {
  FOOD: "FOOD",
  TRAVEL: "TRAVEL",
  TRANSPORTATION: "TRANSPORTATION",
  ACCOMMODATION: "ACCOMMODATION",
  OFFICE_SUPPLIES: "OFFICE_SUPPLIES",
  COMMUNICATION: "COMMUNICATION",
  ENTERTAINMENT: "ENTERTAINMENT",
  OTHER: "OTHER",
} as const

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory]

export const ExpenseStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAID: "PAID",
} as const

export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus]
