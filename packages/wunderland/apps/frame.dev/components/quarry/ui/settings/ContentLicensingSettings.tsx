/**
 * Content Licensing Settings
 *
 * Settings for default strand licenses, auto-detection, and license picker visibility.
 *
 * @module codex/ui/ContentLicensingSettings
 */

'use client'

import React from 'react'
import {
  Scale,
  Sparkles,
  Eye,
  Info,
} from 'lucide-react'
import { LicensePicker, LicenseBadge } from './LicensePicker'
import {
  type StrandLicense,
  LICENSE_INFO,
  LICENSE_GROUPS,
  getLicenseInfo,
} from '@/lib/strand/licenseTypes'
import { getPreferences, updatePreferences } from '@/lib/localStorage'

// ============================================================================
// TYPES
// ============================================================================

interface ContentLicensingSettingsProps {
  /** Current default license */
  defaultLicense: StrandLicense
  /** Whether auto-detection is enabled */
  autoDetectLicense: boolean
  /** Whether to show license picker on create */
  showLicenseOnCreate: boolean
  /** Callback when default license changes */
  onDefaultLicenseChange: (license: StrandLicense) => void
  /** Callback when auto-detect changes */
  onAutoDetectChange: (enabled: boolean) => void
  /** Callback when show on create changes */
  onShowOnCreateChange: (show: boolean) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ContentLicensingSettings({
  defaultLicense,
  autoDetectLicense,
  showLicenseOnCreate,
  onDefaultLicenseChange,
  onAutoDetectChange,
  onShowOnCreateChange,
}: ContentLicensingSettingsProps) {
  const licenseInfo = getLicenseInfo(defaultLicense)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Content Licensing
        </h3>
      </div>

      {/* Description */}
      <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-violet-700 dark:text-violet-300">
            Licenses help you track how content in your knowledge base can be used, shared, and modified.
            Set defaults here that apply to all new strands.
          </p>
        </div>
      </div>

      {/* Default License Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
          Default License for New Strands
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          This license will be applied to strands you create. You can override it per-strand.
        </p>
        <LicensePicker
          value={defaultLicense}
          onChange={onDefaultLicenseChange}
        />
      </div>

      {/* Auto-detect Toggle */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Auto-detect Licenses
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Automatically detect licenses from imported content (URLs, files, GitHub repos).
              Detected licenses will be suggested when creating strands.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoDetectLicense}
            onClick={() => onAutoDetectChange(!autoDetectLicense)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
              autoDetectLicense ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoDetectLicense ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {autoDetectLicense && (
          <div className="text-xs text-gray-600 dark:text-gray-400 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <strong>Detection sources:</strong> SPDX identifiers, Creative Commons badges,
            HTML meta tags, GitHub API, package.json, copyright notices
          </div>
        )}
      </div>

      {/* Show License Picker Toggle */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Show License Picker When Creating
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Display the license selection in the strand creation wizard.
              If disabled, strands will use your default license automatically.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showLicenseOnCreate}
            onClick={() => onShowOnCreateChange(!showLicenseOnCreate)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              showLicenseOnCreate ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showLicenseOnCreate ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Common Licenses
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {LICENSE_GROUPS.common.slice(0, 6).map((licenseId) => {
            const info = LICENSE_INFO[licenseId]
            return (
              <button
                key={licenseId}
                type="button"
                onClick={() => onDefaultLicenseChange(licenseId)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                  defaultLicense === licenseId
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <LicenseBadge license={licenseId} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {info.shortName}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {info.allowsCommercialUse ? 'Commercial OK' : 'Non-commercial'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
