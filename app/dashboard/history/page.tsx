"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  Loader2, Search, RefreshCw, ArrowDownToLine, ArrowUpFromLine,
  Clock, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, History
} from "lucide-react"
import Link from "next/link"
import { transactionApi } from "@/lib/api-client"
import type { Transaction } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatPhoneNumberForDisplay } from "@/lib/utils"

export default function TransactionHistoryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accept" | "reject" | "timeout">("all")

  useEffect(() => { fetchTransactions() }, [currentPage, searchTerm, typeFilter, statusFilter])

  useEffect(() => {
    const handleFocus = () => fetchTransactions()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      const params: any = { page: currentPage, page_size: 10 }
      if (searchTerm) params.search = searchTerm
      if (typeFilter !== "all") params.type_trans = typeFilter
      if (statusFilter !== "all") params.status = statusFilter
      const data = await transactionApi.getHistory(params)
      setTransactions(data.results)
      setTotalCount(data.count)
      setTotalPages(Math.ceil(data.count / 10))
    } catch {
      toast.error("Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusConfig = (status: Transaction["status"]) => {
    const configs: Record<string, { icon: any; color: string; bg: string; label: string }> = {
      pending:      { icon: Clock,        color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-500/10",    label: "En attente" },
      accept:       { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", label: "Accepté" },
      init_payment: { icon: Clock,        color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-500/10",    label: "En attente" },
      error:        { icon: XCircle,      color: "text-red-600 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-500/10",        label: "Erreur" },
      reject:       { icon: XCircle,      color: "text-red-600 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-500/10",        label: "Rejeté" },
      timeout:      { icon: AlertCircle,  color: "text-slate-500 dark:text-slate-400",    bg: "bg-slate-100 dark:bg-slate-800/60",   label: "Expiré" },
    }
    return configs[status] || configs.timeout
  }

  if (!user) return null

  const handleRowClick = (transaction: Transaction) => {
    sessionStorage.setItem("cached_transaction", JSON.stringify(transaction))
    router.push(`/dashboard/history/detail?id=${transaction.reference}`)
  }

  return (
    <div className="space-y-5 pb-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground">Historique</h1>
          <p className="text-xs text-muted-foreground">{totalCount} transactions</p>
        </div>
        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par référence, numéro..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as any); setCurrentPage(1) }}
            className="flex-1 h-10 px-3 rounded-xl border border-border bg-card text-sm text-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 outline-none"
          >
            <option value="all">Tous types</option>
            <option value="deposit">Dépôts</option>
            <option value="withdrawal">Retraits</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1) }}
            className="flex-1 h-10 px-3 rounded-xl border border-border bg-card text-sm text-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 outline-none"
          >
            <option value="all">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="accept">Accepté</option>
            <option value="reject">Rejeté</option>
            <option value="timeout">Expiré</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <History className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Aucune transaction</p>
            <p className="text-xs text-muted-foreground mt-1">Vos transactions s'afficheront ici</p>
          </div>
        ) : (
          <div>
            {transactions.map((transaction, index) => {
              const statusConfig = getStatusConfig(transaction.status)
              const StatusIcon = statusConfig.icon
              const isDeposit = transaction.type_trans === "deposit"
              return (
                <div
                  key={transaction.id}
                  onClick={() => handleRowClick(transaction)}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer ${
                    index !== transactions.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                    isDeposit
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}>
                    {isDeposit ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground truncate">#{transaction.reference}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium flex-shrink-0 ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {transaction.app_details?.name || transaction.app} · {formatPhoneNumberForDisplay(transaction.phone_number)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {format(new Date(transaction.created_at), "dd MMM yyyy, HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${
                      isDeposit ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {isDeposit ? "+" : "−"}{transaction.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">FCFA</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
            <p className="text-xs text-muted-foreground">Page {currentPage} / {totalPages}</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-card"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-card"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
