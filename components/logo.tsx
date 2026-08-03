"use client"

import React from "react"
import Image from "next/image"
import { getBrandConfig } from "@/lib/brand-config"

interface LogoProps {
  variant?: "icon-only" | "text-only" | "full" | "image-only"
  className?: string
  iconSize?: number
  height?: number
  width?: number
}

export function Logo({
  variant = "full",
  className = "",
  iconSize = 44,
  height = 40,
  width = 160,
}: LogoProps) {
  const brand = getBrandConfig()

  // Resolve styles depending on the brand name
  let gradientClass = "from-blue-500 via-indigo-600 to-cyan-500"
  if (brand.name.toLowerCase().includes("ti-cash") || brand.name.toLowerCase().includes("ticash")) {
    gradientClass = "from-blue-600 via-blue-500 to-sky-400"
  } else if (brand.name.toLowerCase().includes("zefast")) {
    gradientClass = "from-indigo-600 via-purple-600 to-emerald-400"
  } else if (brand.name.toLowerCase().includes("melpay")) {
    gradientClass = "from-red-600 via-rose-500 to-orange-400"
  }

  // Acronym Badge (Avatar styled icon Mark)
  const renderIconMark = () => (
    <div
      style={{ width: iconSize, height: iconSize }}
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br ${gradientClass} p-[1px] shadow-lg shadow-primary/20 backdrop-blur-md`}
    >
      <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950/20 backdrop-blur-md">
        <span className="font-mono text-sm sm:text-base font-extrabold tracking-wider text-white">
          {brand.acronym}
        </span>
      </div>
      <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity hover:opacity-100" />
    </div>
  )

  if (variant === "image-only") {
    return (
      <Image
        src={brand.logo}
        alt={brand.name}
        width={width}
        height={height}
        className={`h-auto w-auto object-contain ${className}`}
        priority
      />
    )
  }

  if (variant === "icon-only") {
    return <div className={className}>{renderIconMark()}</div>
  }

  if (variant === "text-only") {
    return (
      <span className={`bg-gradient-to-r ${gradientClass} bg-clip-text text-xl font-extrabold tracking-tight text-transparent ${className}`}>
        {brand.name}
      </span>
    )
  }

  // Full variant (Icon + Brand Name)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {renderIconMark()}
      <div className="flex flex-col">
        <span className={`bg-gradient-to-r ${gradientClass} bg-clip-text text-base font-extrabold tracking-tight text-transparent`}>
          {brand.name}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Platform
        </span>
      </div>
    </div>
  )
}
