"use client"

import { useState } from "react"
import { Loader2, ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react"
import { toast } from "react-hot-toast"
import { formatPhoneNumberForDisplay } from "@/lib/utils"

interface TransactionData {
  amount: number
  phone_number: string
  app: string
  user_app_id: string
  network: number
  withdriwal_code?: string
}

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  transactionData: TransactionData
  type: "deposit" | "withdrawal"
  platformName: string
  networkName: string
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen, onClose, onConfirm,
  transactionData, type, platformName, networkName,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDeposit = type === "deposit"

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm()
    } catch {
      // errors handled in onConfirm
    } finally {
      setIsSubmitting(false)
    }
  }

  const rows = [
    { label: "Plateforme",  value: platformName },
    { label: "ID de pari",  value: transactionData.user_app_id,                    mono: true },
    { label: "Réseau",      value: networkName },
    { label: "Téléphone",   value: formatPhoneNumberForDisplay(transactionData.phone_number), mono: true },
    ...(!isDeposit ? [{ label: "Moyen", value: "1xespece" }] : []),
    ...(!isDeposit && transactionData.withdriwal_code ? [{ label: "Code retrait", value: transactionData.withdriwal_code, mono: true }] : []),
  ]

  const accentGreen = "text-emerald-600 dark:text-emerald-400"
  const accentAmber = "text-amber-600 dark:text-amber-400"
  const accentBg    = isDeposit
    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30"
    : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 animate-in slide-in-from-bottom-2 sm:slide-in-from-bottom-0 duration-200">

        {/* header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${
            isDeposit ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
          }`}>
            {isDeposit ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">
              Confirmer {isDeposit ? "le dépôt" : "le retrait"}
            </h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Vérifiez les détails avant de valider</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting || isLoading} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* amount highlight */}
        <div className={`mx-5 mt-4 flex items-center justify-between px-4 py-3 rounded-xl border ${accentBg}`}>
          <span className="text-[13px] text-muted-foreground font-medium">Montant</span>
          <span className={`text-2xl font-bold tabular-nums ${isDeposit ? accentGreen : accentAmber}`}>
            {transactionData.amount.toLocaleString("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 })}
          </span>
        </div>

        {/* details */}
        <div className="mx-5 mt-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {rows.map(({ label, value, mono }, i) => (
            <div key={label} className={`flex items-center justify-between gap-4 px-4 py-2.5 ${i !== rows.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}`}>
              <span className="text-[12px] text-muted-foreground flex-shrink-0">{label}</span>
              <span className={`text-[13px] font-medium text-foreground text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* actions */}
        <div className="px-5 py-5 grid grid-cols-2 gap-2.5">
          <button
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            className="h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-55 shadow-sm"
            style={{ background: isDeposit ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#f59e0b,#ea580c)" }}
          >
            {(isSubmitting || isLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider"}
          </button>
        </div>
      </div>
    </div>
  )
}
