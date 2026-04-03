import { cn } from "@/lib/utils"

export function Footer({ className }: { className?: string }) {
  return (
    <>
      <footer className={cn("py-3 px-4 text-center text-sm text-white bg-blue-600 border-t mt-auto", className)}>
        <p className="text-xs sm:text-sm">Powered By Techon Team</p>
      </footer>
      <div className="h-4 bg-gradient-to-br from-blue-50 to-indigo-100" />
    </>
  )
}