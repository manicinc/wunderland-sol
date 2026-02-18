'use client'

/**
 * Custom SVG Icons for FABRIC Landing Page
 * Advanced, intricate silhouette-style SVGs
 * Vibrant and elegant - NO emojis
 */

import type { SVGProps } from 'react'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'style'> {
  size?: number
  style?: React.CSSProperties
}

// Fabric Icon (from brand)
export function FabricIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} {...props}>
      <defs>
        <linearGradient id="fabric-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect x="10" y="8" width="44" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="19" width="38" height="6" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="10" y="30" width="44" height="6" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="16" y="41" width="38" height="6" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="10" y="52" width="44" height="6" rx="3" fill="currentColor" opacity="0.2" />
      <rect x="10" y="8" width="6" height="50" rx="3" fill="url(#fabric-icon-grad)" />
    </svg>
  )
}

// Brain/AI Icon - Neural network style
export function NeuralBrainIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 2C8.5 2 6 4.5 6 7.5c0 1.5.5 2.8 1.3 3.8-.8 1-1.3 2.3-1.3 3.7 0 3 2.5 5 6 5s6-2 6-5c0-1.4-.5-2.7-1.3-3.7.8-1 1.3-2.3 1.3-3.8C18 4.5 15.5 2 12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="8" r="1" fill="currentColor" />
      <circle cx="15" cy="8" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="16" r="1" fill="currentColor" />
      <circle cx="15" cy="16" r="1" fill="currentColor" />
      <path d="M9 8L12 12L15 8M9 16L12 12L15 16" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

// Semantic Search Icon - Magnifying glass with nodes
export function SemanticSearchIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.5 14.5L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="9" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="11" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="10" cy="7" r="1" fill="currentColor" opacity="0.5" />
      <path d="M8 9L10 7M10 7L12 11M8 9L12 11" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
    </svg>
  )
}

// Knowledge Graph Icon - Connected nodes
export function KnowledgeGraphIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7.5V12M5 12L12 12M19 12L12 12M8 17L12 12M16 17L12 12" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

// Bidirectional Links Icon
export function BidirectionalLinkIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="2" y="8" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="15" y="8" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 10L15 10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 14L15 14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8L14 10L12 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M12 16L10 14L12 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

// Markdown Icon
export function MarkdownIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8V16L8 12L11 16V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 12L16 16M16 16L13 12M16 16V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Local/Offline CPU Icon
export function LocalCPUIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
      <path d="M9 2V5M15 2V5M9 19V22M15 19V22M2 9H5M2 15H5M19 9H22M19 15H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Shield/Privacy Icon
export function PrivacyShieldIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M12 2L4 6V11C4 16.5 7.8 21.7 12 22C16.2 21.7 20 16.5 20 11V6L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Themes/Palette Icon
export function ThemePaletteIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C13.1 22 14 21.1 14 20C14 19.5 13.8 19 13.5 18.6C13.2 18.2 13 17.7 13 17C13 15.9 13.9 15 15 15H17C19.8 15 22 12.8 22 10C22 5.6 17.5 2 12 2Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="10.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="14.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

// Flashcard/Quiz Icon
export function FlashcardIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="4" y="6" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" transform="rotate(-6 4 6)" />
      <rect x="6" y="8" width="14" height="10" rx="1.5" fill="white" stroke="currentColor" strokeWidth="1.5" className="dark:fill-gray-900" />
      <path d="M10 12L12 14L16 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Spiral/Learning Path Icon
export function SpiralPathIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M12 22C12 22 4 18 4 12C4 6 9 2 12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 18C12 18 8 15 8 12C8 9 10 6 12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 14C12 14 10 13 10 12C10 11 11 10 12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 2L14 4L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Tags/Hierarchy Icon
export function TagHierarchyIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M4 5H12L14 7V12L12 14H4L2 12V7L4 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="6" cy="9.5" r="1.5" fill="currentColor" />
      <path d="M10 10H20L22 12V17L20 19H10L8 17V12L10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="14.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

// File Upload/Ingestion Icon
export function FileIngestionIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M14 2H6C5 2 4 3 4 4V20C4 21 5 22 6 22H18C19 22 20 21 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 18V12M12 12L9 15M12 12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// GitHub Integration Icon
export function GitHubIntegrationIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 16.42 5.02 20.16 9.11 21.5C9.6 21.58 9.78 21.27 9.78 21.01C9.78 20.77 9.77 19.98 9.77 19.16C7 19.75 6.35 17.89 6.35 17.89C5.89 16.69 5.22 16.38 5.22 16.38C4.31 15.76 5.29 15.77 5.29 15.77C6.3 15.84 6.84 16.8 6.84 16.8C7.74 18.31 9.23 17.87 9.8 17.62C9.89 16.99 10.15 16.55 10.44 16.31C8.18 16.06 5.8 15.19 5.8 11.35C5.8 10.21 6.19 9.27 6.86 8.54C6.76 8.29 6.41 7.21 6.96 5.77C6.96 5.77 7.81 5.5 9.77 6.85C10.57 6.63 11.42 6.52 12.27 6.52C13.12 6.52 13.98 6.63 14.78 6.85C16.73 5.5 17.58 5.77 17.58 5.77C18.13 7.21 17.78 8.29 17.68 8.54C18.35 9.27 18.74 10.21 18.74 11.35C18.74 15.2 16.35 16.05 14.08 16.29C14.45 16.6 14.78 17.2 14.78 18.11C14.78 19.44 14.77 20.51 14.77 21.01C14.77 21.28 14.94 21.59 15.45 21.5C19.52 20.15 22.53 16.41 22.53 12C22.53 6.48 18.04 2 12.53 2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

// Cloud Sync Icon
export function CloudSyncIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M6.5 19C4 19 2 17 2 14.5C2 12.3 3.6 10.4 5.7 10.1C6.3 7.2 8.9 5 12 5C15.5 5 18.3 7.6 18.8 11C20.7 11.3 22 12.9 22 14.8C22 17 20.2 19 18 19H6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 19V13M12 13L9 16M12 13L15 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Code/Developer Icon
export function DeveloperCodeIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M8 6L3 12L8 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 6L21 12L16 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 4L10 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Illustration/Image Generation Icon
export function IllustrationIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 15L16 10L6 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 21L11 18L8 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Glossary/Book Icon
export function GlossaryIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M4 4.5C4 3.7 4.7 3 5.5 3H19.5C20.3 3 21 3.7 21 4.5V20.5C21 21.3 20.3 22 19.5 22H5.5C4.7 22 4 21.3 4 20.5V4.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 18H21" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7H17M8 11H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="20" r="1" fill="currentColor" />
    </svg>
  )
}

// MIT License Icon
export function MITLicenseIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12V8L10 10L12 8L14 10L16 8V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Offline/No Cloud Icon
export function OfflineIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M6.5 19C4 19 2 17 2 14.5C2 12.3 3.6 10.4 5.7 10.1C6.3 7.2 8.9 5 12 5C15.5 5 18.3 7.6 18.8 11C20.7 11.3 22 12.9 22 14.8C22 17 20.2 19 18 19H6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 4L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// AI Optional Icon
export function AIOptionalIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10V14L10 12L12 14V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export const Icons = {
  Fabric: FabricIcon,
  NeuralBrain: NeuralBrainIcon,
  SemanticSearch: SemanticSearchIcon,
  KnowledgeGraph: KnowledgeGraphIcon,
  BidirectionalLink: BidirectionalLinkIcon,
  Markdown: MarkdownIcon,
  LocalCPU: LocalCPUIcon,
  PrivacyShield: PrivacyShieldIcon,
  ThemePalette: ThemePaletteIcon,
  Flashcard: FlashcardIcon,
  SpiralPath: SpiralPathIcon,
  TagHierarchy: TagHierarchyIcon,
  FileIngestion: FileIngestionIcon,
  GitHubIntegration: GitHubIntegrationIcon,
  CloudSync: CloudSyncIcon,
  DeveloperCode: DeveloperCodeIcon,
  Illustration: IllustrationIcon,
  Glossary: GlossaryIcon,
  MITLicense: MITLicenseIcon,
  Offline: OfflineIcon,
  AIOptional: AIOptionalIcon,
}

export default Icons
