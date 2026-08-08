"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { authApi, settingsApi } from "@/lib/api-client"
import { toast } from "react-hot-toast"
import {
  Loader2, Eye, EyeOff, User, Mail, Phone, Lock, Gift,
  ArrowRight, ArrowLeft, Check, CheckCircle2,
} from "lucide-react"
import { getBrandConfig } from "@/lib/brand-config"
import { GoogleButton } from "@/components/google-button"

/* ─────────────────────────────────────────
   Schemas
───────────────────────────────────────── */
const step1Schema = z.object({
  first_name: z.string().min(2, "Au moins 2 caractères"),
  last_name:  z.string().min(2, "Au moins 2 caractères"),
  email:      z.string().email("Email invalide"),
  phone:      z.string().min(8, "Numéro invalide"),
})
const step2Schema = z.object({
  password:    z.string().min(6, "Au moins 6 caractères"),
  re_password: z.string().min(6, "Confirmation requise"),
  referrer_code: z.string().optional(),
}).refine(d => d.password === d.re_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["re_password"],
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

/* ─────────────────────────────────────────
   Shared primitives
───────────────────────────────────────── */
function Field({ label, error, hint, children }: {
  label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-foreground/80">{label}</label>
      {children}
      {hint}
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <span className="inline-block h-1 w-1 rounded-full bg-red-500 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

function Input({ icon, rightSlot, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode; rightSlot?: React.ReactNode
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        {...props}
        className={`w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/10 ${icon ? "pl-10" : "pl-3.5"} ${rightSlot ? "pr-11" : "pr-3.5"} ${className}`}
      />
      {rightSlot && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Step indicator
───────────────────────────────────────── */
const STEP_LABELS = ["Vos coordonnées", "Sécurité", "Terminé"]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEP_LABELS.map((label, i) => {
        const done   = i < current - 1
        const active = i === current - 1
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 border-2 ${
                done   ? "bg-emerald-500 border-emerald-500 text-white" :
                active ? "border-primary text-primary bg-primary/5" :
                         "border-slate-200 dark:border-slate-700 text-muted-foreground/50"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium leading-none whitespace-nowrap transition-colors ${
                active ? "text-foreground" : "text-muted-foreground/50"
              }`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-[2px] mx-2 mb-5 rounded-full transition-all duration-500 ${
                i < current - 1 ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function SignupPage() {
  const brand  = getBrandConfig()
  const router = useRouter()

  const [step,              setStep]              = useState(1)   // 1 | 2 | 3
  const [isLoading,         setIsLoading]         = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [showPass,          setShowPass]          = useState(false)
  const [showConfirm,       setShowConfirm]       = useState(false)
  const [referralEnabled,   setReferralEnabled]   = useState(false)

  // persisted step-1 data to merge on final submit
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)

  useEffect(() => {
    settingsApi.get()
      .then(s => setReferralEnabled(s?.referral_bonus === true))
      .catch(() => setReferralEnabled(false))
      .finally(() => setIsLoadingSettings(false))
  }, [])

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) })

  const password  = form2.watch("password", "")
  const pwChecks  = [
    { ok: password.length >= 6,   label: "6+ caractères" },
    { ok: /[A-Z]/.test(password), label: "Majuscule" },
    { ok: /[a-z]/.test(password), label: "Minuscule" },
    { ok: /[0-9]/.test(password), label: "Chiffre" },
  ]
  const strength      = pwChecks.filter(c => c.ok).length
  const strengthColor = ["bg-border", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-500"][strength]

  /* step 1 → save & advance */
  const onStep1 = (data: Step1Data) => {
    setStep1Data(data)
    setStep(2)
  }

  /* step 2 → submit everything */
  const onStep2 = async (data: Step2Data) => {
    if (!step1Data) return
    setIsLoading(true)
    try {
      const payload: any = {
        first_name:  step1Data.first_name,
        last_name:   step1Data.last_name,
        email:       step1Data.email,
        phone:       step1Data.phone,
        password:    data.password,
        re_password: data.re_password,
      }
      if (referralEnabled && data.referrer_code) payload.referrer_code = data.referrer_code
      await authApi.register(payload)
      toast.success("Compte créé avec succès!")
      setStep(3)
    } catch {}
    finally { setIsLoading(false) }
  }

  if (isLoadingSettings) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-7 h-7 text-primary animate-spin" />
    </div>
  )

  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-horizon ring-1 ring-slate-200/80 dark:ring-slate-800">

      {/* top gradient bar */}
      <div className="h-[3px]" style={{ background: "linear-gradient(90deg, var(--gradient-start), var(--gradient-end))" }} />

      <div className="px-6 pt-7 pb-7">

        {/* heading */}
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {step === 1 ? "Créer votre compte" : step === 2 ? "Sécurisez votre accès" : "Bienvenue!"}
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {step === 1 && "Renseignez vos informations personnelles pour démarrer."}
            {step === 2 && "Choisissez un mot de passe fort pour protéger votre compte."}
            {step === 3 && `Votre compte ${brand.name} est prêt. Vous pouvez maintenant vous connecter.`}
          </p>
        </div>

        {/* step indicator — hidden on success screen */}
        {step < 3 && <StepIndicator current={step} />}

        {/* ══════════════════
            STEP 1 — Identity
        ══════════════════ */}
        {step === 1 && (
          <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" error={form1.formState.errors.first_name?.message}>
                <Input type="text" placeholder="Jean" icon={<User className="w-4 h-4" />} {...form1.register("first_name")} />
              </Field>
              <Field label="Nom" error={form1.formState.errors.last_name?.message}>
                <Input type="text" placeholder="Dupont" icon={<User className="w-4 h-4" />} {...form1.register("last_name")} />
              </Field>
            </div>

            <Field label="Adresse email" error={form1.formState.errors.email?.message}>
              <Input type="email" placeholder="votre@email.com" icon={<Mail className="w-4 h-4" />} {...form1.register("email")} />
            </Field>

            <Field label="Numéro de téléphone" error={form1.formState.errors.phone?.message}>
              <Input type="tel" placeholder="+229 01 02 03 04 05" icon={<Phone className="w-4 h-4" />} {...form1.register("phone")} />
            </Field>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 55%, var(--gradient-end) 100%)" }}
              >
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <GoogleButton mode="register" />

          </form>
        )}

        {/* ══════════════════
            STEP 2 — Security
        ══════════════════ */}
        {step === 2 && (
          <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">

            <Field
              label="Mot de passe"
              error={form2.formState.errors.password?.message}
              hint={password ? (
                <div className="pt-1 space-y-2">
                  <div className="flex gap-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength ? strengthColor : "bg-border"}`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {pwChecks.map(({ ok, label }) => (
                      <div key={label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}`}>
                        <Check className={`w-3 h-3 flex-shrink-0 transition-opacity ${ok ? "opacity-100" : "opacity-0"}`} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : undefined}
            >
              <Input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                rightSlot={
                  <button type="button" onClick={() => setShowPass(!showPass)} className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                disabled={isLoading}
                {...form2.register("password")}
              />
            </Field>

            <Field label="Confirmer le mot de passe" error={form2.formState.errors.re_password?.message}>
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                rightSlot={
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                disabled={isLoading}
                {...form2.register("re_password")}
              />
            </Field>

            {referralEnabled && (
              <Field label="Code de parrainage" error={form2.formState.errors.referrer_code?.message}>
                <Input
                  type="text"
                  placeholder="Optionnel"
                  icon={<Gift className="w-4 h-4" />}
                  disabled={isLoading}
                  {...form2.register("referrer_code")}
                />
              </Field>
            )}

            <div className="pt-1 space-y-2.5">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-55 active:scale-[0.98] shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 55%, var(--gradient-end) 100%)" }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Créer mon compte <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] text-muted-foreground font-medium flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Étape précédente
              </button>
            </div>

          </form>
        )}

        {/* ══════════════════
            STEP 3 — Success
        ══════════════════ */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center py-4 space-y-6">

            {/* animated success icon */}
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
            </div>

            <div className="space-y-2 max-w-[280px]">
              <p className="text-base font-semibold text-foreground">Compte créé avec succès!</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Vous pouvez maintenant vous connecter et commencer à effectuer des dépôts et retraits.
              </p>
            </div>

            {/* summary pill */}
            {step1Data && (
              <div className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3 text-left space-y-1.5">
                <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-semibold mb-2">Votre compte</p>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-medium text-foreground">{step1Data.first_name} {step1Data.last_name}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground truncate max-w-[180px]">{step1Data.email}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/login")}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 55%, var(--gradient-end) 100%)" }}
            >
              Se connecter maintenant <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* footer — hidden on success */}
      {step < 3 && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 px-6 py-4 text-center">
          <p className="text-[13px] text-muted-foreground">
            Déjà un compte?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
