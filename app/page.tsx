"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Logo } from "@/components/logo"

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="surface-hero grid-overlay relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="absolute inset-x-0 top-10 mx-auto h-px w-3/4 bg-white/20" />
      <div className="absolute left-[-8rem] top-16 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute bottom-10 right-[-6rem] h-72 w-72 rounded-full bg-blue-200/15 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950/35 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_45%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <div className="page-header-eyebrow border-white/20 bg-white/10 text-white/85">
          Nouvelle plateforme
        </div>

        <div className="space-y-5 flex flex-col items-center">
          <Logo variant="full" iconSize={56} className="text-white" />
          <div className="space-y-3 mt-4">
            <h1 className="page-title text-balance text-white">Initialisation de votre espace transaction</h1>
            <p className="mx-auto max-w-xl text-sm text-white/72 sm:text-base">
              Nous préparons votre session et synchronisons les informations nécessaires pour continuer.
            </p>
          </div>
        </div>

        <div className="surface-panel w-full max-w-md rounded-[2rem] border-white/15 bg-white/10 px-6 py-7 text-left shadow-horizon-xl">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
              <div className="h-10 w-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Connexion à la plateforme</p>
              <p className="mt-1 text-sm text-white/65">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
