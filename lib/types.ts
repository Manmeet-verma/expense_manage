export const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const

export type Role = (typeof Role)[keyof typeof Role]

export const ExpenseCategory = {
  FREIGHT: "FREIGHT",
  PORTER: "PORTER",
  FOOD: "FOOD",
  OFFICE_GOODS: "OFFICE_GOODS",
  HOTEL: "HOTEL",
  PETROL: "PETROL",
  DIESEL: "DIESEL",
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
