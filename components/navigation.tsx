"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LayoutDashboard, LogOut, Users, Receipt } from "lucide-react"

interface NavProps {
  user: {
    name: string | null
    email: string
    role: "ADMIN" | "MEMBER"
  }
}

export function Navigation({ user }: NavProps) {
  const pathname = usePathname()
  const isAdmin = user.role === "ADMIN"

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      href: "/admin",
      label: "Admin",
      icon: Users,
      visible: isAdmin,
    },
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-xl text-gray-900">Expense Manager</span>
            </Link>
            <div className="flex items-center gap-4">
              {navItems.filter(item => item.visible).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">{user.name}</span>
              <span className="text-xs text-gray-500">{user.role}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
