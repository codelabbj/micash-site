"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ConfirmationDialog } from "@/components/transaction/confirmation-dialog"
import { PlatformStep } from "@/components/transaction/steps/platform-step"
import { BetIdStep } from "@/components/transaction/steps/bet-id-step"
import { NetworkStep } from "@/components/transaction/steps/network-step"
import { PhoneStep } from "@/components/transaction/steps/phone-step"
import { AmountStep } from "@/components/transaction/steps/amount-step"
import { transactionApi } from "@/lib/api-client"
import type { Platform, UserAppId, Network, UserPhone } from "@/lib/types"
import { toast } from "react-hot-toast"
import { extractTimeErrorMessage } from "@/lib/utils"
import { ChevronLeft, ArrowUpFromLine, Check } from "lucide-react"
import Link from "next/link"

const STEPS = [
  { label: "Plateforme" },
  { label: "ID Pari" },
  { label: "Réseau" },
  { label: "Téléphone" },
  { label: "Montant" },
]

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {Array.from({ length: total }).map((_, i) => {
        const done   = i < current - 1
        const active = i === current - 1
        return (
          <div key={i} className="flex items-center flex-1">
            <div
              className={`relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ring-2 ${
                done   ? "bg-amber-500 text-white ring-amber-500/20" :
                active ? "text-white ring-amber-500/25" :
                "bg-muted text-muted-foreground ring-transparent"
              }`}
              style={active ? { background: "linear-gradient(135deg,#f59e0b,#ea580c)" } : undefined}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-[2px] mx-1 rounded-full transition-all duration-500 ${i < current - 1 ? "bg-amber-400" : "bg-border"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function WithdrawalPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 5

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId,    setSelectedBetId]    = useState<UserAppId | null>(null)
  const [selectedNetwork,  setSelectedNetwork]  = useState<Network | null>(null)
  const [selectedPhone,    setSelectedPhone]    = useState<UserPhone | null>(null)
  const [amount,           setAmount]           = useState(0)
  const [withdriwalCode,   setWithdriwalCode]   = useState("")

  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isSubmitting,       setIsSubmitting]       = useState(false)

  if (!user) { router.push("/login"); return null }

  const handleNext = () => currentStep < totalSteps ? setCurrentStep(s => s + 1) : setIsConfirmationOpen(true)
  const handlePrev = () => currentStep > 1 && setCurrentStep(s => s - 1)

  const handleConfirm = async () => {
    if (!selectedPlatform || !selectedBetId || !selectedNetwork || !selectedPhone) { toast.error("Données manquantes"); return }
    setIsSubmitting(true)
    try {
      await transactionApi.createWithdrawal({ amount, phone_number: selectedPhone.phone, app: selectedPlatform.id, user_app_id: selectedBetId.user_app_id, network: selectedNetwork.id, withdriwal_code: withdriwalCode, source: "web" })
      toast.success("Retrait initié!")
      router.push("/dashboard")
    } catch (e: any) { toast.error(extractTimeErrorMessage(e) || "Erreur lors du retrait") }
    finally { setIsSubmitting(false) }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <PlatformStep selectedPlatform={selectedPlatform} onSelect={setSelectedPlatform} onNext={handleNext} type="withdrawal" />
      case 2: return <BetIdStep selectedPlatform={selectedPlatform} selectedBetId={selectedBetId} onSelect={setSelectedBetId} onNext={handleNext} />
      case 3: return <NetworkStep selectedNetwork={selectedNetwork} onSelect={setSelectedNetwork} onNext={handleNext} type="withdrawal" />
      case 4: return <PhoneStep selectedNetwork={selectedNetwork} selectedPhone={selectedPhone} onSelect={setSelectedPhone} onNext={handleNext} />
      case 5: return <AmountStep amount={amount} setAmount={setAmount} withdriwalCode={withdriwalCode} setWithdriwalCode={setWithdriwalCode} selectedPlatform={selectedPlatform} selectedBetId={selectedBetId} selectedNetwork={selectedNetwork} selectedPhone={selectedPhone} type="withdrawal" onNext={handleNext} />
      default: return null
    }
  }

  return (
    <div className="pb-8">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
            <ArrowUpFromLine className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Effectuer un retrait</h1>
            <p className="text-xs text-muted-foreground">{STEPS[currentStep - 1]?.label}</p>
          </div>
        </div>
      </div>

      {/* ── Wizard shell ── */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-horizon ring-1 ring-slate-200/80 dark:ring-slate-800">

        {/* step indicator */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <StepDots current={currentStep} total={totalSteps} />
          <div className="flex items-center justify-between mt-3">
            <p className="text-[12px] font-medium text-muted-foreground">
              Étape <span className="text-foreground font-semibold">{currentStep}</span> sur {totalSteps} — {STEPS[currentStep - 1]?.label}
            </p>
            <p className="text-[11px] text-muted-foreground/60">
              {Math.round(((currentStep - 1) / totalSteps) * 100)}% complété
            </p>
          </div>
        </div>

        {/* content */}
        <div className="p-5">
          {renderStep()}
        </div>

        {/* back */}
        {currentStep > 1 && (
          <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-800">
            <button onClick={handlePrev} className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              Étape précédente
            </button>
          </div>
        )}
      </div>

      {/* ── Confirmation dialog ── */}
      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleConfirm}
        transactionData={{ amount, phone_number: selectedPhone?.phone || "", app: selectedPlatform?.id || "", user_app_id: selectedBetId?.user_app_id || "", network: selectedNetwork?.id || 0, withdriwal_code: withdriwalCode }}
        type="withdrawal"
        platformName={selectedPlatform?.name || ""}
        networkName={selectedNetwork?.public_name || ""}
        isLoading={isSubmitting}
      />
    </div>
  )
}
