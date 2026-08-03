"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  ArrowDownToLine, ArrowUpFromLine, Wallet, Loader2, Send, Download,
  MessageCircleMore, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, Gift, Bell, TrendingUp,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { transactionApi, advertisementApi, settingsApi, notificationApi } from "@/lib/api-client"
import type { Transaction, Advertisement } from "@/lib/types"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { getBrandConfig } from "@/lib/brand-config"

export default function DashboardPage() {
  const brand = getBrandConfig()
  const { user } = useAuth()
  const router = useRouter()
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([])
  const [isLoadingAd, setIsLoadingAd] = useState(true)
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [referralBonusEnabled, setReferralBonusEnabled] = useState(false)
  const [whatsappPhone, setWhatsappPhone] = useState("")
  const [telegram, setTelegram] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)

  const handleRowClick = (transaction: Transaction) => {
    sessionStorage.setItem("cached_transaction", JSON.stringify(transaction))
    router.push(`/dashboard/history/detail?id=${transaction.reference}`)
  }

  useEffect(() => {
    window.history.replaceState(null, "", window.location.href)
    const handlePopState = () => { window.history.pushState(null, "", window.location.href) }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationApi.getAll(1)
      const count = response.results.filter((n: any) => !n.is_read).length
      let fcmCount = 0
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("fcm_notifications")
        if (stored) {
          try { fcmCount = JSON.parse(stored).filter((n: any) => !n.is_read).length } catch {}
        }
      }
      setUnreadCount(count + fcmCount)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    const handleFocus = () => { if (user) { fetchRecentTransactions(); fetchUnreadCount() } }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [user])

  const fetchRecentTransactions = async () => {
    try {
      setIsLoadingTransactions(true)
      const data = await transactionApi.getHistory({ page: 1, page_size: 5 })
      setRecentTransactions(data.results)
    } catch (error) { console.error("Error fetching recent transactions:", error) }
    finally { setIsLoadingTransactions(false) }
  }

  const fetchAdvertisement = async () => {
    try {
      setIsLoadingAd(true)
      const response = await advertisementApi.get()
      if (response?.results && Array.isArray(response.results)) {
        setAdvertisements(response.results.filter((ad: Advertisement) => ad.enable === true && (ad.image || ad.image_url)))
      }
    } catch (error) { console.error("Error fetching advertisement:", error) }
    finally { setIsLoadingAd(false) }
  }

  const fetchSettings = async () => {
    try {
      const settings = await settingsApi.get()
      setReferralBonusEnabled(settings?.referral_bonus === true)
      setWhatsappPhone(settings?.whatsapp_phone || "")
      setTelegram(settings?.telegram || "")
    } catch (error) {
      console.error("Error fetching settings:", error)
      setReferralBonusEnabled(false)
    }
  }

  useEffect(() => {
    if (user) { fetchRecentTransactions(); fetchAdvertisement(); fetchSettings(); fetchUnreadCount() }
  }, [user])

  useEffect(() => {
    if (advertisements.length <= 1) return
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [advertisements.length])

  const getStatusConfig = (status: Transaction["status"]) => {
    const configs: Record<string, { icon: any; color: string; bg: string; label: string }> = {
      pending:      { icon: Clock,        color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10",   label: "En attente" },
      accept:       { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", label: "Accepté" },
      init_payment: { icon: Clock,        color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10",   label: "En attente" },
      error:        { icon: XCircle,      color: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-500/10",       label: "Erreur" },
      reject:       { icon: XCircle,      color: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-500/10",       label: "Rejeté" },
      timeout:      { icon: AlertCircle,  color: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800/60",  label: "Expiré" },
      cancel:       { icon: XCircle,      color: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800/60",  label: "Annulé" },
      annuler:      { icon: XCircle,      color: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800/60",  label: "Annulé" },
    }
    return configs[status] || configs.timeout
  }

  const currentAd = advertisements[currentAdIndex]

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">

      {/* ── Top Header ── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Bonjour,</p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {user?.first_name || "Client"} {user?.last_name || ""}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-200 shadow-sm"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl surface-hero text-white font-semibold text-sm shadow-md transition-transform hover:scale-105 duration-200"
          >
            {(user?.first_name?.charAt(0) || "U").toUpperCase()}{(user?.last_name?.charAt(0) || "").toUpperCase()}
          </Link>
        </div>
      </div>

      {/* ── Hero card ── */}
      <div className="surface-hero grid-overlay rounded-2xl overflow-hidden shadow-horizon-lg">
        <div className="relative z-10 p-5">
          {/* brand row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider mb-1">Compte principal</p>
              <p className="text-xl font-bold text-white tracking-tight">{brand.name}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white/70">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>

          {/* primary actions */}
          <div className="flex items-center gap-2.5 mb-4">
            <Link
              href="/dashboard/deposit"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-white/95 active:scale-[0.97] transition-all shadow-sm"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Dépôt
            </Link>
            <Link
              href="/dashboard/withdrawal"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 active:scale-[0.97] transition-all"
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Retrait
            </Link>
          </div>

          {/* secondary row — bonus/apk only · full width download */}
          <div className="pt-3.5 border-t border-white/10">
            {referralBonusEnabled ? (
              /* Bonus available — show as a wide button */
              <Link
                href="/dashboard/bonus"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/15 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 active:scale-[0.97] transition-all"
              >
                <Gift className="w-4 h-4" />
                Voir mes bonus
              </Link>
            ) : (
              /* No bonus — show APK download as a wide CTA */
              <a
                href={brand.apkUrl}
                download={brand.apkFileName}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/15 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 active:scale-[0.97] transition-all"
              >
                <Download className="w-4 h-4" />
                Télécharger l'application Android
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Advertisement banner (immediately after hero) ── */}
      {!isLoadingAd && currentAd && (
        <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-sm aspect-[16/6] min-h-[130px] max-h-[200px] group">
          <Image
            src={currentAd.image_url || currentAd.image || ""}
            alt={currentAd.title || "Publicité"}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col justify-end p-4">
            {currentAd.title && (
              <p className="text-sm font-semibold text-white leading-tight">{currentAd.title}</p>
            )}
            {currentAd.description && (
              <p className="text-xs text-white/70 mt-0.5 line-clamp-1">{currentAd.description}</p>
            )}
          </div>
          {(currentAd.url || currentAd.link) && (
            <a href={currentAd.url || currentAd.link || "#"} target="_blank" rel="noopener noreferrer" className="absolute inset-0" />
          )}
          {advertisements.length > 1 && (
            <div className="absolute bottom-3 right-3 flex gap-1.5 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
              {advertisements.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentAdIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentAdIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Recent Transactions ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Transactions récentes</h2>
          <Link
            href="/dashboard/history"
            className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Tout voir
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          {isLoadingTransactions ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="surface-panel flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Wallet className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Aucune transaction</p>
              <p className="text-xs text-muted-foreground mb-4">Commencez par effectuer un dépôt.</p>
              <Link
                href="/dashboard/deposit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity shadow-sm"
              >
                Faire un dépôt
              </Link>
            </div>
          ) : (
            recentTransactions.map((transaction) => {
              const statusConfig = getStatusConfig(transaction.status)
              const StatusIcon = statusConfig.icon
              const isDeposit = transaction.type_trans === "deposit"

              return (
                <div
                  key={transaction.id}
                  onClick={() => handleRowClick(transaction)}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-border hover:shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                      isDeposit
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}>
                      {isDeposit
                        ? <ArrowDownToLine className="w-4 h-4" />
                        : <ArrowUpFromLine className="w-4 h-4" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-foreground">
                          {isDeposit ? "Dépôt" : "Retrait"}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {transaction.app_details?.name || transaction.app}
                        {" · "}
                        {format(new Date(transaction.created_at), "dd MMM, HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 tabular-nums ${
                    isDeposit
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {isDeposit ? "+" : "−"}{transaction.amount.toLocaleString()} <span className="text-xs font-medium">FCFA</span>
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Floating Support Chat ── */}
      <div className="fixed right-4 bottom-24 z-40">
        {isChatOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsChatOpen(false)} />
            <div className="absolute bottom-full right-0 z-50 mb-3 w-52 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-200">
              <div className="border-b border-border/60 px-4 py-3">
                <p className="text-xs font-semibold text-foreground">Support</p>
              </div>
              <div className="p-2 space-y-0.5">
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center text-white flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">WhatsApp</span>
                </a>
                <a
                  href={telegram.startsWith("http") ? telegram : `https://t.me/${telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0088cc] flex items-center justify-center text-white flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Telegram</span>
                </a>
              </div>
            </div>
          </>
        )}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
            isChatOpen
              ? "bg-card border border-border text-muted-foreground hover:text-foreground"
              : "surface-hero text-white shadow-blue-500/25 hover:scale-105"
          }`}
        >
          {isChatOpen ? (
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <MessageCircleMore className="w-5 h-5" />
          )}
        </button>
      </div>

    </div>
  )
}
