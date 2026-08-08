"use client"

import { useEffect } from "react"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "react-hot-toast"
import { getBrandConfig } from "@/lib/brand-config"
import { GoogleOAuthProvider } from "@react-oauth/google"

function hexToRgb(hex: string): string {
  const cleanHex = hex.replace("#", "")
  const doubleHex = cleanHex.length === 3
    ? cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2]
    : cleanHex
  const r = parseInt(doubleHex.substring(0, 2), 16)
  const g = parseInt(doubleHex.substring(2, 4), 16)
  const b = parseInt(doubleHex.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const brand = getBrandConfig()
    
    // Set document title
    if (typeof window !== "undefined") {
      document.title = `${brand.name} - ${brand.titleSuffix}`
      
      const root = document.documentElement
      const primaryRgb = hexToRgb(brand.colors.primary)
      
      root.style.setProperty("--primary", brand.colors.primary)
      root.style.setProperty("--ring", brand.colors.primary)
      root.style.setProperty("--accent", brand.colors.accent)
      root.style.setProperty("--gradient-start", brand.colors.gradientStart)
      root.style.setProperty("--gradient-end", brand.colors.gradientEnd)
      root.style.setProperty("--shadow-horizon-color", primaryRgb)
    }
  }, [])

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}


