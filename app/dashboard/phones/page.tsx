"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { phoneApi, userAppIdApi, networkApi, platformApi } from "@/lib/api-client"
import type { UserPhone, UserAppId, Network, Platform } from "@/lib/types"
import { toast } from "react-hot-toast"
import { Loader2, Phone, Plus, Trash2, Edit, Smartphone, ChevronLeft, X, Check } from "lucide-react"
import Link from "next/link"
import { formatPhoneNumberForDisplay } from "@/lib/utils"
import { getBrandConfig } from "@/lib/brand-config"

const COUNTRY_OPTIONS = [
  { label: "Burkina Faso", value: "bf", prefix: "+226" },
  { label: "Sénégal",      value: "sn", prefix: "+221" },
  { label: "Bénin",        value: "bj", prefix: "+229" },
  { label: "Côte d'Ivoire",value: "ci", prefix: "+225" },
]
const DEFAULT_COUNTRY_VALUE = "bj"

const buildInternationalPhone = (input: string, countryValue: string) => {
  const country = COUNTRY_OPTIONS.find(o => o.value === countryValue)
  if (!country) return input.trim()
  let s = input.trim().replace(/\s+/g, "")
  if (!s) return country.prefix
  if (s.startsWith(country.prefix)) s = s.slice(country.prefix.length)
  else {
    const numericPrefix = country.prefix.replace("+", "")
    if (s.startsWith(numericPrefix)) s = s.slice(numericPrefix.length)
  }
  if (s.startsWith("+")) s = s.slice(1)
  return `${country.prefix}${s}`
}

const parsePhoneByCountry = (phone: string) => {
  const s = phone.replace(/\s+/g, "")
  for (const c of COUNTRY_OPTIONS) {
    if (s.startsWith(c.prefix)) return { countryValue: c.value, localNumber: s.slice(c.prefix.length) }
  }
  return { countryValue: DEFAULT_COUNTRY_VALUE, localNumber: s }
}

const phoneSchema   = z.object({ phone: z.string().min(8, "Numéro invalide"), network: z.number().min(1, "Réseau requis") })
const appIdSchema   = z.object({ user_app_id: z.string().min(1, "ID requis"), app: z.string().min(1, "Plateforme requise") })

type PhoneFormData = z.infer<typeof phoneSchema>
type AppIdFormData = z.infer<typeof appIdSchema>

const inputCls = "w-full h-11 px-3.5 rounded-xl border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 focus:bg-card outline-none text-sm transition-all"
const selectCls = "w-full h-11 px-3.5 rounded-xl border border-border bg-muted/40 text-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 outline-none text-sm transition-all"

export default function PhonesPage() {
  const brand = getBrandConfig()
  const [isLoading, setIsLoading] = useState(true)
  const [userPhones, setUserPhones]   = useState<UserPhone[]>([])
  const [userAppIds, setUserAppIds]   = useState<UserAppId[]>([])
  const [networks, setNetworks]       = useState<Network[]>([])
  const [platforms, setPlatforms]     = useState<Platform[]>([])
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
  const [isAppIdModalOpen, setIsAppIdModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [editingPhone, setEditingPhone]   = useState<UserPhone | null>(null)
  const [editingAppId, setEditingAppId]   = useState<UserAppId | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<{ type: "phone" | "appId"; id: number } | null>(null)
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY_VALUE)
  const [editingCountry, setEditingCountry]   = useState(DEFAULT_COUNTRY_VALUE)
  const [activeTab, setActiveTab] = useState<"phones" | "betIds">("phones")
  const [isSearching, setIsSearching] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isErrorModalOpen,   setIsErrorModalOpen]   = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [searchResult, setSearchResult] = useState<{ name: string; userId: number; currencyId: number } | null>(null)
  const [pendingBetId, setPendingBetId] = useState<{ appId: string; betId: string } | null>(null)

  const phoneForm = useForm<PhoneFormData>({ resolver: zodResolver(phoneSchema) })
  const appIdForm = useForm<AppIdFormData>({ resolver: zodResolver(appIdSchema) })

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    const handleFocus = () => loadData()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [phonesData, networksData, platformsData] = await Promise.all([
        phoneApi.getAll(), networkApi.getAll(), platformApi.getAll()
      ])
      setUserPhones(phonesData); setNetworks(networksData); setPlatforms(platformsData)
      try { setUserAppIds(await userAppIdApi.getAll()) } catch {}
    } catch {}
    finally { setIsLoading(false) }
  }

  const handlePhoneSubmit = async (data: PhoneFormData) => {
    setIsSubmitting(true)
    try {
      const countryValue = editingPhone ? editingCountry : selectedCountry
      const phone = buildInternationalPhone(data.phone, countryValue)
      if (editingPhone) { await phoneApi.update(editingPhone.id, phone, data.network); toast.success("Numéro modifié!") }
      else { await phoneApi.create(phone, data.network); toast.success("Numéro ajouté!") }
      setIsPhoneModalOpen(false); phoneForm.reset(); setEditingPhone(null); loadData()
    } catch { toast.error("Erreur") }
    finally { setIsSubmitting(false) }
  }

  const handleAppIdSubmit = async (data: AppIdFormData) => {
    if (editingAppId) {
      setIsSubmitting(true)
      try {
        await userAppIdApi.update(editingAppId.id, data.user_app_id, data.app)
        toast.success("ID modifié!"); setIsAppIdModalOpen(false); appIdForm.reset(); setEditingAppId(null); loadData()
      } catch { toast.error("Erreur") }
      finally { setIsSubmitting(false) }
      return
    }
    setIsSearching(true)
    try {
      const response = await userAppIdApi.searchUser(data.app, data.user_app_id)
      if (response.UserId === 0) { setErrorMessage("Utilisateur non trouvé."); setIsErrorModalOpen(true); setIsAppIdModalOpen(false); return }
      if (response.CurrencyId !== 27) { setErrorMessage("Cet utilisateur n'utilise pas la devise XOF."); setIsErrorModalOpen(true); setIsAppIdModalOpen(false); return }
      setSearchResult({ name: response.Name, userId: response.UserId, currencyId: response.CurrencyId })
      setPendingBetId({ appId: data.app, betId: data.user_app_id })
      setIsAppIdModalOpen(false); setIsConfirmModalOpen(true)
    } catch (error: any) {
      let errorMsg = "Erreur lors de la recherche"
      if (error.response?.status === 400) {
        const d = error.response.data
        errorMsg = d.user_app_id?.[0] || d.app?.[0] || d.detail || d.error || d.message || errorMsg
      }
      setErrorMessage(errorMsg); setIsErrorModalOpen(true); setIsAppIdModalOpen(false)
    } finally { setIsSearching(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === "phone") { await phoneApi.delete(deleteTarget.id); toast.success("Numéro supprimé!") }
      else { await userAppIdApi.delete(deleteTarget.id); toast.success("ID supprimé!") }
      setDeleteTarget(null); loadData()
    } catch { toast.error("Erreur") }
  }

  const handleConfirmAddBetId = async () => {
    if (!pendingBetId) return
    setIsSubmitting(true)
    try {
      await userAppIdApi.create(pendingBetId.betId, pendingBetId.appId)
      toast.success("ID ajouté!"); setIsConfirmModalOpen(false); setPendingBetId(null); setSearchResult(null); appIdForm.reset(); loadData()
    } catch (error: any) {
      const d = error.response?.data
      toast.error(d?.user_app_id?.[0] || d?.detail || d?.error || d?.message || "Erreur lors de l'ajout")
    } finally { setIsSubmitting(false) }
  }

  const openEditPhone = (phone: UserPhone) => {
    const { countryValue, localNumber } = parsePhoneByCountry(phone.phone)
    setEditingPhone(phone); setEditingCountry(countryValue)
    phoneForm.reset({ phone: localNumber, network: phone.network }); setIsPhoneModalOpen(true)
  }

  const openEditAppId = (appId: UserAppId) => {
    setEditingAppId(appId); appIdForm.reset({ user_app_id: appId.user_app_id, app: appId.app?.toString() || "" }); setIsAppIdModalOpen(true)
  }

  const ModalBase = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">{children}</div>
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Numéros & IDs</h1>
          <p className="text-xs text-muted-foreground">Gérez vos informations de transaction</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-muted border border-border">
        {(["phones", "betIds"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "phones" ? `Numéros (${userPhones.length})` : `IDs de pari (${userAppIds.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : activeTab === "phones" ? (
        <div className="space-y-2.5">
          <button
            onClick={() => { setEditingPhone(null); phoneForm.reset(); setIsPhoneModalOpen(true) }}
            className="w-full py-3.5 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm font-medium flex items-center justify-center gap-2 hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter un numéro
          </button>
          {userPhones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-border/60 bg-card text-center">
              <Smartphone className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Aucun numéro enregistré</p>
            </div>
          ) : userPhones.map((phone) => (
            <div key={phone.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{formatPhoneNumberForDisplay(phone.phone)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{networks.find(n => n.id === phone.network)?.name || "Réseau"}</p>
              </div>
              <button onClick={() => openEditPhone(phone)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setDeleteTarget({ type: "phone", id: phone.id })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          <button
            onClick={() => { setEditingAppId(null); appIdForm.reset(); setIsAppIdModalOpen(true) }}
            className="w-full py-3.5 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm font-medium flex items-center justify-center gap-2 hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter un ID de pari
          </button>
          {userAppIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-border/60 bg-card text-center">
              <Smartphone className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Aucun ID enregistré</p>
            </div>
          ) : userAppIds.map((appId) => (
            <div key={appId.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground font-mono">{appId.user_app_id}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{appId.app_details?.name || platforms.find(p => p.id === appId.app)?.name || "Plateforme"}</p>
              </div>
              <button onClick={() => openEditAppId(appId)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setDeleteTarget({ type: "appId", id: appId.id })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Phone Modal */}
      {isPhoneModalOpen && (
        <ModalBase onClose={() => { setIsPhoneModalOpen(false); setEditingPhone(null); phoneForm.reset() }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
            <h2 className="text-base font-semibold text-foreground">{editingPhone ? "Modifier" : "Ajouter"} un numéro</h2>
            <button onClick={() => { setIsPhoneModalOpen(false); setEditingPhone(null); phoneForm.reset() }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Numéro</label>
              <div className="flex gap-2">
                <select
                  value={editingPhone ? editingCountry : selectedCountry}
                  onChange={e => editingPhone ? setEditingCountry(e.target.value) : setSelectedCountry(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-border bg-muted/40 text-foreground outline-none text-sm w-24"
                >
                  {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.prefix}</option>)}
                </select>
                <input {...phoneForm.register("phone")} placeholder="07 12 34 56 78" className={inputCls} />
              </div>
              {phoneForm.formState.errors.phone && <p className="text-xs text-red-500 mt-1">{phoneForm.formState.errors.phone.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Réseau</label>
              <select {...phoneForm.register("network", { valueAsNumber: true })} defaultValue={editingPhone?.network || ""} className={selectCls}>
                <option value="">Choisir un réseau</option>
                {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
              {phoneForm.formState.errors.network && <p className="text-xs text-red-500 mt-1">{phoneForm.formState.errors.network.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingPhone ? "Modifier" : "Ajouter")}
            </button>
          </form>
        </ModalBase>
      )}

      {/* App ID Modal */}
      {isAppIdModalOpen && (
        <ModalBase onClose={() => { setIsAppIdModalOpen(false); setEditingAppId(null); appIdForm.reset() }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
            <h2 className="text-base font-semibold text-foreground">{editingAppId ? "Modifier" : "Ajouter"} un ID</h2>
            <button onClick={() => { setIsAppIdModalOpen(false); setEditingAppId(null); appIdForm.reset() }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={appIdForm.handleSubmit(handleAppIdSubmit)} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Plateforme</label>
              <select {...appIdForm.register("app")} defaultValue={editingAppId?.app?.toString() || ""} className={selectCls}>
                <option value="">Choisir une plateforme</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {appIdForm.formState.errors.app && <p className="text-xs text-red-500 mt-1">{appIdForm.formState.errors.app.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ID de pari</label>
              <input {...appIdForm.register("user_app_id")} placeholder="Votre ID" className={inputCls} />
              {appIdForm.formState.errors.user_app_id && <p className="text-xs text-red-500 mt-1">{appIdForm.formState.errors.user_app_id.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting || isSearching} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              {isSubmitting || isSearching ? <><Loader2 className="w-4 h-4 animate-spin" />{isSearching ? "Recherche..." : ""}</> : (editingAppId ? "Modifier" : "Ajouter")}
            </button>
          </form>
        </ModalBase>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-5 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 mx-auto mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Supprimer?</p>
            <p className="text-xs text-muted-foreground mb-5">Cette action est irréversible.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-11 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleDelete} className="flex-1 h-11 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm BetId Modal */}
      {isConfirmModalOpen && searchResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 mx-auto mb-4">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-base font-semibold text-foreground text-center mb-4">Utilisateur trouvé</p>
            <div className="rounded-xl bg-muted/50 border border-border/60 p-3.5 mb-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Nom</span>
                <span className="font-medium text-foreground">{searchResult.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono font-medium text-foreground">{searchResult.userId}</span>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => { setIsConfirmModalOpen(false); setPendingBetId(null); setSearchResult(null) }} disabled={isSubmitting} className="flex-1 h-11 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleConfirmAddBetId} disabled={isSubmitting} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-5 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 mx-auto mb-4">
              <X className="w-5 h-5" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Erreur</p>
            <p className="text-sm text-muted-foreground mb-5">{errorMessage}</p>
            <button onClick={() => { setIsErrorModalOpen(false); setErrorMessage("") }} className="w-full h-11 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted transition-colors">Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}
