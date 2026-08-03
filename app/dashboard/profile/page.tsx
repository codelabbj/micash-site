"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Loader2, Eye, EyeOff, Lock, ChevronLeft, Calendar,
  Gift, LogOut, Copy, Phone, Mail, User, Save, Check,
  ShieldCheck, Pencil,
} from "lucide-react"
import Link from "next/link"
import { authApi } from "@/lib/api-client"
import { ThemeToggle } from "@/components/theme-toggle"
import type { User as UserType } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { getBrandConfig } from "@/lib/brand-config"

/* ── schemas ── */
const profileSchema = z.object({
  first_name: z.string().min(1, "Requis"),
  last_name:  z.string().min(1, "Requis"),
  email:      z.string().email("Email invalide"),
  phone:      z.string().min(8, "Numéro invalide"),
})
const passwordSchema = z.object({
  old_password:         z.string().min(1, "Requis"),
  new_password:         z.string().min(6, "Min 6 caractères"),
  confirm_new_password: z.string().min(1, "Requis"),
}).refine(d => d.new_password === d.confirm_new_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_new_password"],
})
type ProfileFormData  = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

/* ── shared field primitive (same as auth pages) ── */
function Field({ label, error, hint, children }: {
  label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-foreground/75">{label}</label>
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

function Input({ icon, rightSlot, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode; rightSlot?: React.ReactNode
}) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/55 pointer-events-none">{icon}</span>}
      <input
        {...props}
        className={`w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/10 ${icon ? "pl-10" : "pl-3.5"} ${rightSlot ? "pr-11" : "pr-3.5"} disabled:opacity-60 disabled:cursor-not-allowed`}
      />
      {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
    </div>
  )
}

/* ── gradient CTA button ── */
function GradientBtn({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean; children: React.ReactNode
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-55 active:scale-[0.98] shadow-sm"
      style={{ background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 55%, var(--gradient-end) 100%)" }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  )
}

/* ── section card wrapper ── */
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-800 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

/* ── section header inside a card ── */
function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   Main component
═══════════════════════════════════════ */
export default function ProfilePage() {
  const brand = getBrandConfig()
  const router = useRouter()
  const { user: authUser, login, logout } = useAuth()
  const [profile,   setProfile]   = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving,  setIsSaving]  = useState(false)
  const [isChangingPass, setIsChangingPass] = useState(false)
  const [copied,    setCopied]    = useState(false)

  /* password visibility toggles */
  const [showOld,     setShowOld]     = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  /* password strength */
  const [newPassValue, setNewPassValue] = useState("")
  const pwChecks = [
    { ok: newPassValue.length >= 6,   label: "6+ car." },
    { ok: /[A-Z]/.test(newPassValue), label: "Majuscule" },
    { ok: /[a-z]/.test(newPassValue), label: "Minuscule" },
    { ok: /[0-9]/.test(newPassValue), label: "Chiffre" },
  ]
  const strength = pwChecks.filter(c => c.ok).length
  const strengthColor = ["bg-border", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-500"][strength]

  const profileForm = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) })
  const passForm    = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (!authUser) { router.push("/login"); return }
    loadProfile()
  }, [authUser, router])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const data = await authApi.getProfile()
      setProfile(data)
      profileForm.reset({
        first_name: data.first_name || "",
        last_name:  data.last_name  || "",
        email:      data.email      || "",
        phone:      data.phone      || "",
      })
    } catch { toast.error("Erreur lors du chargement") }
    finally   { setIsLoading(false) }
  }

  const onSaveProfile = async (data: ProfileFormData) => {
    setIsSaving(true)
    try {
      const updated = await authApi.updateProfile(data)
      setProfile(updated)
      if (authUser) login(localStorage.getItem("access_token") || "", localStorage.getItem("refresh_token") || "", updated)
      toast.success("Profil mis à jour!")
    } catch { toast.error("Erreur lors de la mise à jour") }
    finally   { setIsSaving(false) }
  }

  const onChangePassword = async (data: PasswordFormData) => {
    setIsChangingPass(true)
    try {
      await authApi.changePassword({ old_password: data.old_password, new_password: data.new_password, confirm_new_password: data.confirm_new_password })
      toast.success("Mot de passe modifié!")
      passForm.reset()
      setNewPassValue("")
    } catch { toast.error("Erreur lors de la modification") }
    finally   { setIsChangingPass(false) }
  }

  const copyReferral = () => {
    if (!profile?.referral_code) return
    navigator.clipboard.writeText(profile.referral_code)
    setCopied(true)
    toast.success("Code copié!")
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── loading state ── */
  if (!authUser) return null
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  )

  /* derived */
  const initials = `${profile?.first_name?.[0] || ""}${profile?.last_name?.[0] || ""}`.toUpperCase()

  return (
    <div className="space-y-5 pb-8">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground transition-colors shadow-sm">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground leading-tight">Mon profil</h1>
          <p className="text-xs text-muted-foreground">Gérez votre compte</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-muted-foreground shadow-sm">
          <ThemeToggle />
        </div>
      </div>

      {/* ════════════════════════════
          Identity hero card
      ════════════════════════════ */}
      <div className="overflow-hidden rounded-2xl surface-hero relative">
        {/* dot grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        <div className="relative z-10 p-5">
          {/* avatar + name row */}
          <div className="flex items-start gap-4">
            {/* avatar with ring */}
            <div className="relative flex-shrink-0">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-white/15 border-2 border-white/25 text-white text-xl font-bold tracking-tight">
                {initials || <User className="w-7 h-7 opacity-70" />}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 border-2 border-white/30">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            {/* name + email */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-base font-bold text-white leading-tight truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-[12px] text-white/60 mt-1 truncate">{profile?.email}</p>
              {profile?.phone && (
                <p className="text-[12px] text-white/60 mt-0.5 truncate">{profile.phone}</p>
              )}
            </div>
          </div>

          {/* stat tiles */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-white/10 border border-white/10 px-3.5 py-2.5">
              <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold mb-1">Membre depuis</p>
              <p className="text-sm font-semibold text-white">
                {profile?.date_joined
                  ? format(new Date(profile.date_joined), "MMM yyyy", { locale: fr })
                  : "—"}
              </p>
            </div>
            {profile?.bonus_available !== undefined && (
              <div className="rounded-xl bg-white/10 border border-white/10 px-3.5 py-2.5">
                <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold mb-1">Bonus disponible</p>
                <p className="text-sm font-semibold text-white tabular-nums">
                  {profile.bonus_available.toLocaleString()} <span className="text-white/50 text-[10px] font-normal">FCFA</span>
                </p>
              </div>
            )}
          </div>

          {/* referral code */}
          {profile?.referral_code && (
            <div className="mt-2.5 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10">
              <div>
                <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold mb-0.5">Code parrainage</p>
                <p className="font-mono text-sm font-bold text-white tracking-wider">{profile.referral_code}</p>
              </div>
              <button
                onClick={copyReferral}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════
          Edit profile form
      ════════════════════════════ */}
      <SectionCard>
        <SectionHeader icon={Pencil} title="Informations personnelles" desc="Mettez à jour vos coordonnées" />
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="p-5 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" error={profileForm.formState.errors.first_name?.message}>
              <Input icon={<User className="w-4 h-4" />} type="text" placeholder="Jean" disabled={isSaving} {...profileForm.register("first_name")} />
            </Field>
            <Field label="Nom" error={profileForm.formState.errors.last_name?.message}>
              <Input icon={<User className="w-4 h-4" />} type="text" placeholder="Dupont" disabled={isSaving} {...profileForm.register("last_name")} />
            </Field>
          </div>

          <Field label="Email" error={profileForm.formState.errors.email?.message}>
            <Input icon={<Mail className="w-4 h-4" />} type="email" placeholder="votre@email.com" disabled={isSaving} {...profileForm.register("email")} />
          </Field>

          <Field label="Téléphone" error={profileForm.formState.errors.phone?.message}>
            <Input icon={<Phone className="w-4 h-4" />} type="tel" placeholder="+229 01 02 03 04" disabled={isSaving} {...profileForm.register("phone")} />
          </Field>

          <GradientBtn loading={isSaving}>
            <Save className="w-4 h-4" /> Enregistrer les modifications
          </GradientBtn>
        </form>
      </SectionCard>

      {/* ════════════════════════════
          Change password form
      ════════════════════════════ */}
      <SectionCard>
        <SectionHeader icon={ShieldCheck} title="Mot de passe" desc="Modifiez votre mot de passe de connexion" />
        <form onSubmit={passForm.handleSubmit(onChangePassword)} className="p-5 space-y-4">

          <Field label="Mot de passe actuel" error={passForm.formState.errors.old_password?.message}>
            <Input
              icon={<Lock className="w-4 h-4" />}
              type={showOld ? "text" : "password"}
              placeholder="••••••••"
              disabled={isChangingPass}
              rightSlot={
                <button type="button" onClick={() => setShowOld(!showOld)} className="p-1 text-muted-foreground/55 hover:text-foreground transition-colors">
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...passForm.register("old_password")}
            />
          </Field>

          <Field
            label="Nouveau mot de passe"
            error={passForm.formState.errors.new_password?.message}
            hint={newPassValue ? (
              <div className="pt-1 space-y-1.5">
                <div className="flex gap-1">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength ? strengthColor : "bg-slate-200 dark:bg-slate-700"}`} />
                  ))}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {pwChecks.map(({ ok, label }) => (
                    <span key={label} className={`flex items-center gap-1 text-[11px] transition-colors ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}`}>
                      <Check className={`w-3 h-3 flex-shrink-0 ${ok ? "opacity-100" : "opacity-0"}`} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : undefined}
          >
            <Input
              icon={<Lock className="w-4 h-4" />}
              type={showNew ? "text" : "password"}
              placeholder="••••••••"
              disabled={isChangingPass}
              rightSlot={
                <button type="button" onClick={() => setShowNew(!showNew)} className="p-1 text-muted-foreground/55 hover:text-foreground transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...passForm.register("new_password", {
                onChange: e => setNewPassValue(e.target.value),
              })}
            />
          </Field>

          <Field label="Confirmer le nouveau mot de passe" error={passForm.formState.errors.confirm_new_password?.message}>
            <Input
              icon={<Lock className="w-4 h-4" />}
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              disabled={isChangingPass}
              rightSlot={
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="p-1 text-muted-foreground/55 hover:text-foreground transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...passForm.register("confirm_new_password")}
            />
          </Field>

          <GradientBtn loading={isChangingPass}>
            <ShieldCheck className="w-4 h-4" /> Mettre à jour le mot de passe
          </GradientBtn>
        </form>
      </SectionCard>

      {/* ════════════════════════════
          Account meta
      ════════════════════════════ */}
      {profile && (
        <SectionCard>
          <div className="px-5 py-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Détails du compte</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-foreground flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-[13px] text-muted-foreground flex-1">Date d'inscription</span>
                <span className="text-[13px] font-medium text-foreground">
                  {format(new Date(profile.date_joined), "dd MMM yyyy", { locale: fr })}
                </span>
              </div>

              {profile.bonus_available !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex-shrink-0">
                    <Gift className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[13px] text-muted-foreground flex-1">Solde bonus</span>
                  <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {profile.bonus_available.toLocaleString()} FCFA
                  </span>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* ════════════════════════════
          Danger zone — logout
      ════════════════════════════ */}
      <div className="overflow-hidden rounded-2xl ring-1 ring-red-200 dark:ring-red-900/40 bg-red-50/40 dark:bg-red-950/10">
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-red-500/70 uppercase tracking-wider mb-3">Session</p>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 group-hover:bg-red-100 dark:group-hover:bg-red-950/50 transition-colors flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-[13px]">Se déconnecter</p>
              <p className="text-[11px] text-red-500/60 mt-0.5">Terminer votre session en cours</p>
            </div>
          </button>
        </div>
      </div>

    </div>
  )
}
