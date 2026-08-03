"use client"

import { useState } from "react"
import type { Platform, UserAppId, Network, UserPhone } from "@/lib/types"
import { formatPhoneNumberForDisplay } from "@/lib/utils"

interface AmountStepProps {
  amount: number
  setAmount: (amount: number) => void
  withdriwalCode: string
  setWithdriwalCode: (code: string) => void
  selectedPlatform: Platform | null
  selectedBetId: UserAppId | null
  selectedNetwork: Network | null
  selectedPhone: UserPhone | null
  type: "deposit" | "withdrawal"
  onNext: () => void
}

const inputCls = (err?: string) =>
  `w-full h-12 rounded-xl border text-foreground outline-none text-sm transition-all focus:ring-2 focus:ring-primary/10 px-3.5 ${
    err
      ? "border-red-400 bg-red-50/30 dark:bg-red-950/10 focus:border-red-400"
      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:border-primary focus:bg-white dark:focus:bg-slate-800"
  }`

export function AmountStep({
  amount, setAmount, withdriwalCode, setWithdriwalCode,
  selectedPlatform, selectedBetId, selectedNetwork, selectedPhone,
  type, onNext,
}: AmountStepProps) {
  const [errors, setErrors] = useState<{ amount?: string; code?: string }>({})

  if (!selectedPlatform || !selectedBetId || !selectedNetwork || !selectedPhone) return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm text-muted-foreground">Veuillez compléter les étapes précédentes</p>
    </div>
  )

  const isDeposit = type === "deposit"
  const minAmount = isDeposit ? selectedPlatform.minimun_deposit : selectedPlatform.minimun_with
  const maxAmount = isDeposit ? selectedPlatform.max_deposit    : selectedPlatform.max_win
  const networkMessage = isDeposit ? selectedNetwork.deposit_message : selectedNetwork.withdrawal_message
  const tutorialLink   = isDeposit ? selectedPlatform.deposit_tuto_link : selectedPlatform.withdrawal_tuto_link
  const accentGreen = isDeposit ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
  const accentBg    = isDeposit ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30" : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30"

  const validateAmount = (v: number) => {
    if (v <= 0) return "Le montant doit être supérieur à 0"
    if (v < minAmount) return `Minimum ${minAmount.toLocaleString()} FCFA`
    if (v > maxAmount) return `Maximum ${maxAmount.toLocaleString()} FCFA`
    return null
  }
  const validateCode = (c: string) => (!isDeposit && c.length < 4) ? "Minimum 4 caractères" : null

  const isValid = !validateAmount(amount) && (!(!isDeposit) || !validateCode(withdriwalCode)) && (isDeposit || withdriwalCode.length >= 4)

  const handleAmountChange = (v: string) => {
    const n = parseFloat(v) || 0
    setAmount(n)
    setErrors(prev => ({ ...prev, amount: validateAmount(n) || undefined }))
  }

  const handleCodeChange = (v: string) => {
    setWithdriwalCode(v)
    setErrors(prev => ({ ...prev, code: validateCode(v) || undefined }))
  }

  return (
    <div className="space-y-5">

      {/* Summary card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-[13px] font-semibold text-foreground">Résumé de la transaction</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { label: "Plateforme",  value: selectedPlatform.name },
            { label: "ID de pari",  value: selectedBetId.user_app_id,                mono: true },
            { label: "Réseau",      value: selectedNetwork.public_name },
            { label: "Téléphone",   value: formatPhoneNumberForDisplay(selectedPhone.phone), mono: true },
            ...(!isDeposit ? [{ label: "Moyen", value: "1xespece" }] : []),
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="text-[13px] text-muted-foreground flex-shrink-0">{label}</span>
              <span className={`text-[13px] font-medium text-foreground text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Network message */}
      {networkMessage?.trim() && (
        <div className={`rounded-xl border p-4 ${accentBg}`}>
          <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{networkMessage}</p>
        </div>
      )}

      {/* Amount input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-foreground/80">{isDeposit ? "Montant à déposer" : "Montant à retirer"}</p>
          {tutorialLink && (
            <a href={tutorialLink} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-primary hover:underline">
              {isDeposit ? "Comment déposer?" : "Comment retirer?"}
            </a>
          )}
        </div>

        <div className="relative">
          <input
            type="number"
            value={amount || ""}
            onChange={e => handleAmountChange(e.target.value)}
            placeholder={`${minAmount.toLocaleString()} – ${maxAmount.toLocaleString()}`}
            className={inputCls(errors.amount) + " text-base font-semibold pr-14"}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">FCFA</span>
        </div>

        {errors.amount ? (
          <p className="text-[11px] text-red-500 flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-red-500" />{errors.amount}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Min <span className="font-medium">{minAmount.toLocaleString()}</span> · Max <span className="font-medium">{maxAmount.toLocaleString()}</span> FCFA
          </p>
        )}

        {amount > 0 && !errors.amount && (
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${accentBg}`}>
            <span className="text-[13px] text-muted-foreground">Montant saisi</span>
            <span className={`text-xl font-bold tabular-nums ${accentGreen}`}>
              {amount.toLocaleString("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      {/* Withdrawal code */}
      {!isDeposit && (
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-foreground/80">Code de retrait</label>
          <input
            type="text"
            value={withdriwalCode}
            onChange={e => handleCodeChange(e.target.value)}
            placeholder="Entrez votre code de retrait"
            className={inputCls(errors.code) + " font-semibold"}
          />
          {errors.code && <p className="text-[11px] text-red-500 flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-red-500" />{errors.code}</p>}
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={onNext}
        disabled={!isValid}
        className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
        style={{ background: isValid ? `linear-gradient(135deg,${isDeposit ? "#10b981,#059669" : "#f59e0b,#ea580c"})` : undefined, backgroundColor: !isValid ? "var(--muted)" : undefined }}
      >
        Continuer
      </button>
    </div>
  )
}
