"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Edit, Trash2, CheckCircle2, AlertCircle, X, Check } from "lucide-react"
import { userAppIdApi } from "@/lib/api-client"
import type { UserAppId, Platform } from "@/lib/types"
import { toast } from "react-hot-toast"

interface BetIdStepProps {
  selectedPlatform: Platform | null
  selectedBetId: UserAppId | null
  onSelect: (betId: UserAppId) => void
  onNext: () => void
}

/* ── shared bottom-sheet modal ── */
function SheetModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 animate-in slide-in-from-bottom-2 sm:slide-in-from-bottom-0 duration-200">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputCls = "w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/10 px-3.5"

export function BetIdStep({ selectedPlatform, selectedBetId, onSelect, onNext }: BetIdStepProps) {
  const [betIds, setBetIds] = useState<UserAppId[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [showAddModal,     setShowAddModal]     = useState(false)
  const [showEditModal,    setShowEditModal]     = useState(false)
  const [showConfirmModal, setShowConfirmModal]  = useState(false)
  const [showErrorModal,   setShowErrorModal]    = useState(false)
  const [showDeleteModal,  setShowDeleteModal]   = useState(false)

  const [newBetId,       setNewBetId]       = useState("")
  const [editingBetId,   setEditingBetId]   = useState<UserAppId | null>(null)
  const [deletingBetId,  setDeletingBetId]  = useState<UserAppId | null>(null)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [isSearching,    setIsSearching]    = useState(false)
  const [isEditMode,     setIsEditMode]     = useState(false)
  const [errorMessage,   setErrorMessage]   = useState("")
  const [searchResult,   setSearchResult]   = useState<{ name: string; userId: number; currencyId: number } | null>(null)
  const [pendingBetId,   setPendingBetId]   = useState<{ appId: string; betId: string } | null>(null)

  useEffect(() => {
    if (!selectedPlatform) return
    setIsLoading(true)
    userAppIdApi.getByPlatform(selectedPlatform.id)
      .then(setBetIds)
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setIsLoading(false))
  }, [selectedPlatform])

  if (!selectedPlatform) return (
    <div className="flex items-center justify-center py-10 text-center">
      <p className="text-sm text-muted-foreground">Veuillez d'abord sélectionner une plateforme</p>
    </div>
  )

  const searchAndValidate = async (appId: string, betId: string) => {
    setIsSearching(true)
    try {
      const res = await userAppIdApi.searchUser(appId, betId)
      if (res.UserId === 0) { showErr("Utilisateur non trouvé avec cet ID."); return false }
      if (res.CurrencyId !== 27) { showErr("Cet utilisateur n'utilise pas la devise XOF."); return false }
      setSearchResult({ name: res.Name, userId: res.UserId, currencyId: res.CurrencyId })
      setPendingBetId({ appId, betId })
      return true
    } catch (e: any) {
      const d = e.response?.data
      showErr(d?.user_app_id?.[0] || d?.app?.[0] || d?.detail || d?.error || d?.message || "Erreur lors de la recherche")
      return false
    } finally { setIsSearching(false) }
  }

  const showErr = (msg: string) => { setErrorMessage(msg); setShowAddModal(false); setShowEditModal(false); setShowErrorModal(true) }

  const handleAdd = async () => {
    if (!newBetId.trim()) return
    const ok = await searchAndValidate(selectedPlatform.id, newBetId.trim())
    if (ok) { setShowAddModal(false); setIsEditMode(false); setShowConfirmModal(true) }
  }

  const handleEdit = async () => {
    if (!newBetId.trim() || !editingBetId) return
    if (editingBetId.user_app_id === newBetId.trim()) {
      setIsSubmitting(true)
      try {
        const updated = await userAppIdApi.update(editingBetId.id, newBetId.trim(), selectedPlatform.id)
        setBetIds(prev => prev.map(b => b.id === editingBetId.id ? updated : b))
        setShowEditModal(false); setNewBetId(""); setEditingBetId(null)
        toast.success("ID modifié!")
      } catch { toast.error("Erreur") }
      finally { setIsSubmitting(false) }
      return
    }
    const ok = await searchAndValidate(selectedPlatform.id, newBetId.trim())
    if (ok) { setShowEditModal(false); setIsEditMode(true); setShowConfirmModal(true) }
  }

  const handleConfirm = async () => {
    if (!pendingBetId) return
    setIsSubmitting(true)
    try {
      if (isEditMode && editingBetId) {
        const updated = await userAppIdApi.update(editingBetId.id, pendingBetId.betId, pendingBetId.appId)
        setBetIds(prev => prev.map(b => b.id === editingBetId.id ? updated : b))
        toast.success("ID modifié!")
      } else {
        const created = await userAppIdApi.create(pendingBetId.betId, pendingBetId.appId)
        setBetIds(prev => [...prev, created])
        toast.success("ID ajouté!")
        onSelect(created); setTimeout(onNext, 250)
      }
      setShowConfirmModal(false); setPendingBetId(null); setSearchResult(null); setNewBetId(""); setEditingBetId(null)
    } catch (e: any) {
      const d = e.response?.data
      toast.error(d?.user_app_id?.[0] || d?.detail || d?.error || d?.message || "Erreur")
      setShowConfirmModal(false); setPendingBetId(null); setSearchResult(null)
    } finally { setIsSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deletingBetId) return
    try {
      await userAppIdApi.delete(deletingBetId.id)
      setBetIds(prev => prev.filter(b => b.id !== deletingBetId.id))
      toast.success("ID supprimé!")
      setShowDeleteModal(false); setDeletingBetId(null)
    } catch { toast.error("Erreur") }
  }

  return (
    <>
      <div className="space-y-2.5">
        <p className="text-[13px] text-muted-foreground mb-3">Sélectionnez ou ajoutez votre identifiant de compte</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {betIds.map((betId) => {
              const isSelected = selectedBetId?.id === betId.id
              return (
                <div
                  key={betId.id}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30"
                  }`}
                  onClick={() => { onSelect(betId); setTimeout(onNext, 250) }}
                >
                  <p className="flex-1 font-mono text-sm font-semibold text-foreground truncate">{betId.user_app_id}</p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setEditingBetId(betId); setNewBetId(betId.user_app_id); setShowEditModal(true) }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  ><Edit className="w-3.5 h-3.5" /></button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setDeletingBetId(betId); setShowDeleteModal(true) }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                </div>
              )
            })}

            {betIds.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center gap-3">
                <p className="text-sm text-muted-foreground">Aucun ID de pari enregistré</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setNewBetId(""); setShowAddModal(true) }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-[13px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              {betIds.length === 0 ? "Ajouter un ID de pari" : "Ajouter un autre ID"}
            </button>
          </>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <SheetModal title="Ajouter un ID de pari" onClose={() => setShowAddModal(false)}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-foreground/80 mb-1.5">ID de pari</label>
              <input value={newBetId} onChange={e => setNewBetId(e.target.value)} placeholder="Entrez votre ID" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => setShowAddModal(false)} className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors">Annuler</button>
              <button
                onClick={handleAdd}
                disabled={!newBetId.trim() || isSearching || isSubmitting}
                className="h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-55"
                style={{ background: "linear-gradient(135deg,var(--gradient-start),var(--gradient-end))" }}
              >
                {isSearching ? <><Loader2 className="w-4 h-4 animate-spin" /> Recherche…</> : "Ajouter"}
              </button>
            </div>
          </div>
        </SheetModal>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <SheetModal title="Modifier l'ID de pari" onClose={() => { setShowEditModal(false); setEditingBetId(null); setNewBetId("") }}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-foreground/80 mb-1.5">ID de pari</label>
              <input value={newBetId} onChange={e => setNewBetId(e.target.value)} placeholder="Entrez votre ID" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { setShowEditModal(false); setEditingBetId(null); setNewBetId("") }} className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors">Annuler</button>
              <button
                onClick={handleEdit}
                disabled={!newBetId.trim() || isSearching || isSubmitting}
                className="h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-55"
                style={{ background: "linear-gradient(135deg,var(--gradient-start),var(--gradient-end))" }}
              >
                {isSearching ? <><Loader2 className="w-4 h-4 animate-spin" /> Recherche…</> : isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Modification…</> : "Modifier"}
              </button>
            </div>
          </div>
        </SheetModal>
      )}

      {/* Confirm modal */}
      {showConfirmModal && searchResult && (
        <SheetModal title={isEditMode ? "Confirmer la modification" : "Confirmer l'ajout"} onClose={() => { setShowConfirmModal(false); setPendingBetId(null); setSearchResult(null) }}>
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">Utilisateur trouvé</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-medium text-foreground">{searchResult.name}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">ID utilisateur</span>
                  <span className="font-mono font-medium text-foreground">{searchResult.userId}</span>
                </div>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">Voulez-vous {isEditMode ? "modifier" : "ajouter"} cet ID?</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { setShowConfirmModal(false); setPendingBetId(null); setSearchResult(null) }} disabled={isSubmitting} className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50">Annuler</button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-55"
                style={{ background: "linear-gradient(135deg,var(--gradient-start),var(--gradient-end))" }}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer"}
              </button>
            </div>
          </div>
        </SheetModal>
      )}

      {/* Error modal */}
      {showErrorModal && (
        <SheetModal title="Erreur" onClose={() => { setShowErrorModal(false); setErrorMessage("") }}>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700 dark:text-red-400">{errorMessage}</p>
            </div>
            <button onClick={() => { setShowErrorModal(false); setErrorMessage("") }} className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors">Fermer</button>
          </div>
        </SheetModal>
      )}

      {/* Delete confirm modal */}
      {showDeleteModal && (
        <SheetModal title="Supprimer cet ID?" onClose={() => { setShowDeleteModal(false); setDeletingBetId(null) }}>
          <div className="p-5 space-y-4">
            <p className="text-[13px] text-muted-foreground">Cette action est irréversible.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { setShowDeleteModal(false); setDeletingBetId(null) }} className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleDelete} className="h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">Supprimer</button>
            </div>
          </div>
        </SheetModal>
      )}
    </>
  )
}
