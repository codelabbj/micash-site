"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ConfirmationDialog } from "@/components/transaction/confirmation-dialog"
import { PlatformStep } from "@/components/transaction/steps/platform-step"
import { BetIdStep } from "@/components/transaction/steps/bet-id-step"
import { NetworkStep } from "@/components/transaction/steps/network-step"
import { PhoneStep } from "@/components/transaction/steps/phone-step"
import { AmountStep } from "@/components/transaction/steps/amount-step"
import { transactionApi, settingsApi } from "@/lib/api-client"
import type { Platform, UserAppId, Network, UserPhone, Transaction } from "@/lib/types"
import { toast } from "react-hot-toast"
import { extractTimeErrorMessage } from "@/lib/utils"
import { ChevronLeft, Copy, X, Loader2, ArrowDownToLine, Check } from "lucide-react"
import Link from "next/link"
import { TransactionSummaryDialog } from "@/components/transaction/transaction-summary-dialog"

/* ── step meta ── */
const STEPS = [
  { label: "Plateforme" },
  { label: "ID Pari" },
  { label: "Réseau" },
  { label: "Téléphone" },
  { label: "Montant" },
]

/* ── Step indicator ── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {Array.from({ length: total }).map((_, i) => {
        const done    = i < current - 1
        const active  = i === current - 1
        const pending = i > current - 1
        return (
          <div key={i} className="flex items-center flex-1">
            <div className={`relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ring-2 ${
              done    ? "bg-emerald-500 text-white ring-emerald-500/20" :
              active  ? "ring-primary/25 text-white" :
              "bg-muted text-muted-foreground ring-transparent"
            }`}
              style={active ? { background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" } : undefined}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-[2px] mx-1 rounded-full transition-all duration-500 ${i < current - 1 ? "bg-emerald-400" : "bg-border"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function DepositPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 5

  const [pendingTransaction,   setPendingTransaction]   = useState<Transaction | null>(null)
  const [isPendingCheckDone,   setIsPendingCheckDone]   = useState(false)
  const [isPendingDialogOpen,  setIsPendingDialogOpen]  = useState(false)

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId,    setSelectedBetId]    = useState<UserAppId | null>(null)
  const [selectedNetwork,  setSelectedNetwork]  = useState<Network | null>(null)
  const [selectedPhone,    setSelectedPhone]    = useState<UserPhone | null>(null)
  const [amount,           setAmount]           = useState(0)

  const [isConfirmationOpen,         setIsConfirmationOpen]         = useState(false)
  const [isSubmitting,               setIsSubmitting]               = useState(false)
  const [isTransactionLinkModalOpen, setIsTransactionLinkModalOpen] = useState(false)
  const [transactionLink,            setTransactionLink]            = useState<string | null>(null)
  const [isNetworkUssdModalOpen,     setIsNetworkUssdModalOpen]     = useState(false)
  const [networkUssdCode,            setNetworkUssdCode]            = useState<string | null>(null)
  const [networkMerchantPhone,       setNetworkMerchantPhone]       = useState<string | null>(null)

  if (!user) { router.push("/login"); return null }

  useEffect(() => {
    const check = async () => {
      try {
        const lastTrans = await transactionApi.getLastTransaction()
        if (lastTrans && lastTrans.status === "pending" && lastTrans.type_trans === "deposit") {
          setPendingTransaction(lastTrans); setIsPendingDialogOpen(true)
        }
      } catch (e: any) { if (e?.originalError?.response?.status !== 404) console.error(e) }
      finally { setIsPendingCheckDone(true) }
    }
    check()
  }, [])

  const handlePostFinalization = async (data: any) => {
    if (data?.transaction_link) { setTransactionLink(data.transaction_link); setIsTransactionLinkModalOpen(true); return }
    const handled = await handleNetworkUssdFlow(amount)
    if (!handled) router.push("/dashboard")
  }

  const handleCancelPending = async (ref: string) => {
    try { await transactionApi.cancelTransaction(ref); toast.success("Transaction annulée"); setIsPendingDialogOpen(false); setPendingTransaction(null) }
    catch (e: any) { toast.error(e?.originalError?.response?.data?.error || e?.message || "Erreur lors de l'annulation"); throw e }
  }

  const handleFinalizePending = async (ref: string) => {
    try { const t = await transactionApi.finalizeTransaction(ref); setIsPendingDialogOpen(false); setPendingTransaction(null); await handlePostFinalization(t) }
    catch (e) { throw e }
  }

  const handleNext = () => currentStep < totalSteps ? setCurrentStep(s => s + 1) : setIsConfirmationOpen(true)
  const handlePrev = () => currentStep > 1 && setCurrentStep(s => s - 1)

  const attemptDialer = (code: string) => {
    try { const a = Object.assign(document.createElement("a"), { href: `tel:${code}`, style: "display:none" }); document.body.appendChild(a); a.click(); setTimeout(() => document.body.contains(a) && document.body.removeChild(a), 100) } catch {}
  }

  const handleNetworkUssdFlow = async (amt: number) => {
    if (!selectedNetwork?.deposit_api || selectedNetwork.deposit_api.toLowerCase() !== "connect") return false
    const name = selectedNetwork.name?.toLowerCase()
    if (name !== "moov" && name !== "orange") return false
    try {
      const s = await settingsApi.get()
      const bf = selectedNetwork.country_code?.toLowerCase() === "bf"
      let phone: string | null = null, code: string | null = null
      if (name === "moov") {
        phone = bf ? s.bf_moov_marchand_phone : (s.moov_merchant_phone || s.moov_marchand_phone)
        if (!phone) return false
        code = `*155*2*1*${phone}*${Math.max(1, Math.floor(amt * 0.99))}#`
      } else {
        if (selectedNetwork.payment_by_link) return false
        phone = bf ? s.bf_orange_marchand_phone : s.orange_marchand_phone
        if (!phone) return false
        code = `*144*2*1*${phone}*${amt}#`
      }
      if (phone && code) { setNetworkMerchantPhone(phone); setNetworkUssdCode(code); setIsNetworkUssdModalOpen(true); attemptDialer(code); return true }
      return false
    } catch { return false }
  }

  const handleConfirmTransaction = async () => {
    if (!selectedPlatform || !selectedBetId || !selectedNetwork || !selectedPhone) { toast.error("Données manquantes"); return }
    setIsSubmitting(true)
    try {
      const res = await transactionApi.createDeposit({ amount, phone_number: selectedPhone.phone, app: selectedPlatform.id, user_app_id: selectedBetId.user_app_id, network: selectedNetwork.id, source: "web" })
      setIsConfirmationOpen(false); toast.success("Dépôt initié!"); await handlePostFinalization(res)
    } catch (e: any) { toast.error(extractTimeErrorMessage(e) || "Erreur lors du dépôt") }
    finally { setIsSubmitting(false) }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <PlatformStep selectedPlatform={selectedPlatform} onSelect={setSelectedPlatform} onNext={handleNext} type="deposit" />
      case 2: return <BetIdStep selectedPlatform={selectedPlatform} selectedBetId={selectedBetId} onSelect={setSelectedBetId} onNext={handleNext} />
      case 3: return <NetworkStep selectedNetwork={selectedNetwork} onSelect={setSelectedNetwork} onNext={handleNext} type="deposit" />
      case 4: return <PhoneStep selectedNetwork={selectedNetwork} selectedPhone={selectedPhone} onSelect={setSelectedPhone} onNext={handleNext} />
      case 5: return <AmountStep amount={amount} setAmount={setAmount} withdriwalCode="" setWithdriwalCode={() => {}} selectedPlatform={selectedPlatform} selectedBetId={selectedBetId} selectedNetwork={selectedNetwork} selectedPhone={selectedPhone} type="deposit" onNext={handleNext} />
      default: return null
    }
  }

  if (!isPendingCheckDone) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Vérification en cours…</p>
      </div>
    </div>
  )

  return (
    <div className="pb-8">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <ArrowDownToLine className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Effectuer un dépôt</h1>
            <p className="text-xs text-muted-foreground">{STEPS[currentStep - 1]?.label}</p>
          </div>
        </div>
      </div>

      {/* ── Wizard shell ── */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-horizon ring-1 ring-slate-200/80 dark:ring-slate-800">

        {/* step indicator header */}
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

        {/* step content */}
        <div className="p-5">
          {renderStep()}
        </div>

        {/* back button */}
        {currentStep > 1 && (
          <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handlePrev}
              className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
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
        onConfirm={handleConfirmTransaction}
        transactionData={{ amount, phone_number: selectedPhone?.phone || "", app: selectedPlatform?.id || "", user_app_id: selectedBetId?.user_app_id || "", network: selectedNetwork?.id || 0 }}
        type="deposit"
        platformName={selectedPlatform?.name || ""}
        networkName={selectedNetwork?.public_name || ""}
        isLoading={isSubmitting}
      />

      {/* ── Transaction link modal ── */}
      {isTransactionLinkModalOpen && (
        <Modal>
          <div className="p-6 text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Finaliser la transaction</h3>
            <p className="text-sm text-muted-foreground">Vous allez être redirigé vers la page de paiement</p>
          </div>
          <div className="px-6 pb-6 grid grid-cols-2 gap-2.5">
            <button onClick={() => { setIsTransactionLinkModalOpen(false); setTransactionLink(null); router.push("/dashboard") }} className="h-11 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors">Annuler</button>
            <button onClick={() => { window.open(transactionLink!, "_blank", "noopener,noreferrer"); setIsTransactionLinkModalOpen(false); setTransactionLink(null); router.push("/dashboard") }} className="h-11 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(135deg,var(--gradient-start),var(--gradient-end))" }}>Continuer</button>
          </div>
        </Modal>
      )}

      {/* ── USSD modal ── */}
      {isNetworkUssdModalOpen && (
        <Modal>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
            <h3 className="text-base font-semibold text-foreground">Code USSD — {selectedNetwork?.public_name}</h3>
            <button onClick={() => { setIsNetworkUssdModalOpen(false); router.push("/dashboard") }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">Composez ce code USSD pour finaliser votre dépôt.</p>
            {networkMerchantPhone && (
              <div className="rounded-xl bg-muted border border-border/50 px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-1">Numéro marchand</p>
                <p className="font-mono font-semibold text-foreground">{networkMerchantPhone}</p>
              </div>
            )}
            {networkUssdCode && (
              <div className="flex gap-2">
                <input readOnly value={networkUssdCode} className="flex-1 h-11 px-3 rounded-xl border border-border bg-muted font-mono text-sm text-foreground outline-none" />
                <button onClick={async () => { try { await navigator.clipboard.writeText(networkUssdCode); toast.success("Copié") } catch { toast.error("Impossible") } }} className="h-11 w-11 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors flex-shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="px-5 pb-5">
            <button onClick={() => { setIsNetworkUssdModalOpen(false); router.push("/dashboard") }} className="w-full h-11 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg,var(--gradient-start),var(--gradient-end))" }}>
              J&apos;ai compris
            </button>
          </div>
        </Modal>
      )}

      {/* ── Pending dialog ── */}
      <TransactionSummaryDialog
        isOpen={isPendingDialogOpen}
        onClose={() => {}}
        transaction={pendingTransaction}
        onCancel={handleCancelPending}
        onFinalize={handleFinalizePending}
        isLoading={false}
        mode="pending"
      />
    </div>
  )
}

/* ── Shared modal wrapper ── */
function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 animate-in slide-in-from-bottom-2 sm:slide-in-from-bottom-0 duration-200">
        {children}
      </div>
    </div>
  )
}
