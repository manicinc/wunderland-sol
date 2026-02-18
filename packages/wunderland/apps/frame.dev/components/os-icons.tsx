import React from 'react'

interface OSIconProps {
  className?: string
  opacity?: number
}

export const WebOSIcon = ({ className = "w-12 h-12", opacity = 0.15 }: OSIconProps) => (
  <svg className={className} viewBox="0 0 100 100">
    {/* Globe with network nodes */}
    <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity * 0.8} />
    <ellipse cx="50" cy="50" rx="35" ry="15" fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity * 0.6} />
    <path d="M50 15 Q50 50 50 85" stroke="currentColor" strokeWidth="1" opacity={opacity * 0.6} />
    <path d="M15 50 Q50 50 85 50" stroke="currentColor" strokeWidth="1" opacity={opacity * 0.6} />
    {/* Network nodes */}
    <circle cx="50" cy="20" r="3" fill="currentColor" opacity={opacity} />
    <circle cx="30" cy="40" r="3" fill="currentColor" opacity={opacity} />
    <circle cx="70" cy="40" r="3" fill="currentColor" opacity={opacity} />
    <circle cx="35" cy="65" r="3" fill="currentColor" opacity={opacity} />
    <circle cx="65" cy="65" r="3" fill="currentColor" opacity={opacity} />
    <path d="M50 20 L30 40 L35 65 L65 65 L70 40 L50 20" stroke="currentColor" strokeWidth="0.5" fill="none" opacity={opacity * 0.5} />
  </svg>
)

export const HomeOSIcon = ({ className = "w-12 h-12", opacity = 0.15 }: OSIconProps) => (
  <svg className={className} viewBox="0 0 100 100">
    {/* Smart home with connected devices */}
    <path d="M50 20 L20 40 L20 75 L80 75 L80 40 Z" fill="currentColor" opacity={opacity * 0.3} />
    <path d="M50 20 L80 40" stroke="currentColor" strokeWidth="2" fill="none" opacity={opacity * 0.8} />
    <path d="M50 20 L20 40" stroke="currentColor" strokeWidth="2" fill="none" opacity={opacity * 0.8} />
    {/* Door */}
    <rect x="42" y="55" width="16" height="20" fill="currentColor" opacity={opacity * 0.6} />
    {/* Windows */}
    <rect x="28" y="45" width="10" height="10" fill="currentColor" opacity={opacity * 0.5} />
    <rect x="62" y="45" width="10" height="10" fill="currentColor" opacity={opacity * 0.5} />
    {/* Smart device indicators */}
    <circle cx="25" cy="30" r="2" fill="currentColor" opacity={opacity} />
    <circle cx="75" cy="30" r="2" fill="currentColor" opacity={opacity} />
    <circle cx="50" cy="15" r="2" fill="currentColor" opacity={opacity} />
    <path d="M25 30 L50 15 L75 30" stroke="currentColor" strokeWidth="0.5" fill="none" opacity={opacity * 0.5} />
  </svg>
)

export const SafeOSIcon = ({ className = "w-12 h-12", opacity = 0.15 }: OSIconProps) => (
  <svg className={className} viewBox="0 0 100 100">
    {/* Vault door with digital lock */}
    <rect x="25" y="25" width="50" height="50" rx="5" fill="currentColor" opacity={opacity * 0.2} strokeWidth="2" />
    <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="2" opacity={opacity * 0.8} />
    <circle cx="50" cy="50" r="10" fill="currentColor" opacity={opacity * 0.4} />
    {/* Lock mechanism */}
    <path d="M50 45 L50 55" stroke="currentColor" strokeWidth="3" opacity={opacity} />
    <path d="M45 50 L55 50" stroke="currentColor" strokeWidth="3" opacity={opacity} />
    {/* Corner bolts */}
    <circle cx="30" cy="30" r="2" fill="currentColor" opacity={opacity * 0.8} />
    <circle cx="70" cy="30" r="2" fill="currentColor" opacity={opacity * 0.8} />
    <circle cx="30" cy="70" r="2" fill="currentColor" opacity={opacity * 0.8} />
    <circle cx="70" cy="70" r="2" fill="currentColor" opacity={opacity * 0.8} />
    {/* Digital grid */}
    <path d="M35 35 L35 65 M40 35 L40 65 M45 35 L45 65 M55 35 L55 65 M60 35 L60 65 M65 35 L65 65" stroke="currentColor" strokeWidth="0.5" opacity={opacity * 0.3} />
  </svg>
)

export const WorkOSIcon = ({ className = "w-12 h-12", opacity = 0.15 }: OSIconProps) => (
  <svg className={className} viewBox="0 0 100 100">
    {/* Workspace with multiple layers */}
    <rect x="20" y="30" width="60" height="40" rx="3" fill="currentColor" opacity={opacity * 0.2} />
    <rect x="25" y="35" width="50" height="30" rx="2" fill="currentColor" opacity={opacity * 0.3} />
    {/* Graph/chart */}
    <path d="M35 55 L40 50 L45 52 L50 45 L55 48 L60 42 L65 46" stroke="currentColor" strokeWidth="2" fill="none" opacity={opacity * 0.8} />
    {/* AI agent nodes */}
    <circle cx="30" cy="25" r="3" fill="currentColor" opacity={opacity} />
    <circle cx="50" cy="20" r="3" fill="currentColor" opacity={opacity} />
    <circle cx="70" cy="25" r="3" fill="currentColor" opacity={opacity} />
    <path d="M30 25 L50 35 M50 20 L50 35 M70 25 L50 35" stroke="currentColor" strokeWidth="1" opacity={opacity * 0.6} />
    {/* Task indicators */}
    <rect x="30" y="58" width="8" height="2" fill="currentColor" opacity={opacity * 0.8} />
    <rect x="42" y="58" width="12" height="2" fill="currentColor" opacity={opacity * 0.8} />
    <rect x="58" y="58" width="6" height="2" fill="currentColor" opacity={opacity * 0.8} />
  </svg>
)

export const MyOSIcon = ({ className = "w-12 h-12", opacity = 0.15 }: OSIconProps) => (
  <svg className={className} viewBox="0 0 100 100">
    {/* Central hub with radiating connections */}
    <circle cx="50" cy="50" r="12" fill="currentColor" opacity={opacity * 0.4} />
    <circle cx="50" cy="50" r="8" fill="currentColor" opacity={opacity * 0.6} />
    {/* Radiating OS connections */}
    <circle cx="50" cy="25" r="5" fill="currentColor" opacity={opacity * 0.3} />
    <circle cx="70" cy="35" r="5" fill="currentColor" opacity={opacity * 0.3} />
    <circle cx="70" cy="65" r="5" fill="currentColor" opacity={opacity * 0.3} />
    <circle cx="50" cy="75" r="5" fill="currentColor" opacity={opacity * 0.3} />
    <circle cx="30" cy="65" r="5" fill="currentColor" opacity={opacity * 0.3} />
    <circle cx="30" cy="35" r="5" fill="currentColor" opacity={opacity * 0.3} />
    {/* Connection lines */}
    <path d="M50 42 L50 33 M56 45 L64 40 M56 55 L64 60 M50 58 L50 67 M44 55 L36 60 M44 45 L36 40" stroke="currentColor" strokeWidth="1" opacity={opacity * 0.5} />
    {/* Pulsing rings */}
    <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity={opacity * 0.2} />
    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity={opacity * 0.1} />
  </svg>
)
