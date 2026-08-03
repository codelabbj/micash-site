"use client"

import type React from "react"
import { getBrandConfig } from "@/lib/brand-config"
import { Logo } from "@/components/logo"
import { UserPlus, CreditCard, TrendingUp, CheckCircle2 } from "lucide-react"

/* ── "How it works" steps shown on the left panel ── */
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: UserPlus,
    title: "Créez votre compte",
    desc: "Inscrivez-vous en 2 minutes. Renseignez vos informations et choisissez un mot de passe sécurisé.",
  },
  {
    step: "02",
    icon: CreditCard,
    title: "Effectuez un dépôt",
    desc: "Sélectionnez votre plateforme de paris, votre réseau Mobile Money et le montant souhaité.",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Misez & retirez",
    desc: "Vos fonds sont crédités instantanément. Retirez vos gains quand vous voulez, directement sur votre mobile.",
  },
]

const TRUST_ITEMS = [
  "Transactions sécurisées SSL",
  "Support disponible 24h/24",
  "Aucun frais cachés",
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const brand = getBrandConfig()

  return (
    <div className="min-h-screen bg-background">

      {/* ── Mobile top bar ── */}
      <div className="lg:hidden px-5 pt-7 pb-4 flex items-center justify-between">
        <Logo variant="full" iconSize={30} />
      </div>

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[1fr_480px]">

        {/* ════════════════════════════════════════
            LEFT — brand & how-it-works panel
            (desktop only)
        ════════════════════════════════════════ */}
        <div className="hidden lg:flex surface-hero flex-col justify-between overflow-hidden relative p-12 xl:p-16">

          {/* decorative blobs */}
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />
          <div className="absolute -bottom-48 -right-24 h-[540px] w-[540px] rounded-full bg-black/10 blur-3xl pointer-events-none" />

          {/* dot grid */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }} />

          {/* logo */}
          <div className="relative z-10">
            <Logo variant="full" iconSize={42} className="text-white" />
          </div>

          {/* main content */}
          <div className="relative z-10 space-y-10 max-w-[420px]">

            {/* headline */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                {brand.name} · {brand.titleSuffix}
              </p>
              <h1 className="text-[2.4rem] font-bold text-white leading-[1.1] tracking-tight">
                La façon la plus<br />
                simple de gérer<br />
                <span className="text-white/50">vos paris.</span>
              </h1>
              <p className="text-[13px] text-white/55 leading-relaxed max-w-xs">
                Dépôts, retraits et coupons — tout centralisé, sécurisé et accessible depuis votre téléphone.
              </p>
            </div>

            {/* how it works */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35 mb-4">
                Comment ça marche
              </p>
              {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }, i) => (
                <div key={step} className="relative flex items-start gap-4">
                  {/* connector line */}
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="absolute left-[18px] top-[42px] w-[2px] h-[calc(100%+4px)] bg-white/[0.12]" />
                  )}
                  {/* step circle */}
                  <div className="relative flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white z-10">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-white/30 tabular-nums">{step}</span>
                      <p className="text-sm font-semibold text-white">{title}</p>
                    </div>
                    <p className="text-[12px] text-white/45 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* trust pills */}
            <div className="flex flex-wrap gap-2">
              {TRUST_ITEMS.map(item => (
                <div key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-[11px] font-medium text-white/60">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-white/40" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT — form panel
        ════════════════════════════════════════ */}
        <div className="flex flex-col items-center justify-center px-5 py-8 lg:px-10 lg:py-10 min-h-[calc(100vh-5rem)] lg:min-h-screen bg-background">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </div>

      </div>
    </div>
  )
}
