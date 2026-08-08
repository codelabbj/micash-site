"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { GoogleLogin } from "@react-oauth/google"
import { useAuth } from "@/lib/auth-context"
import { toast } from "react-hot-toast"
import api from "@/lib/api"

interface GoogleButtonProps {
  mode?: "login" | "register"
}

export function GoogleButton({ mode = "login" }: GoogleButtonProps) {
  const { login } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number>(320)

  useEffect(() => {
    if (!containerRef.current) return

    const parentWidth = containerRef.current.getBoundingClientRect().width
    if (parentWidth) {
      setWidth(Math.min(400, Math.max(200, Math.floor(parentWidth))))
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.min(400, Math.max(200, Math.floor(entry.contentRect.width)))
        setWidth(w)
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const handleCredential = async (credential: string) => {
    setIsLoading(true)
    try {
      const response = await api.post("/auth/google", { id_token: credential })
      const { access, refresh, data } = response.data
      login(access, refresh, data)
      toast.success(mode === "register" ? "Compte créé avec succès!" : "Connexion réussie!")
      router.push("/dashboard")
    } catch (error) {
      console.error("Google auth error:", error)
      toast.error("Erreur lors de la connexion avec Google")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* Séparateur */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-slate-900 px-3 text-muted-foreground tracking-wide">ou</span>
        </div>
      </div>

      {/* Bouton Google */}
      <div ref={containerRef} className="w-full flex justify-center">
        <GoogleLogin
          onSuccess={(res) => {
            if (res.credential) handleCredential(res.credential)
          }}
          onError={() => {
            toast.error("Erreur lors de la connexion avec Google")
          }}
          text={mode === "register" ? "signup_with" : "continue_with"}
          shape="rectangular"
          theme="outline"
          size="large"
          width={width.toString()}
          useOneTap={false}
        />
      </div>
    </div>
  )
}
