/**
 * Template Management Page
 * @module codex/templates
 *
 * @remarks
 * Unified template management center for:
 * - Browsing all templates (local + remote)
 * - Importing template files
 * - Creating new templates
 * - Managing template sources/repositories
 * - Editing and customizing templates
 */

'use client'

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Plus, Upload,
  ChevronLeft, Loader2, Cloud,
  Grid3X3, FolderOpen, BookOpen, PenTool, Sparkles
} from 'lucide-react'
import { useTheme } from 'next-themes'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import ToolPageLeftSidebar from '@/components/quarry/ui/sidebar/ToolPageLeftSidebar'
import TemplateSelector from '@/components/quarry/templates/TemplateSelector'
import TemplateGuide from '@/components/quarry/templates/TemplateGuide'
import TemplateBuilder from '@/components/quarry/ui/templates/TemplateBuilder'
import type { LoadedTemplate } from '@/components/quarry/templates/types'
import type { TemplateDraft } from '@/lib/templates/types'

type TabId = 'browse' | 'create' | 'import' | 'guide'

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'browse', label: 'Browse', icon: Grid3X3 },
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'guide', label: 'Guide', icon: BookOpen },
]

function TemplatesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resolvedTheme } = useTheme()

  // Mounted state to prevent hydration flash
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Use resolvedTheme only after mount to avoid hydration mismatch
  const isDark = mounted ? resolvedTheme === 'dark' : false

  // Initialize tab from URL once, not reactively
  const initialTab = useMemo(() => {
    const tab = searchParams.get('tab') as TabId
    return tab && tabs.some(t => t.id === tab) ? tab : 'browse'
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingDraft, setEditingDraft] = useState<TemplateDraft | null>(null)

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    router.push(`/quarry/templates?tab=${tab}`, { scroll: false })
  }

  const handleSelectTemplate = useCallback((template: LoadedTemplate) => {
    // Navigate to new strand creation with template
    router.push(`/quarry/new?template=${template.id}`)
  }, [router])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportError(null)
      setImportSuccess(false)
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (!importFile) return

    try {
      const content = await importFile.text()
      const template = JSON.parse(content)

      // Validate template structure
      if (!template.id || !template.name || !template.template) {
        throw new Error('Invalid template: missing required fields (id, name, template)')
      }

      // Save to localStorage drafts
      const drafts = JSON.parse(localStorage.getItem('quarry-template-drafts') || '[]')
      const existingIndex = drafts.findIndex((d: any) => d.id === template.id)

      if (existingIndex >= 0) {
        drafts[existingIndex] = { ...template, importedAt: new Date().toISOString() }
      } else {
        drafts.push({ ...template, importedAt: new Date().toISOString() })
      }

      localStorage.setItem('quarry-template-drafts', JSON.stringify(drafts))
      setImportSuccess(true)
      setImportFile(null)

      // Reset file input
      const input = document.getElementById('template-file-input') as HTMLInputElement
      if (input) input.value = ''
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import template')
    }
  }, [importFile])

  // Template Builder handlers
  const handleOpenBuilder = useCallback(() => {
    setEditingDraft(null)
    setShowBuilder(true)
  }, [])

  const handleCloseBuilder = useCallback(() => {
    setShowBuilder(false)
    setEditingDraft(null)
  }, [])

  const handleSaveTemplate = useCallback((draft: TemplateDraft) => {
    // Template saved to localStorage by TemplateBuilder
    // Optionally refresh or show success message
    console.log('Template saved:', draft.name)
  }, [])

  // Sidebar content
  const sidebarContent = (
    <div className="h-full overflow-y-auto p-4 bg-zinc-50/50 dark:bg-zinc-900/50">
      {/* Ambience */}
      <div className="mb-6">
        <AmbienceSection />
      </div>

      {/* Quick Actions */}
      <div className="space-y-2 mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-zinc-400 dark:text-zinc-500">
          Quick Actions
        </h3>
        <button
          onClick={() => handleTabChange('create')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-800/40"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
        <button
          onClick={() => handleTabChange('import')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Upload className="w-4 h-4" />
          Import Template
        </button>
        <Link
          href="/codex?settings=templates"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Cloud className="w-4 h-4" />
          Manage Sources
        </Link>
      </div>

      {/* Stats */}
      <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-zinc-400 dark:text-zinc-500">
          Template Library
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Local</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-200">23</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Remote</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-200">23</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Drafts</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-200">0</span>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="mt-6 p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Pro Tip
          </h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Templates can include smart fields with validation, conditional display, and default values.
          Check the Guide tab for best practices.
        </p>
      </div>
    </div>
  )

  // Show skeleton during hydration to prevent flash
  if (!mounted) {
    return (
      <QuarryPageLayout title="Templates">
        <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
          <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {/* Header skeleton */}
            <div className="mb-6">
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                <div>
                  <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
            {/* Tabs skeleton */}
            <div className="flex gap-1 p-1 rounded-xl mb-6 bg-zinc-100 dark:bg-zinc-800/50">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
              ))}
            </div>
            {/* Content skeleton */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
              <div className="space-y-4">
                <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-8 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </QuarryPageLayout>
    )
  }

  return (
    <QuarryPageLayout
      title="Templates"
      description="Browse, create, and manage your templates"
      showRightPanel={true}
      rightPanelContent={sidebarContent}
      forceSidebarSmall={true}
      leftPanelContent={
        <ToolPageLeftSidebar
          isDark={isDark}
          title="Templates"
          description="Create and manage reusable content templates with smart fields."
          tips={[
            'Use smart fields for dynamic content',
            'Templates support validation rules',
            'Export templates as JSON to share'
          ]}
          relatedLinks={[
            { href: '/quarry/new', label: 'Create New Strand', icon: FileText },
            { href: '/quarry/tags', label: 'Tags & Supertags', icon: Grid3X3 },
            { href: '/quarry/architecture', label: 'Architecture Guide', icon: BookOpen },
          ]}
        />
      }
    >
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/quarry"
              className="inline-flex items-center gap-2 text-sm mb-4 text-zinc-600 hover:text-cyan-600 dark:text-zinc-400 dark:hover:text-cyan-400"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Codex
            </Link>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
                  Template Library
                </h1>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  Browse, create, and manage your templates
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-6 bg-zinc-100 dark:bg-zinc-800/50">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content - no animations to prevent flashing */}
          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50 p-6">
            {activeTab === 'browse' && (
              <TemplateSelector
                onSelectTemplate={handleSelectTemplate}
                showPreview={true}
                isDark={isDark}
              />
            )}

            {activeTab === 'create' && (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-2xl mb-4 bg-cyan-100 dark:bg-cyan-900/30">
                  <PenTool className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">
                  Create a New Template
                </h2>
                <p className="mb-6 max-w-md mx-auto text-zinc-600 dark:text-zinc-400">
                  Build custom templates with smart fields, validation, and beautiful formatting.
                </p>
                <button
                  onClick={handleOpenBuilder}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Open Template Builder
                </button>

                {/* Features list */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-200">
                      Smart Fields
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Text, textarea, select, date, number with validation
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-200">
                      Live Preview
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      See your template as you build it
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-200">
                      Export & Publish
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Download JSON or publish to GitHub
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="max-w-lg mx-auto py-8">
                <div className="text-center mb-8">
                  <div className="inline-flex p-4 rounded-2xl mb-4 bg-purple-100 dark:bg-purple-900/30">
                    <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">
                    Import Template
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Upload a template JSON file to add it to your library
                  </p>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed rounded-xl p-8 text-center transition-colors border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600">
                  <input
                    type="file"
                    id="template-file-input"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="template-file-input"
                    className="cursor-pointer"
                  >
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 text-zinc-400 dark:text-zinc-500" />
                    <p className="font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                      {importFile ? importFile.name : 'Click to select file'}
                    </p>
                    <p className="text-sm text-zinc-500">
                      or drag and drop a .json file
                    </p>
                  </label>
                </div>

                {/* Error Message */}
                {importError && (
                  <div className="mt-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                    {importError}
                  </div>
                )}

                {/* Success Message */}
                {importSuccess && (
                  <div className="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
                    Template imported successfully! It&apos;s now available in your drafts.
                  </div>
                )}

                {/* Import Button */}
                {importFile && !importSuccess && (
                  <button
                    onClick={handleImport}
                    className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Import Template
                  </button>
                )}

                {/* Template Format Help */}
                <div className="mt-8 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                  <h3 className="text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                    Template Format
                  </h3>
                  <pre className="text-xs overflow-x-auto text-zinc-600 dark:text-zinc-400">
{`{
  "id": "my-template",
  "name": "My Template",
  "category": "general",
  "description": "...",
  "fields": [...],
  "template": "# {title}\\n..."
}`}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'guide' && (
              <TemplateGuide />
            )}
          </div>
        </div>
      </div>

      {/* Template Builder Modal */}
      {showBuilder && (
        <TemplateBuilder
          initialDraft={editingDraft || undefined}
          onSave={handleSaveTemplate}
          onClose={handleCloseBuilder}
          isDark={isDark}
        />
      )}
    </QuarryPageLayout>
  )
}

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <QuarryPageLayout title="Templates">
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        </QuarryPageLayout>
      }
    >
      <TemplatesContent />
    </Suspense>
  )
}
