"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Ticket, Copy, Check, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { couponApi, platformApi, settingsApi, transactionApi } from "@/lib/api-client"
import type { Coupon, Platform } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function CouponPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [couponAccessEnabled, setCouponAccessEnabled] = useState(false)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const init = async () => {
      try {
        const settings = await settingsApi.get()
        const requiresDeposit = settings?.requires_deposit_to_view_coupon === true
        const minimumRequired: number = settings?.minimun_deposit_before_view_coupon ?? 0
        if (!requiresDeposit) {
          setCouponAccessEnabled(true)
          await Promise.all([fetchCoupons(), fetchPlatforms()])
          return
        }
        const history = await transactionApi.getHistory({ type_trans: "deposit", status: "accept", page_size: 100 })
        const hasQualifying = history.results.some((tx: any) => tx.amount >= minimumRequired)
        if (!hasQualifying) {
          toast.error(`Effectuez un dépôt d'au moins ${minimumRequired.toLocaleString()} FCFA pour accéder aux coupons`)
          router.push("/dashboard")
          return
        }
        setCouponAccessEnabled(true)
        await Promise.all([fetchCoupons(), fetchPlatforms()])
      } catch { router.push("/dashboard") }
      finally { setIsLoadingSettings(false) }
    }
    init()
  }, [user, router])

  useEffect(() => {
    if (!couponAccessEnabled) return
    const handleFocus = () => fetchCoupons()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [couponAccessEnabled])

  const fetchPlatforms = async () => {
    try { const data = await platformApi.getAll(); setPlatforms(data) } catch {}
  }

  const fetchCoupons = async () => {
    setIsLoading(true)
    try { const data = await couponApi.getAll(1); setCoupons(data.results) }
    catch { toast.error("Erreur lors du chargement") }
    finally { setIsLoading(false) }
  }

  const getPlatformName = (betAppId: string) => {
    return platforms.find((p) => p.id === betAppId)?.name || "Plateforme"
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Code copié!")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  if (!couponAccessEnabled) return null

  return (
    <div className="space-y-5 pb-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Mes Coupons</h1>
          <p className="text-xs text-muted-foreground">{coupons.length} coupon(s) disponible(s)</p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 px-4 text-center rounded-2xl border border-border/60 bg-card">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Ticket className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Aucun coupon</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Vos coupons de pari apparaîtront ici dès qu'ils seront disponibles.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="rounded-2xl border border-border/60 bg-card overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-bold text-foreground tracking-wide truncate">
                      {coupon.code}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getPlatformName(coupon.bet_app)}
                    </p>
                  </div>
                  <span className="flex-shrink-0 px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-medium">
                    Coupon
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-muted-foreground">Créé le</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(coupon.created_at), "dd MMM yyyy", { locale: fr })}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(coupon.code)}
                  className={`w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium border transition-all duration-200 ${
                    copiedCode === coupon.code
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card"
                  }`}
                >
                  {copiedCode === coupon.code ? (
                    <><Check className="w-4 h-4" /> Copié!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copier le code</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
