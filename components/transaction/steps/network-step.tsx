"use client"

import { useState, useEffect } from "react"
import { SafeImage } from "@/components/ui/safe-image"
import { Loader2, CheckCircle2 } from "lucide-react"
import { networkApi } from "@/lib/api-client"
import type { Network } from "@/lib/types"
import { TRANSACTION_TYPES } from "@/lib/constants"

interface NetworkStepProps {
  selectedNetwork: Network | null
  onSelect: (network: Network) => void
  onNext: () => void
  type: "deposit" | "withdrawal"
}

export function NetworkStep({ selectedNetwork, onSelect, onNext, type }: NetworkStepProps) {
  const [networks, setNetworks] = useState<Network[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    networkApi.getAll(type)
      .then(data => setNetworks(data.filter((n: Network) =>
        type === TRANSACTION_TYPES.DEPOSIT ? n.active_for_deposit : n.active_for_with
      )))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [type])

  const isDeposit = type === TRANSACTION_TYPES.DEPOSIT

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )

  if (networks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">
        Aucun réseau disponible pour {isDeposit ? "les dépôts" : "les retraits"}
      </p>
    </div>
  )

  return (
    <div className="space-y-2.5">
      <p className="text-[13px] text-muted-foreground mb-3">Sélectionnez votre opérateur mobile</p>
      {networks.map((network) => {
        const isSelected = selectedNetwork?.id === network.id
        return (
          <button
            key={network.id}
            type="button"
            onClick={() => { onSelect(network); setTimeout(onNext, 250) }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
              isSelected
                ? isDeposit
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm"
                  : "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <SafeImage
              src={network.image}
              alt={network.name}
              className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
              fallbackText={network.public_name.charAt(0).toUpperCase()}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{network.public_name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{network.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {network.active_for_deposit && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${
                    isDeposit ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                  }`}>Dépôt</span>
                )}
                {network.active_for_with && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${
                    !isDeposit ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                  }`}>Retrait</span>
                )}
              </div>
            </div>
            {isSelected && (
              <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isDeposit ? "text-emerald-500" : "text-amber-500"}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}
