export interface BrandConfig {
  name: string
  logo: string
  acronym: string
  apkUrl: string
  apkFileName: string
  titleSuffix: string
  description: string
  colors: {
    primary: string
    accent: string
    gradientStart: string
    gradientEnd: string
  }
}

export function getBrandConfig(): BrandConfig {
  // Try to inspect NEXT_PUBLIC_BASE_URL first, fall back to window.location host in browser
  const baseUrl = (
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || ""
  ).toLowerCase()

  if (baseUrl.includes("ti-cash") || baseUrl.includes("ticash")) {
    return {
      name: "Ti-cash",
      logo: "/ticash.png",
      acronym: "TC",
      apkUrl: "/ticash-v1.0.1.apk",
      apkFileName: "ticash-v1.0.1.apk",
      titleSuffix: "Gestion de Dépôts et Retraits",
      description: "Plateforme de gestion de transactions pour paris sportifs",
      colors: {
        primary: "#0052FF",
        accent: "#00c3ff",
        gradientStart: "#0052FF",
        gradientEnd: "#0041CC",
      },
    }
  }

  if (baseUrl.includes("zefast")) {
    return {
      name: "Zefast",
      logo: "/zefast.png",
      acronym: "ZF",
      apkUrl: "/zefast-v1.0.1.apk",
      apkFileName: "zefast-v1.0.1.apk",
      titleSuffix: "Gestion de Dépôts et Retraits",
      description: "Plateforme de gestion de transactions pour paris sportifs",
      colors: {
        primary: "#4F46E5",
        accent: "#10B981",
        gradientStart: "#4F46E5",
        gradientEnd: "#3730A3",
      },
    }
  }

  if (baseUrl.includes("melpay")) {
    return {
      name: "Melpay",
      logo: "/melpay-logo.png",
      acronym: "MP",
      apkUrl: "/melpay-v1.0.1.apk",
      apkFileName: "melpay-v1.0.1.apk",
      titleSuffix: "Gestion de Dépôts et Retraits",
      description: "Plateforme de gestion de transactions pour paris sportifs",
      colors: {
        primary: "#EF4444",
        accent: "#F59E0B",
        gradientStart: "#EF4444",
        gradientEnd: "#B91C1C",
      },
    }
  }

  // Fallback / default: Micash
  return {
    name: "Micash",
    logo: "/micash-logo.png",
    acronym: "MC",
    apkUrl: "/app-v1.0.1.apk",
    apkFileName: "micash-v1.0.1.apk",
    titleSuffix: "Gestion de Dépôts et Retraits",
    description: "Plateforme de gestion de transactions pour paris sportifs",
    colors: {
      primary: "#2563eb",
      accent: "#06b6d4",
      gradientStart: "#1d4ed8",
      gradientEnd: "#06b6d4",
    },
  }
}
