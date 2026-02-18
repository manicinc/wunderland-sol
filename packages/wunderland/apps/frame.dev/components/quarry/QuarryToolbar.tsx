/**
 * Toolbar component for Quarry Codex viewer
 * Contains navigation tools, contribute dropdown, and visualization toggle
 * @module codex/QuarryToolbar
 */

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Info, Plus, GitPullRequest, HelpCircle, FileText, Code, Bookmark, BookmarkCheck, Star, Settings, LifeBuoy, Network, Clock, Edit3, Brain, Route, Sparkles, Target, Play, GraduationCap, Lightbulb, Map, Book, Undo2, Redo2, Activity, User, FolderTree, Puzzle, Globe, PenLine, BookHeart, ListChecks, Share2, Compass, Hash, PanelTop, PanelTopOpen } from 'lucide-react'
import { REPO_CONFIG } from './constants'
import ResponsiveToolbar from './ui/misc/ResponsiveToolbar'
import TTSControls from './ui/tts/TTSControls'
import type { TTSState, TTSSettings, TTSVoice } from './hooks/useTextToSpeech'
import { getUserProfile } from '@/lib/localStorage'
import { pluginUIRegistry } from '@/lib/plugins/QuarryPluginAPI'
import { quarryPluginManager } from '@/lib/plugins/QuarryPluginManager'
import { useToast } from './ui/common/Toast'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

interface QuarryToolbarProps {
  /** Current directory path */
  currentPath: string
  /** Whether metadata panel is open */
  metaOpen: boolean
  /** Toggle metadata panel */
  onToggleMeta: () => void
  /** Current file (if any) */
  currentFile?: { path: string; name: string } | null
  /** Whether current file is bookmarked */
  isBookmarked?: boolean
  /** Toggle bookmark for current file */
  onToggleBookmark?: () => void
  /** Open bookmarks panel */
  onOpenBookmarks?: () => void
  /** Open preferences */
  onOpenPreferences?: () => void
  /** Open help panel */
  onOpenHelp?: () => void
  /** Open graph view */
  onOpenGraph?: () => void
  /** Open timeline view */
  onOpenTimeline?: () => void
  /** Open contribution modal */
  onOpenContribute?: () => void
  /** Open editor modal */
  onOpenEditor?: () => void
  /** Open Q&A interface */
  onOpenQA?: () => void
  /** Open flashcard quiz */
  onOpenFlashcards?: () => void
  /** Open glossary popover */
  onOpenGlossary?: () => void
  /** Open quiz popover */
  onOpenQuiz?: () => void
  /** Open mind map */
  onOpenMindMap?: () => void
  /** Open research popover */
  onOpenResearch?: () => void
  /** Open categorization review */
  onOpenCategorization?: () => void
  /** Open Share as HTML modal */
  onOpenShareHtml?: () => void
  /** Create new blank strand (Cmd+N) */
  onNewBlank?: () => void
  /** Export canvas as strand (Cmd+E) */
  onExportCanvas?: () => void
  /** Whether canvas has content to export */
  canvasHasContent?: boolean
  /** Undo callback */
  onUndo?: () => void
  /** Redo callback */
  onRedo?: () => void
  /** Whether undo is available */
  canUndo?: boolean
  /** Whether redo is available */
  canRedo?: boolean
  /** Text-to-speech controls */
  ttsState?: TTSState
  ttsSettings?: TTSSettings
  ttsVoices?: TTSVoice[]
  ttsSupported?: boolean
  /** Whether there is content available for TTS to read */
  ttsHasContent?: boolean
  onTTSPlay?: () => void
  onTTSPause?: () => void
  onTTSResume?: () => void
  onTTSStop?: () => void
  onTTSVolumeChange?: (volume: number) => void
  onTTSRateChange?: (rate: number) => void
  onTTSPitchChange?: (pitch: number) => void
  onTTSVoiceChange?: (voice: TTSVoice) => void
  theme?: string
  /** Whether inline block tags are visible */
  showBlockTags?: boolean
  /** Toggle block tags visibility */
  onToggleBlockTags?: () => void
  /** Whether tab bar is visible */
  tabsVisible?: boolean
  /** Toggle tab bar visibility */
  onToggleTabs?: () => void
  /** Whether current file is favorited */
  isFavorite?: boolean
  /** Toggle favorite for current file */
  onToggleFavorite?: () => void
}

/**
 * Toolbar with high-level navigation and actions
 * 
 * @remarks
 * - Search, Architecture, Info buttons
 * - Contribute dropdown with context-aware options
 * - Mobile-optimized with 44px+ touch targets
 * - Tooltips for accessibility
 * 
 * @example
 * ```tsx
 * <QuarryToolbar
 *   currentPath="weaves/tech"
 *   metaOpen={metaOpen}
 *   onToggleMeta={() => setMetaOpen(v => !v)}
 * />
 * ```
 */
export default function QuarryToolbar({
  currentPath,
  metaOpen,
  onToggleMeta,
  currentFile,
  isBookmarked,
  onToggleBookmark,
  onOpenBookmarks,
  onOpenPreferences,
  onOpenHelp,
  onOpenGraph,
  onOpenTimeline,
  onOpenContribute,
  onOpenEditor,
  onOpenQA,
  onOpenFlashcards,
  onOpenGlossary,
  onOpenQuiz,
  onOpenMindMap,
  onOpenResearch,
  onOpenCategorization,
  onOpenShareHtml,
  onNewBlank,
  onExportCanvas,
  canvasHasContent = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  ttsState,
  ttsSettings,
  ttsVoices = [],
  ttsSupported = false,
  ttsHasContent = false,
  onTTSPlay,
  onTTSPause,
  onTTSResume,
  onTTSStop,
  onTTSVolumeChange,
  onTTSRateChange,
  onTTSPitchChange,
  onTTSVoiceChange,
  theme = 'light',
  showBlockTags = true,
  onToggleBlockTags,
  tabsVisible = true,
  onToggleTabs,
  isFavorite = false,
  onToggleFavorite,
}: QuarryToolbarProps) {
  const [showContribute, setShowContribute] = useState(false)
  const [showBookmarkMenu, setShowBookmarkMenu] = useState(false)
  const toast = useToast()
  const resolvePath = useQuarryPath()

  // Quarry Plugin System: Subscribe to plugin toolbar buttons
  const [pluginButtons, setPluginButtons] = useState<typeof pluginUIRegistry.allToolbarButtons>([])
  useEffect(() => {
    setPluginButtons(pluginUIRegistry.allToolbarButtons)
    const unsubscribe = pluginUIRegistry.onChange(() => {
      setPluginButtons([...pluginUIRegistry.allToolbarButtons])
    })
    return unsubscribe
  }, [])

  // Filter for enabled plugins only
  const activePluginButtons = pluginButtons.filter(({ pluginId }) =>
    quarryPluginManager.isEnabled(pluginId)
  )

  // Build contribution URLs
  const currentDir = currentPath || ''
  const baseNewUrl = `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/new/${REPO_CONFIG.BRANCH}/${currentDir ? `${currentDir}/` : ''
    }`
  const addStrandUrl = `${baseNewUrl}?filename=new-strand.md`
  const pathSegments = currentDir.split('/').filter(Boolean)
  let yamlSuggestion = ''
  if (pathSegments[0] === 'weaves') {
    if (pathSegments.length === 2) {
      yamlSuggestion = 'weave.yaml'
    } else if (pathSegments.length > 2) {
      yamlSuggestion = 'loom.yaml'
    }
  }
  const addYamlUrl = yamlSuggestion ? `${baseNewUrl}?filename=${yamlSuggestion}` : ''

  const groups = [
    {
      id: 'discover',
      label: 'Discover',
      items: [
        {
          id: 'search',
          label: 'Search',
          icon: <Compass className="w-4 h-4" />,
          description: 'Advanced search',
          hotkey: '/',
          onClick: () => { window.location.href = resolvePath('/quarry/search') },
        },
        ...(onOpenResearch ? [{
          id: 'research',
          label: 'Research',
          icon: <Globe className="w-4 h-4" />,
          description: 'Web research & citations',
          hotkey: '⇧R',
          onClick: onOpenResearch,
        }] : [{
          id: 'research',
          label: 'Research',
          icon: <Globe className="w-4 h-4" />,
          description: 'Web research & citations',
          hotkey: '⇧R',
          href: resolvePath('/quarry/research'),
        }]),
        ...(onOpenGraph ? [{
          id: 'graph',
          label: 'Graph',
          icon: <Network className="w-4 h-4" />,
          description: 'Full fabric graph (g)',
          hotkey: 'g',
          onClick: onOpenGraph,
        }] : [{
          id: 'graph',
          label: 'Graph',
          icon: <Network className="w-4 h-4" />,
          description: 'Full fabric graph',
          href: resolvePath('/quarry/graph'),
        }]),
        ...(onOpenTimeline ? [{
          id: 'timeline',
          label: 'Timeline',
          icon: <Clock className="w-4 h-4" />,
          description: 'Reading timeline',
          onClick: onOpenTimeline,
        }] : []),
        // Learning Path - show different options based on whether a file is selected
        ...(currentFile ? [
          {
            id: 'spiral-path-goal',
            label: 'Learn This',
            icon: <Target className="w-4 h-4" />,
            description: 'Set this strand as learning goal',
            onClick: () => {
              const url = new URL(resolvePath('/quarry/spiral-path/'), window.location.origin)
              url.searchParams.set('strand', currentFile.path)
              url.searchParams.set('as', 'goal')
              window.location.href = url.toString()
            },
          },
          {
            id: 'spiral-path-start',
            label: 'Start From Here',
            icon: <Play className="w-4 h-4" />,
            description: 'Set this strand as starting point',
            onClick: () => {
              const url = new URL(resolvePath('/quarry/spiral-path/'), window.location.origin)
              url.searchParams.set('strand', currentFile.path)
              url.searchParams.set('as', 'start')
              window.location.href = url.toString()
            },
          },
        ] : []),
        {
          id: 'spiral-path',
          label: 'Learning Path',
          icon: <Route className="w-4 h-4" />,
          description: 'Open spiral learning path planner',
          href: resolvePath('/quarry/spiral-path/'),
        },
      ],
    },
    {
      id: 'create',
      label: 'Create',
      items: [
        ...(onNewBlank ? [{
          id: 'new-blank',
          label: 'New Blank',
          icon: <FileText className="w-4 h-4" />,
          description: 'Start with empty editor (Cmd+N)',
          hotkey: 'Cmd+N',
          onClick: onNewBlank,
        }] : []),
        {
          id: 'new-strand',
          label: 'New Strand',
          icon: <Sparkles className="w-4 h-4" />,
          description: 'Create with wizard (Cmd+Shift+N)',
          hotkey: 'Cmd+Shift+N',
          href: resolvePath('/quarry/new/'),
        },
        {
          id: 'write',
          label: 'Write',
          icon: <PenLine className="w-4 h-4" />,
          description: 'Focused writing for stories & essays',
          href: resolvePath('/quarry/write/'),
        },
        {
          id: 'reflect',
          label: 'Reflect',
          icon: <BookHeart className="w-4 h-4" />,
          description: 'Personal journaling with calendar',
          href: resolvePath('/quarry/reflect/'),
        },
        ...(onExportCanvas ? [{
          id: 'from-canvas',
          label: 'From Canvas',
          icon: <Edit3 className="w-4 h-4" />,
          description: canvasHasContent ? 'Export whiteboard as strand (Cmd+E)' : 'Canvas is empty',
          hotkey: 'Cmd+E',
          onClick: onExportCanvas,
          disabled: !canvasHasContent,
        }] : []),
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        ...(currentFile && onOpenEditor ? [{
          id: 'edit-strand',
          label: 'Edit Strand',
          icon: <Edit3 className="w-4 h-4" />,
          description: 'Edit in WYSIWYG editor (e)',
          hotkey: 'e',
          onClick: onOpenEditor,
        }] : []),
        ...(onToggleBookmark ? [{
          id: 'bookmark',
          label: isBookmarked ? 'Saved' : 'Save',
          icon: isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />,
          description: isBookmarked ? 'Remove bookmark (b)' : 'Bookmark this strand (b)',
          hotkey: 'b',
          disabled: !currentFile,
          onClick: () => onToggleBookmark && onToggleBookmark(),
        }] : []),
        // Delete strand moved from System
        ...(currentFile ? [{
          id: 'delete-strand',
          label: 'Delete',
          icon: <GitPullRequest className="w-4 h-4 text-red-500" />,
          description: 'Delete strand (GitHub PR)',
          onClick: () => {
            window.open(
              `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/delete/${REPO_CONFIG.BRANCH}/${currentFile.path}`,
              '_blank',
              'noopener,noreferrer'
            )
          },
        }] : []),
        // Share as HTML (for offline sharing)
        ...(currentFile && onOpenShareHtml ? [{
          id: 'share-html',
          label: 'Share HTML',
          icon: <Share2 className="w-4 h-4" />,
          description: 'Export as standalone HTML file',
          hotkey: '⇧S',
          onClick: onOpenShareHtml,
        }] : []),
        // Categorization
        ...(onOpenCategorization ? [{
          id: 'categorize',
          label: 'Categorize',
          icon: <FolderTree className="w-4 h-4" />,
          description: 'Review inbox categorizations',
          onClick: onOpenCategorization,
        }] : []),
        // Undo/Redo
        ...(onUndo ? [{
          id: 'undo',
          label: 'Undo',
          icon: <Undo2 className={`w-4 h-4 ${!canUndo ? 'opacity-40' : ''}`} />,
          description: 'Undo last action (Ctrl+Z)',
          hotkey: 'Ctrl+Z',
          disabled: !canUndo,
          onClick: onUndo,
        }] : []),
        ...(onRedo ? [{
          id: 'redo',
          label: 'Redo',
          icon: <Redo2 className={`w-4 h-4 ${!canRedo ? 'opacity-40' : ''}`} />,
          description: 'Redo last action (Ctrl+Shift+Z)',
          hotkey: 'Ctrl+Shift+Z',
          disabled: !canRedo,
          onClick: onRedo,
        }] : []),
      ],
    },
    {
      id: 'learn',
      label: 'Learn',
      items: [
        {
          id: 'learning-studio',
          label: 'Learning Studio',
          icon: <GraduationCap className="w-4 h-4" />,
          description: 'Full learning experience (l)',
          hotkey: 'l',
          // Learn studio works with or without a strand selected
          href: currentFile
            ? resolvePath(`/quarry/learn?strand=${encodeURIComponent(currentFile.path)}`)
            : resolvePath('/quarry/learn'),
        },
        ...(onOpenFlashcards ? [{
          id: 'flashcards',
          label: 'Flashcards',
          icon: <Lightbulb className="w-4 h-4" />,
          description: 'Study with flashcards (f)',
          hotkey: 'f',
          onClick: onOpenFlashcards,
        }] : []),
        ...(onOpenGlossary ? [{
          id: 'glossary',
          label: 'Glossary',
          icon: <Book className="w-4 h-4" />,
          description: 'View key terms (g)',
          hotkey: 'g',
          onClick: onOpenGlossary,
        }] : []),
        ...(onOpenQuiz ? [{
          id: 'quiz',
          label: 'Quick Quiz',
          icon: <ListChecks className="w-4 h-4" />,
          description: 'Test your knowledge (q)',
          hotkey: 'q',
          onClick: onOpenQuiz,
        }] : []),
        ...(onOpenMindMap ? [{
          id: 'mindmap',
          label: 'Mind Map',
          icon: <Map className="w-4 h-4" />,
          description: 'Knowledge mind map (M)',
          hotkey: 'M',
          onClick: onOpenMindMap,
        }] : []),
        {
          id: 'suggestions',
          label: 'Suggest',
          icon: <Sparkles className="w-4 h-4" />,
          description: 'Get study suggestions',
          href: currentFile
            ? resolvePath(`/quarry/suggestions?strand=${encodeURIComponent(currentFile.path)}`)
            : resolvePath('/quarry/suggestions'),
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'info',
          label: 'Info',
          icon: <Info className="w-4 h-4" />,
          description: 'Toggle metadata panel (m)',
          hotkey: 'm',
          onClick: onToggleMeta,
        },
        // Block tags toggle
        ...(onToggleBlockTags ? [{
          id: 'block-tags',
          label: showBlockTags ? 'Hide Tags' : 'Show Tags',
          icon: <Hash className={`w-4 h-4 ${showBlockTags ? 'text-cyan-500' : ''}`} />,
          description: showBlockTags ? 'Hide inline #hashtags in content' : 'Show inline #hashtags in content',
          onClick: onToggleBlockTags,
          isActive: showBlockTags,
        }] : []),
        // Tab bar toggle
        ...(onToggleTabs ? [{
          id: 'toggle-tabs',
          label: tabsVisible ? 'Hide Tabs' : 'Show Tabs',
          icon: tabsVisible
            ? <PanelTop className="w-4 h-4 text-cyan-500" />
            : <PanelTopOpen className="w-4 h-4" />,
          description: tabsVisible
            ? 'Hide the tab bar (currently visible)'
            : 'Show the tab bar (currently hidden)',
          onClick: onToggleTabs,
          isActive: tabsVisible,
        }] : []),
        // Help moved from System
        ...(onOpenHelp ? [{
          id: 'help',
          label: 'Help',
          icon: <LifeBuoy className="w-4 h-4" />,
          description: 'Help & Keyboard Shortcuts (?)',
          hotkey: '?',
          onClick: onOpenHelp,
        }] : []),
        // Settings moved from System
        ...(onOpenPreferences ? [{
          id: 'settings',
          label: 'Settings',
          icon: <Settings className="w-4 h-4" />,
          description: 'Preferences (,)',
          hotkey: ',',
          onClick: onOpenPreferences,
        }] : []),
        // Activity log
        {
          id: 'activity',
          label: 'Activity',
          icon: <Activity className="w-4 h-4" />,
          description: 'View activity log & undo history',
          href: resolvePath('/quarry/activity'),
        },
      ],
    },
    // Quarry Plugin System: Plugin toolbar buttons
    ...(activePluginButtons.length > 0 ? [{
      id: 'plugins',
      label: 'Plugins',
      items: activePluginButtons.map(({ pluginId, options }) => ({
        id: `plugin-${pluginId}-${options.id}`,
        label: options.label,
        icon: React.isValidElement(options.icon) ? options.icon : <Puzzle className="w-4 h-4" />,
        description: options.shortcut
          ? `${options.label} (${options.shortcut})`
          : options.label,
        hotkey: options.shortcut,
        onClick: () => {
          try {
            options.onClick()
          } catch (error) {
            console.error(`[Plugin:${pluginId}] Button error:`, error)
            toast.error(`Plugin error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        },
        isActive: options.isActive,
      })),
    }] : []),
    // ASK - Direct button after View (no dropdown, direct action)
    ...(onOpenQA ? [{
      id: 'ask',
      label: 'Ask',
      directAction: true, // Renders as a direct button, not a dropdown
      items: [
        {
          id: 'ask-brain',
          label: 'Ask',
          icon: <Brain className="w-4 h-4" />,
          description: 'Ask your knowledge base (Ctrl+K)',
          hotkey: 'Ctrl+K',
          onClick: onOpenQA,
        },
      ],
    }] : []),
  ]

  // Get user profile for display
  const profile = getUserProfile()

  return (
    <div className="flex items-center gap-2 sm:gap-4 justify-between w-full overflow-hidden">
      <ResponsiveToolbar
        groups={groups as any}
      />

      <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
        {/* Favorite Toggle - Star button */}
        {currentFile && onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={`
              relative group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
              ${isFavorite
                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-500 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800/50'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
              }
            `}
            aria-label={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-zinc-900 dark:bg-zinc-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700" />
            </div>
          </button>
        )}

        {/* Block Tags Toggle - Visible button with tooltip */}
        {onToggleBlockTags && (
          <button
            onClick={onToggleBlockTags}
            className={`
              relative group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
              ${showBlockTags
                ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-800/50'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
              }
            `}
            aria-label={showBlockTags ? 'Hide block tags' : 'Show block tags'}
          >
            <Hash className="w-4 h-4" />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-zinc-900 dark:bg-zinc-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              {showBlockTags ? 'Hide inline #hashtags (enabled)' : 'Show inline #hashtags (disabled)'}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700" />
            </div>
          </button>
        )}

        {/* TTS Controls */}
        {ttsSupported && ttsState && ttsSettings && onTTSPlay && (
          <TTSControls
            state={ttsState}
            settings={ttsSettings}
            availableVoices={ttsVoices}
            isSupported={ttsSupported}
            hasContent={ttsHasContent}
            onPlay={onTTSPlay}
            onPause={onTTSPause || (() => { })}
            onResume={onTTSResume || (() => { })}
            onStop={onTTSStop || (() => { })}
            onVolumeChange={onTTSVolumeChange || (() => { })}
            onRateChange={onTTSRateChange || (() => { })}
            onPitchChange={onTTSPitchChange || (() => { })}
            onVoiceChange={onTTSVoiceChange || (() => { })}
            theme={theme}
          />
        )}

        {/* Profile Indicator */}
        {onOpenPreferences && (
          <button
            onClick={onOpenPreferences}
            className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 py-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
            title={`${profile.displayName} • Click to open settings`}
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shadow-sm ring-2 ring-white dark:ring-zinc-900 group-hover:ring-cyan-200 dark:group-hover:ring-cyan-800 transition-all">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <span className="hidden sm:block text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors max-w-[80px] truncate">
              {profile.displayName}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}







