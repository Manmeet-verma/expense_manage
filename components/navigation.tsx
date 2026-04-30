"use client"

import Link from "next/link"
import { useState, Fragment } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LayoutDashboard, LogOut, Users, Wallet, PanelLeft, FileText, List, UserPlus, Tags } from "lucide-react"

interface NavProps {
  user: {
    name: string | null
    email: string
    role: "ADMIN" | "SUPERVISOR" | "MEMBER"
  }
}

export function Navigation({ user }: NavProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAdmin = user.role === "ADMIN"
  const isSupervisor = user.role === "SUPERVISOR"
  const isAdminOrSupervisor = isAdmin || isSupervisor

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      visible: user.role === "MEMBER",
    },
    {
      href: "/dashboard/expense-entry",
      label: "Add Expense",
      icon: LayoutDashboard,
      visible: user.role === "MEMBER",
    },
    {
      href: "/dashboard/my-fund",
      label: "Add Collection",
      icon: Wallet,
      visible: user.role === "MEMBER",
    },
    {
      href: "/dashboard/statement",
      label: "Statement",
      icon: FileText,
      visible: user.role === "MEMBER",
    },
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      visible: isAdmin,
    },
    {
      href: "/admin",
      label: "Expense Review",
      icon: Users,
      visible: isAdminOrSupervisor,
    },
    {
      href: "/admin/members",
      label: "Members",
      icon: Users,
      visible: isAdminOrSupervisor,
    },
    {
      href: "/admin/statement",
      label: "Statement",
      icon: FileText,
      visible: isAdminOrSupervisor,
    },
    {
      href: "/admin/create-supervisor",
      label: "Create Supervisor",
      icon: UserPlus,
      visible: isAdmin,
    },
    {
      href: "/admin/fund-distribution",
      label: "Give Money",
      icon: Wallet,
      visible: user.role === "ADMIN",
    },
    {
      href: "/admin/add-category",
      label: "Add Category",
      icon: Tags,
      visible: isAdmin,
    },
  ]

  function toggleSidebar() {
    window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"))
  }

  function toggleMobileMenu() {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  function handleNavClick() {
    setMobileMenuOpen(false)
  }

  return (
    <Fragment>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className="h-8 w-8 p-0"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </Button>
                )}
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

            <div className="flex items-center gap-3">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="h-8 w-8 p-0 md:hidden"
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={toggleMobileMenu}
          />
          <div className="fixed top-0 right-0 z-50 w-64 h-full bg-white shadow-lg animate-slide-in-right">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <span className="font-bold text-lg text-gray-900">Menu</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <div className="flex flex-col gap-2">
                {navItems.filter(item => item.visible).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      pathname === item.href
                        ? "bg-red-100 text-red-600"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </>
      )}
    </Fragment>
  )
}
