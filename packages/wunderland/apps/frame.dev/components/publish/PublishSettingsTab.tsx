/**
 * PublishSettingsTab Component
 * @module components/publish/PublishSettingsTab
 *
 * Settings tab for configuring the batch publishing system.
 * Part of the QuarrySettingsModal.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  GitPullRequest,
  Clock,
  FolderOpen,
  Shield,
  FileText,
  Zap,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Info,
} from 'lucide-react'
import { usePublisher } from '@/lib/publish/hooks/usePublisher'
import type {
  PublisherPreferences,
  PublishMode,
  BatchStrategy,
  ConflictResolution,
  ExportFormat,
} from '@/lib/publish/types'
import {
  PUBLISH_MODE_LABELS,
  PUBLISH_MODE_DESCRIPTIONS,
  BATCH_STRATEGY_LABELS,
  BATCH_STRATEGY_DESCRIPTIONS,
  CONFLICT_RESOLUTION_LABELS,
  CONFLICT_RESOLUTION_DESCRIPTIONS,
  EXPORT_FORMAT_LABELS,
  DEFAULT_REFLECTIONS_PATH,
  DEFAULT_STRANDS_PATH,
  DEFAULT_PROJECTS_PATH,
  DAY_LABELS_SHORT,
} from '@/lib/publish/constants'

// ============================================================================
// TYPES
// ============================================================================

export interface PublishSettingsTabProps {
  className?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PublishSettingsTab({ className }: PublishSettingsTabProps) {
  const { settings, updateSettings } = usePublisher()
  const [localSettings, setLocalSettings] = useState<PublisherPreferences>(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync local settings with hook settings
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // Handle setting change
  const handleChange = useCallback(<K extends keyof PublisherPreferences>(
    key: K,
    value: PublisherPreferences[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  // Save settings
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateSettings(localSettings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }, [localSettings, updateSettings])

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-blue-500" />
          Publishing Settings
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure how your content is published to GitHub
        </p>
      </div>

      {/* Publish Mode */}
      <SettingsSection
        title="Publish Mode"
        description="Choose how you want to publish your content"
        icon={<Zap className="w-4 h-4" />}
      >
        <div className="space-y-2">
          {(['manual', 'auto-batch', 'direct-commit'] as PublishMode[]).map(mode => (
            <label
              key={mode}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                localSettings.publishMode === mode
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <input
                type="radio"
                name="publishMode"
                value={mode}
                checked={localSettings.publishMode === mode}
                onChange={() => handleChange('publishMode', mode)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{PUBLISH_MODE_LABELS[mode]}</div>
                <div className="text-sm text-gray-500">{PUBLISH_MODE_DESCRIPTIONS[mode]}</div>
              </div>
            </label>
          ))}
        </div>
      </SettingsSection>

      {/* Batch Strategy */}
      <SettingsSection
        title="Batch Strategy"
        description="How to group changes into batches"
        icon={<FileText className="w-4 h-4" />}
      >
        <select
          value={localSettings.batchStrategy}
          onChange={e => handleChange('batchStrategy', e.target.value as BatchStrategy)}
          className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          {(['daily', 'weekly', 'monthly', 'all-pending', 'manual'] as BatchStrategy[]).map(strategy => (
            <option key={strategy} value={strategy}>
              {BATCH_STRATEGY_LABELS[strategy]} - {BATCH_STRATEGY_DESCRIPTIONS[strategy]}
            </option>
          ))}
        </select>
      </SettingsSection>

      {/* Schedule (for auto-batch) */}
      {localSettings.publishMode === 'auto-batch' && (
        <SettingsSection
          title="Schedule"
          description="When to automatically publish batches"
          icon={<Clock className="w-4 h-4" />}
        >
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localSettings.scheduleEnabled}
                onChange={e => handleChange('scheduleEnabled', e.target.checked)}
                className="rounded"
              />
              <span>Enable scheduled publishing</span>
            </label>

            {localSettings.scheduleEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time"
                    value={localSettings.scheduleTime}
                    onChange={e => handleChange('scheduleTime', e.target.value)}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Days</label>
                  <div className="flex gap-1">
                    {DAY_LABELS_SHORT.map((day, index) => (
                      <button
                        key={day}
                        onClick={() => {
                          const days = localSettings.scheduleDays.includes(index)
                            ? localSettings.scheduleDays.filter(d => d !== index)
                            : [...localSettings.scheduleDays, index]
                          handleChange('scheduleDays', days)
                        }}
                        className={cn(
                          'w-10 h-10 rounded-lg text-sm font-medium transition-colors',
                          localSettings.scheduleDays.includes(index)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SettingsSection>
      )}

      {/* Content Types */}
      <SettingsSection
        title="Content Types"
        description="What to include in publishing"
        icon={<FileText className="w-4 h-4" />}
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.publishReflections}
              onChange={e => handleChange('publishReflections', e.target.checked)}
              className="rounded"
            />
            <span>Reflections</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.publishStrands}
              onChange={e => handleChange('publishStrands', e.target.checked)}
              className="rounded"
            />
            <span>Strands</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.publishProjects}
              onChange={e => handleChange('publishProjects', e.target.checked)}
              className="rounded"
            />
            <span>Projects</span>
          </label>
        </div>
      </SettingsSection>

      {/* GitHub Repository */}
      <SettingsSection
        title="GitHub Repository"
        description="Target repository for publishing"
        icon={<GitPullRequest className="w-4 h-4" />}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Owner</label>
              <input
                type="text"
                value={localSettings.targetRepo?.owner || ''}
                onChange={e => handleChange('targetRepo', {
                  ...localSettings.targetRepo,
                  owner: e.target.value,
                  repo: localSettings.targetRepo?.repo || '',
                  branch: localSettings.targetRepo?.branch || 'main',
                })}
                placeholder="username"
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Repository</label>
              <input
                type="text"
                value={localSettings.targetRepo?.repo || ''}
                onChange={e => handleChange('targetRepo', {
                  ...localSettings.targetRepo,
                  owner: localSettings.targetRepo?.owner || '',
                  repo: e.target.value,
                  branch: localSettings.targetRepo?.branch || 'main',
                })}
                placeholder="my-content"
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <input
              type="text"
              value={localSettings.targetRepo?.branch || 'main'}
              onChange={e => handleChange('targetRepo', {
                ...localSettings.targetRepo,
                owner: localSettings.targetRepo?.owner || '',
                repo: localSettings.targetRepo?.repo || '',
                branch: e.target.value,
              })}
              placeholder="main"
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      </SettingsSection>

      {/* Path Templates */}
      <SettingsSection
        title="Path Templates"
        description="Customize where content is saved in the repository"
        icon={<FolderOpen className="w-4 h-4" />}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Reflections Path</label>
            <input
              type="text"
              value={localSettings.reflectionsPath}
              onChange={e => handleChange('reflectionsPath', e.target.value)}
              placeholder={DEFAULT_REFLECTIONS_PATH}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{year}'}, {'{month}'}, {'{day}'}, {'{date}'}, {'{weekday}'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Strands Path</label>
            <input
              type="text"
              value={localSettings.strandsPath}
              onChange={e => handleChange('strandsPath', e.target.value)}
              placeholder={DEFAULT_STRANDS_PATH}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{weave}'}, {'{loom}'}, {'{slug}'}, {'{title}'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Projects Path</label>
            <input
              type="text"
              value={localSettings.projectsPath}
              onChange={e => handleChange('projectsPath', e.target.value)}
              placeholder={DEFAULT_PROJECTS_PATH}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{slug}'}, {'{title}'}, {'{type}'}, {'{status}'}
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* PR Configuration */}
      <SettingsSection
        title="Pull Request Configuration"
        description="Customize PR titles and descriptions"
        icon={<GitPullRequest className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">PR Title Template</label>
            <input
              type="text"
              value={localSettings.prTitleTemplate}
              onChange={e => handleChange('prTitleTemplate', e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{date_range}'}, {'{summary}'}, {'{strategy}'}, {'{count}'}, {'{date}'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">PR Body Template</label>
            <textarea
              value={localSettings.prBodyTemplate}
              onChange={e => handleChange('prBodyTemplate', e.target.value)}
              rows={8}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{summary_list}'}, {'{file_list}'}, {'{diff_stats}'}, {'{date_range}'}
            </p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.includeDiffStats}
              onChange={e => handleChange('includeDiffStats', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Include diff statistics in PR</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.autoMergePRs}
              onChange={e => handleChange('autoMergePRs', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-merge PRs after creation</span>
          </label>
        </div>
      </SettingsSection>

      {/* Conflict Resolution */}
      <SettingsSection
        title="Conflict Resolution"
        description="Default behavior when conflicts are detected"
        icon={<Shield className="w-4 h-4" />}
      >
        <select
          value={localSettings.defaultConflictResolution}
          onChange={e => handleChange('defaultConflictResolution', e.target.value as ConflictResolution)}
          className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          {(['keep-local', 'keep-remote', 'merge', 'skip'] as ConflictResolution[]).map(resolution => (
            <option key={resolution} value={resolution}>
              {CONFLICT_RESOLUTION_LABELS[resolution]} - {CONFLICT_RESOLUTION_DESCRIPTIONS[resolution]}
            </option>
          ))}
        </select>
      </SettingsSection>

      {/* Export Options */}
      <SettingsSection
        title="Export Options"
        description="Default settings for exporting content"
        icon={<FileText className="w-4 h-4" />}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Default Format</label>
            <select
              value={localSettings.exportFormat}
              onChange={e => handleChange('exportFormat', e.target.value as ExportFormat)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            >
              {(['markdown', 'json', 'zip', 'combined'] as ExportFormat[]).map(format => (
                <option key={format} value={format}>
                  {EXPORT_FORMAT_LABELS[format]}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.exportIncludeFrontmatter}
              onChange={e => handleChange('exportIncludeFrontmatter', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Include frontmatter in exports</span>
          </label>
        </div>
      </SettingsSection>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            Settings saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            saving
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          )}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// SETTINGS SECTION
// ============================================================================

interface SettingsSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}

function SettingsSection({ title, description, icon, children }: SettingsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-gray-400">{icon}</span>
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="pl-6">
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PublishSettingsTab
