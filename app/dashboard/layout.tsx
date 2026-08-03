"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { LayoutGrid, Loader2, ReceiptText, Ticket, User2 } from "lucide-react"
import { transactionApi } from "@/lib/api-client"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  /* ── Coupon nav item with deposit-gate check ── */
  const handleCouponNav = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      const data = await transactionApi.getHistory({ type_trans: "deposit", status: "accept", page_size: 1 })
      if (data.results && data.results.length > 0) {
        router.push("/dashboard/coupon")
      } else {
        // No accepted deposit — go to dashboard which will show the gate
        router.push("/dashboard/coupon")
      }
    } catch {
      router.push("/dashboard/coupon")
    }
  }

  const navItems = [
    { href: "/dashboard",         label: "Accueil",    icon: LayoutGrid,  onClick: undefined },
    { href: "/dashboard/history", label: "Historique", icon: ReceiptText, onClick: undefined },
    { href: "/dashboard/coupon",  label: "Coupons",    icon: Ticket,      onClick: handleCouponNav },
    { href: "/dashboard/profile", label: "Profil",     icon: User2,       onClick: undefined },
  ]

  return (
    <div className="min-h-screen pb-20">
      {/* Page content */}
      <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-5">
        {children}
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-2">
          <div className="flex items-center justify-around py-1">
            {navItems.map(({ href, label, icon: Icon, onClick }) => {
              const isActive =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClick}
                  className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition-all duration-200 min-w-[60px] ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="relative flex h-6 w-6 items-center justify-center">
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
