/**
 * License Picker Component
 * @module components/quarry/ui/LicensePicker
 *
 * A dropdown selector for choosing content licenses.
 * Supports auto-detection display and manual override.
 */

'use client'

console.log('[LicensePicker] MODULE LOADING START', Date.now())

import { useState, useMemo } from 'react'
import {
  HelpCircle,
  Share2,
  RefreshCw,
  DollarSign,
  Lock,
  Shield,
  Globe,
  Code,
  Feather,
  FileCode,
  Copyright,
  EyeOff,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Check,
  X,
  Info,
  CircleCheck,
  CircleX,
  CircleAlert,
} from 'lucide-react'
import {
  type StrandLicense,
  type LicenseInfo,
  LICENSE_INFO,
  LICENSE_GROUPS,
  getLicenseInfo,
  DEFAULT_LICENSE,
} from '@/lib/strand/licenseTypes'
import type { LicenseDetectionResult } from '@/lib/strand/licenseDetector'

// ============================================================================
// TYPES
// ============================================================================

interface LicensePickerProps {
  /** Currently selected license */
  value: StrandLicense
  /** Callback when license changes */
  onChange: (license: StrandLicense) => void
  /** Auto-detected license (if any) */
  detectedLicense?: LicenseDetectionResult | null
  /** Whether to show the detected license badge */
  showDetectedBadge?: boolean
  /** Custom license text (for 'custom' license) */
  customText?: string
  /** Callback when custom text changes */
  onCustomTextChange?: (text: string) => void
  /** Compact mode for smaller spaces */
  compact?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HelpCircle,
  Share2,
  RefreshCw,
  DollarSign,
  Lock,
  Shield,
  Globe,
  Code,
  Feather,
  Copyleft: RefreshCw, // Fallback for copyleft icon
  FileCode,
  Copyright,
  EyeOff,
  BookOpen,
  FileText,
}

function getLicenseIcon(info: LicenseInfo): React.ComponentType<{ className?: string }> {
  return ICON_MAP[info.icon] || HelpCircle
}

// ============================================================================
// LICENSE BADGE COMPONENT
// ============================================================================

interface LicenseBadgeProps {
  license: StrandLicense
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function LicenseBadge({ license, size = 'md', showLabel = true, className = '' }: LicenseBadgeProps) {
  const info = getLicenseInfo(license)
  const Icon = getLicenseIcon(info)

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  const colorClasses: Record<string, string> = {
    gray: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    zinc: 'bg-zinc-600/20 text-zinc-400 border-zinc-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${sizeClasses} ${colorClasses[info.color] || colorClasses.gray} ${className}`}
      title={info.description}
    >
      <Icon className={iconSize} />
      {showLabel && <span>{info.shortName}</span>}
    </span>
  )
}

// ============================================================================
// LICENSE PERMISSIONS COMPONENT
// ============================================================================

interface LicensePermissionsProps {
  info: LicenseInfo
  compact?: boolean
}

/**
 * Displays permission indicators for a license
 */
export function LicensePermissions({ info, compact = false }: LicensePermissionsProps) {
  const permissions = [
    {
      key: 'commercial',
      label: 'Commercial Use',
      tooltip: 'Can be used for commercial purposes',
      allowed: info.allowsCommercialUse,
    },
    {
      key: 'modify',
      label: 'Modifications',
      tooltip: 'Can be modified and adapted',
      allowed: info.allowsModification,
    },
    {
      key: 'attribution',
      label: 'Attribution Required',
      tooltip: 'Must give credit to the original creator',
      required: info.requiresAttribution,
    },
    {
      key: 'shareAlike',
      label: 'Share-Alike',
      tooltip: 'Derivatives must use the same license',
      required: info.requiresShareAlike,
    },
  ]

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {permissions.map(p => {
          const isAllowed = 'allowed' in p ? p.allowed : !p.required
          return (
            <span
              key={p.key}
              title={`${p.label}: ${isAllowed ? 'Yes' : 'No'} - ${p.tooltip}`}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                isAllowed
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {isAllowed ? <CircleCheck className="w-2.5 h-2.5" /> : <CircleX className="w-2.5 h-2.5" />}
              {p.label.split(' ')[0]}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {permissions.map(p => {
        const isAllowed = 'allowed' in p ? p.allowed : false
        const isRequired = 'required' in p ? p.required : false

        return (
          <div
            key={p.key}
            title={p.tooltip}
            className={`flex items-center gap-2 p-2 rounded-lg border ${
              isAllowed
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : isRequired
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            {isAllowed ? (
              <CircleCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : isRequired ? (
              <CircleAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <CircleX className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <div className="text-xs">
              <div className={`font-medium ${
                isAllowed ? 'text-emerald-300' : isRequired ? 'text-amber-300' : 'text-red-300'
              }`}>
                {p.label}
              </div>
              <div className="text-zinc-500 text-[10px]">
                {isAllowed ? 'Allowed' : isRequired ? 'Required' : 'Not allowed'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// LICENSE INFO PANEL COMPONENT
// ============================================================================

interface LicenseInfoPanelProps {
  license: StrandLicense
  expanded?: boolean
  onToggle?: () => void
}

/**
 * Expandable info panel showing license details
 */
export function LicenseInfoPanel({ license, expanded = false, onToggle }: LicenseInfoPanelProps) {
  const info = getLicenseInfo(license)
  const Icon = getLicenseIcon(info)

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-zinc-400" />
          <div className="text-left">
            <div className="text-sm font-medium text-zinc-200">{info.name}</div>
            <div className="text-xs text-zinc-500">{info.shortName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {info.isOpenSource && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-500/20 text-emerald-400">
              Open Source
            </span>
          )}
          {info.isCreativeCommons && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-500/20 text-blue-400">
              CC
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-zinc-800">
          {/* Description */}
          <p className="text-sm text-zinc-400">{info.description}</p>

          {/* Permissions */}
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-2">Permissions</div>
            <LicensePermissions info={info} />
          </div>

          {/* License URL */}
          {info.url && (
            <a
              href={info.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
            >
              <ExternalLink className="w-4 h-4" />
              Read full license text
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// LICENSE OPTION COMPONENT
// ============================================================================

interface LicenseOptionProps {
  info: LicenseInfo
  isSelected: boolean
  isDetected: boolean
  onSelect: () => void
}

function LicenseOption({ info, isSelected, isDetected, onSelect }: LicenseOptionProps) {
  const Icon = getLicenseIcon(info)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        w-full flex items-start gap-3 px-3 py-2.5 text-left rounded-lg transition-colors
        ${isSelected
          ? 'bg-emerald-500/20 border border-emerald-500/50'
          : 'hover:bg-zinc-800/50 border border-transparent'
        }
      `}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium ${isSelected ? 'text-emerald-300' : 'text-zinc-200'}`}>
            {info.shortName}
          </span>
          {info.isOpenSource && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400" title="Open Source License">
              OSS
            </span>
          )}
          {info.isCreativeCommons && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-500/10 text-blue-400" title="Creative Commons License">
              CC
            </span>
          )}
          {isDetected && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-3 h-3" />
              Detected
            </span>
          )}
          {isSelected && (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{info.description}</p>
        {/* Quick permission indicators */}
        <div className="flex items-center gap-2 mt-1.5">
          <span
            title={info.allowsCommercialUse ? 'Commercial use allowed' : 'Commercial use not allowed'}
            className={`inline-flex items-center gap-0.5 text-[10px] ${
              info.allowsCommercialUse ? 'text-emerald-500' : 'text-zinc-600'
            }`}
          >
            {info.allowsCommercialUse ? <CircleCheck className="w-2.5 h-2.5" /> : <CircleX className="w-2.5 h-2.5" />}
            Commercial
          </span>
          <span
            title={info.allowsModification ? 'Modifications allowed' : 'Modifications not allowed'}
            className={`inline-flex items-center gap-0.5 text-[10px] ${
              info.allowsModification ? 'text-emerald-500' : 'text-zinc-600'
            }`}
          >
            {info.allowsModification ? <CircleCheck className="w-2.5 h-2.5" /> : <CircleX className="w-2.5 h-2.5" />}
            Modify
          </span>
          {info.requiresAttribution && (
            <span title="Attribution required" className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
              <CircleAlert className="w-2.5 h-2.5" />
              Attribute
            </span>
          )}
        </div>
        {info.url && (
          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400 mt-1"
          >
            <ExternalLink className="w-3 h-3" />
            View license
          </a>
        )}
      </div>
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LicensePicker({
  value,
  onChange,
  detectedLicense,
  showDetectedBadge = true,
  customText,
  onCustomTextChange,
  compact = false,
  disabled = false,
  className = '',
}: LicensePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const selectedInfo = getLicenseInfo(value)
  const SelectedIcon = getLicenseIcon(selectedInfo)

  // Group licenses for display
  const groupedLicenses = useMemo(() => {
    return [
      { name: 'Common', licenses: LICENSE_GROUPS.common },
      { name: 'Creative Commons', licenses: LICENSE_GROUPS.creativeCommons.filter(l => !LICENSE_GROUPS.common.includes(l)) },
      { name: 'Open Source', licenses: LICENSE_GROUPS.openSource },
      { name: 'Restricted', licenses: LICENSE_GROUPS.restricted.filter(l => !LICENSE_GROUPS.common.includes(l)) },
      { name: 'Other', licenses: LICENSE_GROUPS.special },
    ].filter(g => g.licenses.length > 0)
  }, [])

  const handleSelect = (license: StrandLicense) => {
    onChange(license)
    setIsOpen(false)
  }

  const handleUseDetected = () => {
    if (detectedLicense) {
      onChange(detectedLicense.license)
      setIsOpen(false)
    }
  }

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors
            ${disabled
              ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600 text-zinc-300'
            }
          `}
        >
          <SelectedIcon className="w-4 h-4" />
          <span className="text-sm">{selectedInfo.shortName}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-50 mt-1 w-72 max-h-80 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
              {groupedLicenses.map((group) => (
                <div key={group.name}>
                  <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/50 sticky top-0">
                    {group.name}
                  </div>
                  {group.licenses.map((licenseId) => {
                    const info = LICENSE_INFO[licenseId]
                    return (
                      <LicenseOption
                        key={licenseId}
                        info={info}
                        isSelected={value === licenseId}
                        isDetected={detectedLicense?.license === licenseId}
                        onSelect={() => handleSelect(licenseId)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Detected license banner */}
      {detectedLicense && showDetectedBadge && detectedLicense.license !== value && (
        <div className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-sm text-cyan-300">
                Detected: <strong>{getLicenseInfo(detectedLicense.license).shortName}</strong>
              </p>
              {detectedLicense.reasoning && (
                <p className="text-xs text-cyan-400/70">{detectedLicense.reasoning}</p>
              )}
              <p className="text-xs text-zinc-500">
                Confidence: {Math.round(detectedLicense.confidence * 100)}%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseDetected}
            className="px-3 py-1.5 text-sm font-medium bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-md transition-colors"
          >
            Use This
          </button>
        </div>
      )}

      {/* License selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors
            ${disabled
              ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600 text-zinc-200'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <SelectedIcon className="w-5 h-5 text-zinc-400" />
            <div className="text-left">
              <div className="font-medium">{selectedInfo.shortName}</div>
              <div className="text-xs text-zinc-500">{selectedInfo.description}</div>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
              {groupedLicenses.map((group) => (
                <div key={group.name}>
                  <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/50 sticky top-0">
                    {group.name}
                  </div>
                  <div className="p-2">
                    {group.licenses.map((licenseId) => {
                      const info = LICENSE_INFO[licenseId]
                      return (
                        <LicenseOption
                          key={licenseId}
                          info={info}
                          isSelected={value === licenseId}
                          isDetected={detectedLicense?.license === licenseId}
                          onSelect={() => handleSelect(licenseId)}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Custom license text input */}
      {value === 'custom' && onCustomTextChange && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-400">
            Custom License Text
          </label>
          <textarea
            value={customText || ''}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder="Enter your custom license terms..."
            rows={4}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
          />
        </div>
      )}

      {/* Selected license info toggle */}
      <button
        type="button"
        onClick={() => setShowInfoPanel(!showInfoPanel)}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
      >
        <Info className="w-4 h-4" />
        {showInfoPanel ? 'Hide' : 'Show'} license details
        {showInfoPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded license info panel */}
      {showInfoPanel && (
        <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-900/50 space-y-4">
          <div className="flex items-center gap-3">
            <SelectedIcon className="w-6 h-6 text-zinc-400" />
            <div>
              <div className="font-medium text-zinc-200">{selectedInfo.name}</div>
              <div className="text-sm text-zinc-500">{selectedInfo.description}</div>
            </div>
          </div>

          {/* Permissions grid */}
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Permissions & Requirements</div>
            <LicensePermissions info={selectedInfo} />
          </div>

          {/* Additional info badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedInfo.isOpenSource && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Open Source Approved
              </span>
            )}
            {selectedInfo.isCreativeCommons && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Creative Commons License
              </span>
            )}
            {!selectedInfo.requiresAttribution && selectedInfo.id !== 'none' && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                No Attribution Needed
              </span>
            )}
          </div>

          {/* License URL */}
          {selectedInfo.url && (
            <a
              href={selectedInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Read full license text
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default LicensePicker
