"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Info, Copy, Phone, Receipt, Calendar, User,
  CheckCircle2, XCircle, Loader2, Hash, ArrowDownToLine, ArrowUpFromLine,
  MessageCircleMore, Send,
} from "lucide-react"
import Link from "next/link"
import { transactionApi, networkApi, settingsApi } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { Transaction, Network } from "@/lib/types"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import toast from "react-hot-toast"

function TransactionDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const id = searchParams.get("id")

  const [transaction, setTransaction]   = useState<Transaction | null>(null)
  const [networks, setNetworks]         = useState<Network[]>([])
  const [whatsappPhone, setWhatsappPhone] = useState("")
  const [telegram, setTelegram]         = useState("")
  const [isLoading, setIsLoading]       = useState(true)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => { if (id) fetchData() }, [id])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Try session cache first
      let transactionData: Transaction | null = null
      try {
        const cached = sessionStorage.getItem("cached_transaction")
        if (cached) {
          const parsed = JSON.parse(cached)
          if (String(parsed.reference) === String(id) || String(parsed.id) === String(id)) {
            transactionData = parsed
          }
        }
      } catch {}

      if (!transactionData) {
        const res = await transactionApi.getHistory({ page: 1, page_size: 50 })
        transactionData = res.results.find(
          (t) => String(t.reference) === String(id) || String(t.id) === String(id)
        ) ?? null
        if (transactionData) {
          sessionStorage.setItem("cached_transaction", JSON.stringify(transactionData))
        } else {
          throw new Error("Transaction non trouvée.")
        }
      }

      const [networksData, settings] = await Promise.all([
        networkApi.getAll(),
        settingsApi.get(),
      ])
      setTransaction(transactionData)
      setNetworks(networksData)
      setWhatsappPhone(settings?.whatsapp_phone || "")
      setTelegram(settings?.telegram || "")
    } catch {
      setError("Erreur lors du chargement de la transaction")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copié!")
  }

  const formatDate = (dateString: string) => {
    try { return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: fr }) }
    catch { return dateString }
  }

  if (!id) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 gap-4">
      <p className="text-destructive text-sm">ID de transaction manquant</p>
      <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Retour</button>
    </div>
  )

  if (isLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  if (error || !transaction) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 gap-4">
      <p className="text-destructive text-sm">{error || "Transaction non trouvée"}</p>
      <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Retour</button>
    </div>
  )

  const network = networks.find((n) => n.id === transaction.network)
  const isDeposit = transaction.type_trans === "deposit"

  const statusConfig = (() => {
    const s = transaction.status.toLowerCase()
    if (["accept", "completed", "success"].includes(s))
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        label: "Accepté",
        message: "Transaction effectuée avec succès",
      }
    if (["error", "fail", "reject", "echec"].includes(s))
      return {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        color: "text-destructive",
        bg: "bg-destructive/10 border-destructive/20",
        label: "Échoué",
        message: "La transaction a échoué",
      }
    return {
      icon: <Info className="h-5 w-5 text-primary" />,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
      label: "En attente",
      message: "Transaction en cours de traitement",
    }
  })()

  /* ── Reusable detail row ── */
  const Row = ({
    icon,
    label,
    value,
    copyValue,
  }: {
    icon: React.ReactNode
    label: string
    value: React.ReactNode
    copyValue?: string
  }) => (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        {typeof value === "string"
          ? <p className="text-sm font-semibold text-foreground truncate">{value}</p>
          : value}
      </div>
      {copyValue && (
        <button
          onClick={() => handleCopy(copyValue)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )

  /* ── WhatsApp support message ── */
  const handleContactSupport = () => {
    const phone = whatsappPhone
    if (!phone) return toast.error("Support non disponible")
    const fmt = (d: string) => {
      const dt = new Date(d)
      return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
    }
    const transType = isDeposit ? "dépôt" : "retrait"
    const userName = user ? `${user.first_name} ${user.last_name}` : "Utilisateur"
    const msg =
      `Bonjour moi c'est ${userName}, j'ai besoin d'aide concernant mon ${transType}.\n` +
      `*Référence:* ${transaction.reference}\n` +
      `*Montant:* XOF ${transaction.amount.toLocaleString()}\n` +
      `*Date:* ${fmt(transaction.created_at)}\n` +
      `*Réseau:* ${network?.public_name || "N/A"}\n` +
      `*Téléphone:* ${transaction.phone_number}\n` +
      `*ID App:* ${transaction.user_app_id}\n` +
      `La capture du ${transType}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground leading-tight">Détails de la transaction</h1>
          <p className="text-xs text-muted-foreground">{isDeposit ? "Dépôt" : "Retrait"}</p>
        </div>
      </div>

      {/* Amount + status hero */}
      <div className="text-center py-2 space-y-1">
        <p className={`text-xs font-semibold uppercase tracking-widest ${statusConfig.color}`}>
          {statusConfig.label}
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
          {transaction.amount.toLocaleString()}
          <span className="text-xl font-bold text-muted-foreground ml-1">FCFA</span>
        </h2>
      </div>

      {/* Status banner */}
      <div className={`flex items-start gap-3 p-4 rounded-2xl border ${statusConfig.bg} animate-in zoom-in-95 duration-300`}>
        <div className="mt-0.5 shrink-0">{statusConfig.icon}</div>
        <div>
          <p className={`text-sm font-bold ${statusConfig.color} mb-0.5`}>Statut</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{statusConfig.message}</p>
          {transaction.error_message && (
            <p className="text-xs text-red-500 mt-1 leading-relaxed">{transaction.error_message}</p>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="px-4 pt-4 pb-1">
          <p className="text-sm font-bold text-foreground">Détails du paiement</p>
        </div>
        <div className="px-4 pb-4">

          {/* Type badge */}
          <div className="flex items-center gap-3 py-3 border-b border-border/50">
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
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Type</p>
              <p className="text-sm font-semibold text-foreground">{isDeposit ? "Dépôt" : "Retrait"}</p>
            </div>
          </div>

          {/* Application */}
          <Row
            icon={
              transaction.app_details?.image
                ? <img src={transaction.app_details.image} alt="" className="w-5 h-5 object-contain" />
                : <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                    <span className="text-primary-foreground text-[8px] font-bold">A</span>
                  </div>
            }
            label="Application"
            value={transaction.app_details?.name || transaction.app || "—"}
          />

          {/* Network */}
          <Row
            icon={
              network?.image
                ? <img src={network.image} alt="" className="w-5 h-5 object-contain" />
                : <Phone className="h-4 w-4 text-muted-foreground" />
            }
            label="Réseau"
            value={network?.public_name || "—"}
          />

          {/* Phone */}
          <Row
            icon={<Phone className="h-4 w-4 text-muted-foreground" />}
            label="Numéro"
            value={transaction.phone_number}
          />

          {/* Amount */}
          <Row
            icon={<span className="text-sm font-bold text-muted-foreground">₣</span>}
            label="Montant"
            value={`${transaction.amount.toLocaleString()} FCFA`}
          />

          {/* App ID */}
          {transaction.user_app_id && (
            <Row
              icon={<User className="h-4 w-4 text-primary" />}
              label={`${transaction.app_details?.name || "Application"} ID`}
              value={transaction.user_app_id}
            />
          )}

          {/* Withdrawal code */}
          {transaction.withdriwal_code && (
            <Row
              icon={<Hash className="h-4 w-4 text-muted-foreground" />}
              label="Code de retrait"
              value={transaction.withdriwal_code}
            />
          )}

          {/* Reference */}
          <Row
            icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
            label="Référence"
            value={<p className="text-xs font-mono text-foreground break-all">{transaction.reference}</p>}
            copyValue={transaction.reference}
          />

          {/* Date */}
          <Row
            icon={<Calendar className="h-4 w-4 text-primary" />}
            label="Date"
            value={formatDate(transaction.created_at)}
          />
        </div>
      </div>

      {/* Support contact */}
      {(whatsappPhone || telegram) && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-sm font-semibold text-foreground">Besoin d&apos;aide?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Contactez notre support en citant votre référence</p>
          </div>
          <div className="p-3 space-y-1">
            {whatsappPhone && (
              <button
                onClick={handleContactSupport}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-foreground">WhatsApp</span>
              </button>
            )}
            {telegram && (
              <a
                href={telegram.startsWith("http") ? telegram : `https://t.me/${telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#0088cc] flex items-center justify-center text-white flex-shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-foreground">Telegram</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Back to history */}
      <div className="flex justify-center pb-4">
        <Link
          href="/dashboard/history"
          className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          Voir l&apos;historique complet
        </Link>
      </div>
    </div>
  )
}

export default function TransactionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TransactionDetailContent />
    </Suspense>
  )
}
