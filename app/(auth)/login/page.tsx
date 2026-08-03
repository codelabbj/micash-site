"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api-client"
import { toast } from "react-hot-toast"
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, Download } from "lucide-react"
import { setupNotifications } from "@/lib/fcm-helper"
import { getBrandConfig } from "@/lib/brand-config"

/* ── schemas ── */
const loginSchema = z.object({
  email_or_phone: z.string().min(1, "Email ou téléphone requis"),
  password: z.string().min(6, "Minimum 6 caractères"),
})
type LoginFormData = z.infer<typeof loginSchema>

const forgotEmailSchema    = z.object({ email: z.string().email("Email invalide") })
const forgotOtpSchema      = z.object({ otp: z.string().min(4, "Code invalide") })
const forgotPasswordSchema = z.object({
  new_password:         z.string().min(6).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  confirm_new_password: z.string(),
}).refine(d => d.new_password === d.confirm_new_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_new_password"],
})
type ForgotEmailFormData    = z.infer<typeof forgotEmailSchema>
type ForgotOtpFormData      = z.infer<typeof forgotOtpSchema>
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

/* ── shared primitives ── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-foreground/80">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-red-500 flex-shrink-0" />{error}</p>}
    </div>
  )
}

function Input({ icon, rightSlot, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; rightSlot?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">{icon}</span>}
      <input
        {...props}
        className={`w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/10 ${icon ? "pl-10" : "pl-3.5"} ${rightSlot ? "pr-11" : "pr-3.5"} ${className}`}
      />
      {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
    </div>
  )
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-55 active:scale-[0.98] shadow-md shadow-primary/20"
      style={{ background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 55%, var(--gradient-end) 100%)" }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  )
}

function BackBtn({ onClick, label = "Retour" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-muted-foreground font-medium flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <ArrowLeft className="w-3.5 h-3.5" />{label}
    </button>
  )
}

export default function LoginPage() {
  const brand = getBrandConfig()
  const router = useRouter()
  const { login } = useAuth()

  const [isLoading,     setIsLoading]     = useState(false)
  const [showPass,      setShowPass]      = useState(false)
  const [rememberMe,    setRememberMe]    = useState(false)
  const [isForgot,      setIsForgot]      = useState(false)
  const [forgotStep,    setForgotStep]    = useState(1)
  const [forgotEmail,   setForgotEmail]   = useState("")
  const [forgotOtp,     setForgotOtp]     = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [showNewPass,   setShowNewPass]   = useState(false)
  const [showConfPass,  setShowConfPass]  = useState(false)

  const mainForm     = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
  const emailForm    = useForm<ForgotEmailFormData>({ resolver: zodResolver(forgotEmailSchema) })
  const otpForm      = useForm<ForgotOtpFormData>({ resolver: zodResolver(forgotOtpSchema) })
  const passForm     = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) })

  useEffect(() => {
    const e = localStorage.getItem("remembered_email")
    const p = localStorage.getItem("remembered_password")
    if (e && p) { mainForm.setValue("email_or_phone", e); mainForm.setValue("password", p); setRememberMe(true) }
  }, [])

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      if (rememberMe) { localStorage.setItem("remembered_email", data.email_or_phone); localStorage.setItem("remembered_password", data.password) }
      else { localStorage.removeItem("remembered_email"); localStorage.removeItem("remembered_password") }
      const res = await authApi.login(data.email_or_phone, data.password)
      login(res.access, res.refresh, res.data)
      toast.success("Connexion réussie!")
      try { if (res.data?.id) { await new Promise(r => setTimeout(r, 100)); await setupNotifications(res.data.id) } } catch {}
      await new Promise(r => setTimeout(r, 300))
      router.push("/dashboard")
    } catch {}
    finally { setIsLoading(false) }
  }

  const onForgotEmail = async (d: ForgotEmailFormData) => {
    setForgotLoading(true)
    try { await authApi.sendOtp(d.email); setForgotEmail(d.email); toast.success("Code envoyé"); setForgotStep(2) }
    catch {}
    finally { setForgotLoading(false) }
  }

  const onForgotOtp = (d: ForgotOtpFormData) => { setForgotOtp(d.otp); setForgotStep(3) }

  const onForgotPass = async (d: ForgotPasswordFormData) => {
    setForgotLoading(true)
    try {
      await authApi.resetPassword({ otp: forgotOtp, new_password: d.new_password, confirm_new_password: d.confirm_new_password })
      toast.success("Mot de passe réinitialisé!")
      resetForgot()
    } catch {}
    finally { setForgotLoading(false) }
  }

  const resetForgot = () => { setIsForgot(false); setForgotStep(1); setForgotEmail(""); setForgotOtp(""); emailForm.reset(); otpForm.reset(); passForm.reset() }

  /* ── heading per state ── */
  const heading = isForgot
    ? [, "Mot de passe oublié", "Vérification", "Nouveau mot de passe"][forgotStep] as string
    : "Connexion"
  const sub = isForgot
    ? ["", "Entrez votre email pour recevoir un code", "Saisissez le code reçu par email", "Créez un nouveau mot de passe sécurisé"][forgotStep]
    : "Accédez à votre espace de transactions"

  return (
    <div className="space-y-4">

      {/* ── APK strip ── */}
      <a href={brand.apkUrl} download={brand.apkFileName}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl surface-hero group hover:opacity-90 transition-opacity"
      >
        <div className="h-9 w-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Télécharger l'app Android</p>
          <p className="text-[11px] text-white/55 mt-0.5">APK officiel · {brand.name}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors flex-shrink-0" />
      </a>

      {/* ── Card ── */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-horizon ring-1 ring-slate-200/80 dark:ring-slate-800">

        {/* top gradient line */}
        <div className="h-[3px]" style={{ background: "linear-gradient(90deg, var(--gradient-start), var(--gradient-end))" }} />

        <div className="px-6 py-7">

          {/* heading */}
          <div className="mb-6">
            {!isForgot ? (
              <>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Bon retour 👋</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Connectez-vous pour accéder à vos dépôts, retraits et coupons.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{heading}</h2>
                <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>
              </>
            )}
          </div>

          {/* ── Main login form ── */}
          {!isForgot ? (
            <form onSubmit={mainForm.handleSubmit(onLogin)} className="space-y-4">
              <Field label="Email ou Téléphone" error={mainForm.formState.errors.email_or_phone?.message}>
                <Input
                  type="text"
                  placeholder="votre@email.com ou +229…"
                  icon={<Mail className="w-4 h-4" />}
                  disabled={isLoading}
                  {...mainForm.register("email_or_phone")}
                />
              </Field>

              <Field label="Mot de passe" error={mainForm.formState.errors.password?.message}>
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  rightSlot={
                    <button type="button" onClick={() => setShowPass(!showPass)} disabled={isLoading} className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  disabled={isLoading}
                  {...mainForm.register("password")}
                />
              </Field>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative h-4 w-4 flex-shrink-0">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} disabled={isLoading} className="peer sr-only" />
                    <div className="h-4 w-4 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                  <span className="text-[13px] text-muted-foreground">Se souvenir</span>
                </label>
                <button type="button" onClick={() => setIsForgot(true)} disabled={isLoading} className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors">
                  Mot de passe oublié?
                </button>
              </div>

              <div className="pt-1 space-y-2.5">
                <SubmitBtn loading={isLoading}>Accéder à mon espace <ArrowRight className="w-4 h-4" /></SubmitBtn>
                <p className="text-center text-[11px] text-muted-foreground/60">
                  🔒 Connexion chiffrée SSL · Vos données sont protégées
                </p>
              </div>
            </form>

          ) : forgotStep === 1 ? (
            /* ── step 1: email ── */
            <form onSubmit={emailForm.handleSubmit(onForgotEmail)} className="space-y-4">
              <Field label="Adresse email" error={emailForm.formState.errors.email?.message}>
                <Input type="email" placeholder="votre@email.com" icon={<Mail className="w-4 h-4" />} disabled={forgotLoading} {...emailForm.register("email")} />
              </Field>
              <SubmitBtn loading={forgotLoading}>Envoyer le code <ArrowRight className="w-4 h-4" /></SubmitBtn>
              <BackBtn onClick={resetForgot} label="Retour à la connexion" />
            </form>

          ) : forgotStep === 2 ? (
            /* ── step 2: otp ── */
            <form onSubmit={otpForm.handleSubmit(onForgotOtp)} className="space-y-4">
              <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-center text-[13px] text-muted-foreground">
                Code envoyé à <span className="font-semibold text-foreground">{forgotEmail}</span>
              </div>
              <Field label="Code de vérification" error={otpForm.formState.errors.otp?.message}>
                <input
                  type="text"
                  placeholder="· · · · · ·"
                  {...otpForm.register("otp")}
                  disabled={forgotLoading}
                  className="w-full h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-center font-mono text-2xl tracking-[0.6em] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/10 placeholder:tracking-normal"
                />
              </Field>
              <SubmitBtn loading={forgotLoading}>Vérifier <ArrowRight className="w-4 h-4" /></SubmitBtn>
              <BackBtn onClick={() => setForgotStep(1)} />
            </form>

          ) : (
            /* ── step 3: new password ── */
            <form onSubmit={passForm.handleSubmit(onForgotPass)} className="space-y-4">
              <Field label="Nouveau mot de passe" error={passForm.formState.errors.new_password?.message}>
                <Input
                  type={showNewPass ? "text" : "password"}
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  rightSlot={<button type="button" onClick={() => setShowNewPass(!showNewPass)} className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors">{showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
                  disabled={forgotLoading}
                  {...passForm.register("new_password")}
                />
              </Field>
              <Field label="Confirmer" error={passForm.formState.errors.confirm_new_password?.message}>
                <Input
                  type={showConfPass ? "text" : "password"}
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  rightSlot={<button type="button" onClick={() => setShowConfPass(!showConfPass)} className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors">{showConfPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
                  disabled={forgotLoading}
                  {...passForm.register("confirm_new_password")}
                />
              </Field>
              <SubmitBtn loading={forgotLoading}>Réinitialiser</SubmitBtn>
              <BackBtn onClick={() => setForgotStep(2)} />
            </form>
          )}
        </div>

        {/* footer */}
        {!isForgot && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 px-6 py-4 text-center">
            <p className="text-[13px] text-muted-foreground">
              Pas encore de compte?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Créer un compte
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
