'use client'

import { useEffect, useState } from "react"
import { CheckCircle, XCircle } from "lucide-react"

interface MyMenuSidebarProps {
  onApproveClick: () => void
  onRejectClick: () => void
  activeView: "approve" | "reject" | null
}

export function MyMenuSidebar({ onApproveClick, onRejectClick, activeView }: MyMenuSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    window.addEventListener("toggle-mobile-sidebar", handleToggle as EventListener)
    return () => window.removeEventListener("toggle-mobile-sidebar", handleToggle as EventListener)
  }, [])

  return (
    <>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 w-48 md:w-56 shadow-lg md:shadow-none animate-slide-in">
            <div className="sticky top-16 p-3">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="font-medium">My Menu</span>
                <span className="text-sm">{isOpen ? "-" : "+"}</span>
              </button>

              {isOpen && (
                <div className="mt-2 flex flex-col gap-1">
                  <button
                    onClick={onApproveClick}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeView === "approve"
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Total Expense Approve
                  </button>

                  <button
                    onClick={onRejectClick}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeView === "reject"
                        ? "bg-red-100 text-red-700 border border-red-300"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Not Approved
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
