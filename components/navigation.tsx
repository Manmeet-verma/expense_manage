"use client"

import Link from "next/link"
import { useState, Fragment } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LayoutDashboard, LogOut, Users, Wallet, PanelLeft, FileText } from "lucide-react"

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
      href: "/dashboard/expense-entry",
      label: "Add Expense",
      icon: LayoutDashboard,
      visible: !isAdmin,
    },
    {
      href: "/dashboard/my-fund",
      label: "Add Collection",
      icon: Wallet,
      visible: !isAdmin,
    },
    {
      href: "/dashboard/statement",
      label: "Statement",
      icon: FileText,
      visible: !isAdmin,
    },
    {
      href: "/admin/members",
      label: "Members",
      icon: Users,
      visible: isAdmin,
    },
  ]

  function toggleMobileSidebar() {
    window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"))
  }

  return (
    <Fragment>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileSidebar}
                  aria-label="Toggle sidebar"
                  className="h-8 w-8 p-0"
                >
                  <PanelLeft className="w-4 h-4" />
                </Button>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-xl text-gray-900">My Expense</span>
                </Link>
              </div>
              <div className="hidden md:flex flex-row items-start md:items-center gap-2 md:gap-3">
                {navItems.filter(item => item.visible).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                      pathname === item.href
                        ? "text-red-600"
                        : "text-gray-600 hover:text-red-600"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3 whitespace-nowrap">
              <span className="text-sm font-medium text-gray-900">{user.role}: {user.name || user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </Fragment>
  )
}
