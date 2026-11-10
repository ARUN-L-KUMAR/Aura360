import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  iconClassName?: string
  variant?: "orb" | "infinite" | "halo" | "image"
  size?: "sm" | "md" | "lg" | "xl"
  showBox?: boolean
  showGlow?: boolean
}

export function Logo({ 
  className, 
  iconClassName, 
  variant = "image",
  size = "md",
  showBox = true,
  showGlow = true
}: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  }

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
    xl: "w-12 h-12"
  }

  const renderLogo = () => {
    switch (variant) {
      case "image":
        return (
          <img 
            src="/logo.png" 
            alt="Aura360 Logo" 
            className={cn(
              "object-contain transition-all",
              showBox ? "w-full h-full p-1" : sizeClasses[size],
              iconClassName
            )} 
          />
        )
      case "orb":
        return (
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(iconSizes[size], iconClassName)}>
            <circle cx="20" cy="20" r="18" fill="url(#orb-grad)" fillOpacity="0.2" />
            <circle cx="20" cy="20" r="15" fill="url(#orb-grad)" fillOpacity="0.5" />
            <circle cx="20" cy="20" r="12" fill="url(#orb-grad)" />
            <path d="M20 12L14 28H17L18.5 24H21.5L23 28H26L20 12ZM20 16L21 21H19L20 16Z" fill="white" />
            <defs>
              <radialGradient id="orb-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20 20) rotate(90) scale(18)">
                <stop stopColor="#60A5FA" />
                <stop offset="1" stopColor="#2563EB" />
              </radialGradient>
            </defs>
          </svg>
        )
      case "infinite":
        return (
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(iconSizes[size], iconClassName)}>
            <path d="M6 28C6 28 8 6 20 6C32 6 34 28 34 28M13 28L20 12L27 28" stroke="url(#inf-grad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 28C6 34 14 38 20 38C26 38 34 34 34 28" stroke="url(#inf-grad)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="1 5" />
            <defs>
              <linearGradient id="inf-grad" x1="6" y1="6" x2="34" y2="38" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9333EA" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
        )
      case "halo":
        return (
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(iconSizes[size], iconClassName)}>
            <circle cx="20" cy="20" r="16" stroke="url(#halo-grad)" strokeWidth="1" strokeDasharray="2 2" className="animate-[spin_20s_linear_infinite]" />
            <circle cx="20" cy="20" r="12" stroke="url(#halo-grad)" strokeWidth="2.5" strokeDasharray="4 2" className="animate-[spin_15s_linear_reverse_infinite]" />
            <path d="M20 14L15 26M20 14L25 26" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <circle cx="20" cy="20" r="4" fill="#3B82F6" className="animate-pulse" />
            <defs>
              <linearGradient id="halo-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6" />
                <stop offset="1" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
        )
    }
  }

  if (!showBox) {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {showGlow && <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-110 animate-pulse-slow" />}
        {renderLogo()}
      </div>
    )
  }

  return (
    <div className={cn("relative flex items-center justify-center group", className)}>
      {showGlow && <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-110 animate-pulse-slow" />}
      <div className={cn("relative rounded-xl glass-card flex items-center justify-center overflow-hidden transition-all", sizeClasses[size])}>
        {renderLogo()}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shine transition-all" />
      </div>
    </div>
  )
}
