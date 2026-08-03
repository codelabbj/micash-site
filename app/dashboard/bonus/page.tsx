"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  Loader2, Gift, ChevronLeft, Sparkles, CheckCircle2,
  ChevronDown, Wallet, ArrowRight, X,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { bonusApi, settingsApi, platformApi, userAppIdApi, authApi, bonusTransactionApi } from "@/lib/api-client"
import type { Bonus, Platform, UserAppId, User } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const inputCls = "w-full h-11 px-3.5 rounded-xl border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 focus:bg-card outline-none text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"

export default function BonusPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [referralBonusEnabled, setReferralBonusEnabled] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [isLoadingBonuses, setIsLoadingBonuses] = useState(true)
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [betIds, setBetIds] = useState<UserAppId[]>([])
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false)
  const [isLoadingBetIds, setIsLoadingBetIds] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId, setSelectedBetId] = useState<UserAppId | null>(null)
  const [amount, setAmount] = useState("")
  const [isPlatformOpen, setIsPlatformOpen] = useState(false)
  const [isBetIdOpen, setIsBetIdOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const bonusAvailable = userProfile?.bonus_available ?? 0

  useEffect(() => {
    if (!user) return
    const init = async () => {
      try {
        const settings = await settingsApi.get()
        const enabled = settings?.referral_bonus === true
        setReferralBonusEnabled(enabled)
        if (!enabled) { router.push("/dashboard"); return }
        await Promise.all([fetchProfile(), fetchBonuses(), fetchPlatforms()])
      } catch { router.push("/dashboard") }
      finally { setIsLoadingSettings(false) }
    }
    init()
  }, [user, router])

  useEffect(() => {
    if (!referralBonusEnabled) return
    const handleFocus = () => { fetchProfile(); fetchBonuses() }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [referralBonusEnabled])

  useEffect(() => {
    setSelectedBetId(null); setBetIds([])
    if (!selectedPlatform) return
    fetchBetIds(selectedPlatform.id)
  }, [selectedPlatform])

  const fetchProfile = async () => {
    setIsLoadingProfile(true)
    try { setUserProfile(await authApi.getProfile()) } catch {}
    finally { setIsLoadingProfile(false) }
  }

  const fetchBonuses = async () => {
    setIsLoadingBonuses(true)
    try { setBonuses((await bonusApi.getAll(1)).results) } catch {}
    finally { setIsLoadingBonuses(false) }
  }

  const fetchPlatforms = async () => {
    setIsLoadingPlatforms(true)
    try { setPlatforms((await platformApi.getAll("deposit")).filter((p: Platform) => p.enable)) } catch {}
    finally { setIsLoadingPlatforms(false) }
  }

  const fetchBetIds = async (platformId: string) => {
    setIsLoadingBetIds(true)
    try { setBetIds(await userAppIdApi.getByPlatform(platformId)) } catch {}
    finally { setIsLoadingBetIds(false) }
  }

  const validateForm = () => {
    if (!selectedPlatform) { toast.error("Veuillez sélectionner une plateforme"); return false }
    if (!selectedBetId) { toast.error("Veuillez sélectionner votre ID de pari"); return false }
    const amountNum = Number(amount)
    if (!amount || amountNum <= 0) { toast.error("Veuillez saisir un montant valide"); return false }
    if (amountNum > bonusAvailable) { toast.error(`Le montant dépasse votre solde bonus (${bonusAvailable.toLocaleString()} FCFA)`); return false }
    return true
  }

  const handleConfirm = async () => {
    if (!selectedPlatform || !selectedBetId) return
    setIsSubmitting(true)
    try {
      await bonusTransactionApi.create({ app: selectedPlatform.id, user_app_id: selectedBetId.user_app_id, amount: Number(amount) })
      toast.success("Transaction bonus créée avec succès!")
      setSelectedPlatform(null); setSelectedBetId(null); setAmount(""); setIsConfirmOpen(false)
      await Promise.all([fetchProfile(), fetchBonuses()])
    } catch {}
    finally { setIsSubmitting(false) }
  }

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  if (!referralBonusEnabled) return null

  return (
    <div className="space-y-5 pb-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Mes bonus</h1>
          <p className="text-xs text-muted-foreground">Parrainage & Récompenses</p>
        </div>
      </div>

      {/* Balance card */}
      <div className="surface-hero rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-white/60" />
          <p className="text-xs text-white/60 font-medium">Solde bonus disponible</p>
        </div>
        {isLoadingProfile ? (
          <Loader2 className="w-6 h-6 animate-spin text-white/60" />
        ) : (
          <p className="text-3xl font-bold text-white">
            {bonusAvailable.toLocaleString()}
            <span className="text-base font-medium text-white/60 ml-1.5">FCFA</span>
          </p>
        )}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-white/50">{bonuses.length} bonus reçu(s)</p>
        </div>
      </div>

      {/* Conversion form */}
      {!isLoadingProfile && bonusAvailable > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Convertir en crédit de pari</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Transférez votre bonus vers votre compte de pari</p>
          </div>
          <div className="p-5 space-y-4">
            {/* Platform */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Plateforme</label>
              <div className="relative">
                <button
                  onClick={() => { setIsPlatformOpen(!isPlatformOpen); setIsBetIdOpen(false) }}
                  disabled={isLoadingPlatforms}
                  className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between text-sm hover:border-primary/40 transition-colors disabled:opacity-50"
                >
                  {isLoadingPlatforms ? (
                    <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</span>
                  ) : selectedPlatform ? (
                    <span className="flex items-center gap-2">
                      {selectedPlatform.image && <Image src={selectedPlatform.image} alt={selectedPlatform.name} width={20} height={20} className="rounded object-contain" />}
                      <span className="text-foreground font-medium">{selectedPlatform.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sélectionner une plateforme</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isPlatformOpen ? "rotate-180" : ""}`} />
                </button>
                {isPlatformOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover rounded-xl border border-border shadow-lg overflow-hidden animate-in fade-in duration-150">
                    <div className="max-h-56 overflow-y-auto">
                      {platforms.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground text-center">Aucune plateforme disponible</p>
                      ) : platforms.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPlatform(p); setIsPlatformOpen(false) }}
                          className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-muted transition-colors text-left ${selectedPlatform?.id === p.id ? "bg-primary/5 text-primary" : "text-foreground"}`}
                        >
                          {p.image && <Image src={p.image} alt={p.name} width={22} height={22} className="rounded object-contain flex-shrink-0" />}
                          <span className="font-medium flex-1">{p.name}</span>
                          {selectedPlatform?.id === p.id && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bet ID */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ID de pari</label>
              <div className="relative">
                <button
                  onClick={() => { if (selectedPlatform) { setIsBetIdOpen(!isBetIdOpen); setIsPlatformOpen(false) } }}
                  disabled={!selectedPlatform || isLoadingBetIds}
                  className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between text-sm hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingBetIds ? (
                    <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</span>
                  ) : selectedBetId ? (
                    <span className="font-semibold text-foreground font-mono">{selectedBetId.user_app_id}</span>
                  ) : (
                    <span className="text-muted-foreground">{selectedPlatform ? "Sélectionner votre ID" : "Choisir d'abord une plateforme"}</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isBetIdOpen ? "rotate-180" : ""}`} />
                </button>
                {isBetIdOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover rounded-xl border border-border shadow-lg overflow-hidden animate-in fade-in duration-150">
                    <div className="max-h-56 overflow-y-auto">
                      {betIds.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">Aucun ID enregistré</p>
                          <Link href="/dashboard/phones" className="text-xs font-medium text-primary hover:underline">Ajouter un ID →</Link>
                        </div>
                      ) : betIds.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => { setSelectedBetId(b); setIsBetIdOpen(false) }}
                          className={`w-full px-4 py-2.5 flex items-center justify-between text-sm hover:bg-muted transition-colors ${selectedBetId?.id === b.id ? "bg-primary/5 text-primary" : "text-foreground"}`}
                        >
                          <span className="font-mono font-medium">{b.user_app_id}</span>
                          {selectedBetId?.id === b.id && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Montant</label>
                <button type="button" onClick={() => setAmount(String(bonusAvailable))} className="text-xs font-medium text-primary hover:underline">
                  Max: {bonusAvailable.toLocaleString()} FCFA
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  max={bonusAvailable}
                  placeholder="Montant"
                  className={inputCls + " pr-14"}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">FCFA</span>
              </div>
              {Number(amount) > bonusAvailable && bonusAvailable > 0 && (
                <p className="text-xs text-red-500 mt-1">Le montant dépasse votre solde disponible</p>
              )}
            </div>

            <button
              onClick={() => { if (validateForm()) setIsConfirmOpen(true) }}
              disabled={!selectedPlatform || !selectedBetId || !amount || Number(amount) > bonusAvailable}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Convertir le bonus <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bonus history */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Historique des bonus</h2>
        {isLoadingBonuses ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : bonuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-border/60 bg-card text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Gift className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Aucun bonus</p>
            <p className="text-xs text-muted-foreground mt-1">Vos bonus de parrainage apparaîtront ici</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            {bonuses.map((bonus, index) => (
              <div
                key={bonus.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${index !== bonuses.length - 1 ? "border-b border-border/40" : ""}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{bonus.reason_bonus || "Bonus de parrainage"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(bonus.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums flex-shrink-0">
                  +{parseFloat(bonus.amount).toLocaleString()} <span className="text-xs font-medium text-muted-foreground">FCFA</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
              <h3 className="text-base font-semibold text-foreground">Confirmer la transaction</h3>
              <button onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl bg-muted/50 border border-border/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Plateforme</span>
                  <span className="font-medium text-foreground">{selectedPlatform?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ID de pari</span>
                  <span className="font-mono font-medium text-foreground">{selectedBetId?.user_app_id}</span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-sm">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {Number(amount).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 grid grid-cols-2 gap-2.5">
              <button onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting} className="h-11 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleConfirm} disabled={isSubmitting} className="h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmer <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
