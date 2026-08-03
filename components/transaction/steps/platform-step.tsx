"use client"

import { useState, useEffect } from "react"
import { SafeImage } from "@/components/ui/safe-image"
import { Loader2, CheckCircle2, MapPin } from "lucide-react"
import { platformApi } from "@/lib/api-client"
import type { Platform } from "@/lib/types"
import { toast } from "react-hot-toast"

interface PlatformStepProps {
  selectedPlatform: Platform | null
  onSelect: (platform: Platform) => void
  onNext: () => void
  type: "deposit" | "withdrawal"
}

export function PlatformStep({ selectedPlatform, onSelect, onNext, type }: PlatformStepProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    platformApi.getAll(type)
      .then(data => setPlatforms(data.filter((p: Platform) => p.enable)))
      .catch(() => toast.error("Erreur lors du chargement des plateformes"))
      .finally(() => setIsLoading(false))
  }, [type])

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )

  if (platforms.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">Aucune plateforme disponible</p>
    </div>
  )

  return (
    <div className="space-y-2.5">
      <p className="text-[13px] text-muted-foreground mb-3">Sélectionnez la plateforme de paris</p>
      {platforms.map((platform) => {
        const isSelected = selectedPlatform?.id === platform.id
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => { onSelect(platform); setTimeout(onNext, 250) }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <SafeImage
              src={platform.image}
              alt={platform.name}
              className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
              fallbackText={platform.name.charAt(0).toUpperCase()}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{platform.name}</p>
              {(platform.city || platform.street) && (
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {[platform.city, platform.street].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-muted-foreground">
                  Min {platform.minimun_deposit.toLocaleString()} F
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-muted-foreground">
                  Max {platform.max_deposit.toLocaleString()} F
                </span>
              </div>
            </div>
            {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
