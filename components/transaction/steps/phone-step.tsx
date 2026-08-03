"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Edit, Trash2, CheckCircle2, X } from "lucide-react"
import { phoneApi } from "@/lib/api-client"
import type { UserPhone, Network } from "@/lib/types"
import { toast } from "react-hot-toast"
import { formatPhoneNumberForDisplay } from "@/lib/utils"

const COUNTRY_OPTIONS = [
  { label: "Burkina Faso", value: "bf", prefix: "+226" },
  { label: "Sénégal",       value: "sn", prefix: "+221" },
  { label: "Bénin",         value: "bj", prefix: "+229" },
  { label: "Côte d'Ivoire", value: "ci", prefix: "+225" },
]
const DEFAULT_COUNTRY = "bj"

const buildIntlPhone = (input: string, countryValue: string) => {
  const c = COUNTRY_OPTIONS.find(o => o.value === countryValue)
  if (!c) return input.trim()
  let s = input.trim().replace(/\s+/g, "")
  if (!s) return c.prefix
  if (s.startsWith(c.prefix)) s = s.slice(c.prefix.length)
  else {
    const n = c.prefix.replace("+", "")
    if (s.startsWith(n)) s = s.slice(n.length)
  }
  if (s.startsWith("+")) s = s.slice(1)
  return `${c.prefix}${s}`
}

const parsePhone = (phone: string) => {
  const s = phone.replace(/\s+/g, "")
  for (const c of COUNTRY_OPTIONS) {
    if (s.startsWith(c.prefix)) return { countryValue: c.value, localNumber: s.slice(c.prefix.length) }
  }
  return { countryValue: DEFAULT_COUNTRY, localNumber: s }
}

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

interface PhoneStepProps {
  selectedNetwork: Network | null
  selectedPhone: UserPhone | null
  onSelect: (phone: UserPhone) => void
  onNext: () => void
}

export function PhoneStep({ selectedNetwork, selectedPhone, onSelect, onNext }: PhoneStepProps) {
  const [phones,         setPhones]         = useState<UserPhone[]>([])
  const [isLoading,      setIsLoading]      = useState(false)
  const [showAddModal,   setShowAddModal]   = useState(false)
  const [showEditModal,  setShowEditModal]  = useState(false)
  const [showDeleteModal,setShowDeleteModal]= useState(false)
  const [editingPhone,   setEditingPhone]   = useState<UserPhone | null>(null)
  const [deletingPhone,  setDeletingPhone]  = useState<UserPhone | null>(null)
  const [newPhone,       setNewPhone]       = useState("")
  const [country,        setCountry]        = useState(DEFAULT_COUNTRY)
  const [editCountry,    setEditCountry]    = useState(DEFAULT_COUNTRY)
  const [isSubmitting,   setIsSubmitting]   = useState(false)

  useEffect(() => {
    if (!selectedNetwork) return
    setIsLoading(true)
    phoneApi.getAll(selectedNetwork.id)
      .then(setPhones)
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setIsLoading(false))
  }, [selectedNetwork])

  if (!selectedNetwork) return (
    <div className="flex items-center justify-center py-10 text-center">
      <p className="text-sm text-muted-foreground">Veuillez d'abord sélectionner un réseau</p>
    </div>
  )

  const handleAdd = async () => {
    if (!newPhone.trim()) return
    setIsSubmitting(true)
    try {
      const phone = buildIntlPhone(newPhone, country)
      const created = await phoneApi.create(phone, selectedNetwork.id)
      setPhones(prev => [...prev, created])
      toast.success("Numéro ajouté!")
      setShowAddModal(false); setNewPhone(""); setCountry(DEFAULT_COUNTRY)
      onSelect(created); setTimeout(onNext, 250)
    } catch { toast.error("Erreur") }
    finally { setIsSubmitting(false) }
  }

  const handleEdit = async () => {
    if (!newPhone.trim() || !editingPhone) return
    setIsSubmitting(true)
    try {
      const phone = buildIntlPhone(newPhone, editCountry)
      const updated = await phoneApi.update(editingPhone.id, phone, selectedNetwork.id)
      setPhones(prev => prev.map(p => p.id === editingPhone.id ? updated : p))
      toast.success("Numéro modifié!")
      setShowEditModal(false); setNewPhone(""); setEditingPhone(null)
    } catch { toast.error("Erreur") }
    finally { setIsSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deletingPhone) return
    try {
      await phoneApi.delete(deletingPhone.id)
      setPhones(prev => prev.filter(p => p.id !== deletingPhone.id))
      toast.success("Numéro supprimé!")
      setShowDeleteModal(false); setDeletingPhone(null)
    } catch { toast.error("Erreur") }
  }

  const openEdit = (phone: UserPhone) => {
    const { countryValue, localNumber } = parsePhone(phone.phone)
    setEditingPhone(phone); setEditCountry(countryValue); setNewPhone(localNumber); setShowEditModal(true)
  }

  const inputCls = "flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/10 px-3.5"
  const selectCls = "h-11 w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 px-3 flex-shrink-0"

  return (
    <>
      <div className="space-y-2.5">
        <p className="text-[13px] text-muted-foreground mb-3">Sélectionnez ou ajoutez votre numéro Mobile Money</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {phones.map((phone) => {
              const isSelected = selectedPhone?.id === phone.id
              return (
                <div
                  key={phone.id}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30"
                  }`}
                  onClick={() => { onSelect(phone); setTimeout(onNext, 250) }}
                >
                  <p className="flex-1 font-mono text-sm font-semibold text-foreground truncate">
                    {formatPhoneNumberForDisplay(phone.phone)}
                  </p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); openEdit(phone) }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  ><Edit className="w-3.5 h-3.5" /></button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setDeletingPhone(phone); setShowDeleteModal(true) }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                </div>
              )
            })}

            {phones.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center gap-3">
                <p className="text-sm text-muted-foreground">Aucun numéro enregistré pour ce réseau</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setNewPhone(""); setCountry(DEFAULT_COUNTRY); setShowAddModal(true) }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-[13px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              {phones.length === 0 ? "Ajouter un numéro" : "Ajouter un autre numéro"}
            </button>
          </>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <SheetModal title="Ajouter un numéro" onClose={() => setShowAddModal(false)}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-foreground/80 mb-1.5">Numéro de téléphone</label>
              <div className="flex gap-2">
                <select value={country} onChange={e => setCountry(e.target.value)} className={selectCls}>
                  {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.prefix}</option>)}
                </select>
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="07 12 34 56 78" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => setShowAddModal(false)} className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors">Annuler</button>
              <button
                onClick={handleAdd}
                disabled={!newPhone.trim() || isSubmitting}
                className="h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-55"
                style={{ background: "linear-gradient(135deg,var(--gradient-start),var(--gradient-end))" }}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter"}
              </button>
            </div>
          </div>
        </SheetModal>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <SheetModal title="Modifier le numéro" onClose={() => { setShowEditModal(false); setEditingPhone(null); setNewPhone("") }}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-foreground/80 mb-1.5">Numéro de téléphone</label>
              <div className="flex gap-2">
                <select value={editCountry} onChange={e => setEditCountry(e.target.value)} className={selectCls}>
                  {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.prefix}</option>)}
                </select>
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="07 12 34 56 78" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { setShowEditModal(false); setEditingPhone(null); setNewPhone("") }} className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors">Annuler</button>
              <button
                onClick={handleEdit}
                disabled={!newPhone.trim() || isSubmitting}
                className="h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-55"
                style={{ background: "linear-gradient(135deg,var(--gradient-start),var(--gradient-end))" }}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Modifier"}
              </button>
            </div>
          </div>
        </SheetModal>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <SheetModal title="Supprimer ce numéro?" onClose={() => { setShowDeleteModal(false); setDeletingPhone(null) }}>
          <div className="p-5 space-y-4">
            <p className="text-[13px] text-muted-foreground">Cette action est irréversible.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { setShowDeleteModal(false); setDeletingPhone(null) }} className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleDelete} className="h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">Supprimer</button>
            </div>
          </div>
        </SheetModal>
      )}
    </>
  )
}
