/**
 * Bundled Default Plugins
 *
 * These plugins are bundled with Quarry and cannot be removed in PUBLIC_ACCESS mode.
 * They are loaded directly from the codebase instead of from a CDN.
 *
 * @module lib/plugins/bundledPlugins
 */

import type { PluginManifest } from './types'

// ============================================================================
// PUBLIC ACCESS MODE
// ============================================================================

/**
 * Check if we're in public access mode
 * In public mode, users cannot install or remove plugins
 */
export function isPublicAccess(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_ACCESS === 'true'
  }
  return (window as any).__QUARRY_PUBLIC_ACCESS__ === true
}

/**
 * Check if a plugin is a bundled default plugin
 */
export function isBundledPlugin(pluginId: string): boolean {
  return BUNDLED_PLUGIN_IDS.includes(pluginId)
}

/**
 * Check if a plugin can be uninstalled
 * Bundled plugins cannot be uninstalled in public access mode
 */
export function canUninstallPlugin(pluginId: string): boolean {
  if (!isPublicAccess()) return true
  return !isBundledPlugin(pluginId)
}

/**
 * Check if new plugins can be installed
 * No new plugins can be installed in public access mode
 */
export function canInstallPlugins(): boolean {
  return !isPublicAccess()
}

// ============================================================================
// BUNDLED PLUGIN DEFINITIONS
// ============================================================================

/**
 * IDs of all bundled plugins
 */
export const BUNDLED_PLUGIN_IDS = [
  'com.quarry.pomodoro-timer',
  'com.quarry.citation-manager',
  'com.quarry.custom-callouts',
  'com.quarry.latex-math',
]

/**
 * Bundled plugin manifests
 */
export const BUNDLED_MANIFESTS: Record<string, PluginManifest> = {
  'com.quarry.pomodoro-timer': {
    id: 'com.quarry.pomodoro-timer',
    name: 'Pomodoro Timer',
    version: '1.0.0',
    description: 'A simple pomodoro timer widget for focused work sessions',
    author: 'Quarry Team',
    authorUrl: 'https://quarry.frame.dev',
    minQuarryVersion: '1.0.0',
    main: 'main.js',
    styles: 'styles.css',
    type: 'widget',
    position: 'sidebar',
    settings: {
      workDuration: {
        type: 'number',
        default: 25,
        label: 'Work Duration',
        description: 'Duration of work sessions in minutes',
        min: 1,
        max: 120,
      },
      breakDuration: {
        type: 'number',
        default: 5,
        label: 'Break Duration',
        description: 'Duration of break sessions in minutes',
        min: 1,
        max: 30,
      },
      longBreakDuration: {
        type: 'number',
        default: 15,
        label: 'Long Break Duration',
        description: 'Duration of long break after 4 sessions',
        min: 5,
        max: 60,
      },
      autoStartBreaks: {
        type: 'boolean',
        default: false,
        label: 'Auto-start Breaks',
        description: 'Automatically start break timer when work ends',
      },
      soundEnabled: {
        type: 'boolean',
        default: true,
        label: 'Sound Notifications',
        description: 'Play sound when timer completes',
      },
    },
  },

  'com.quarry.citation-manager': {
    id: 'com.quarry.citation-manager',
    name: 'Citation Manager',
    version: '1.0.0',
    description: 'Manage academic citations with [@key] syntax and BibTeX support',
    author: 'Quarry Team',
    authorUrl: 'https://quarry.frame.dev',
    minQuarryVersion: '1.0.0',
    main: 'main.js',
    styles: 'styles.css',
    type: 'renderer',
    position: 'sidebar',
    settings: {
      citationStyle: {
        type: 'select',
        default: 'apa',
        label: 'Citation Style',
        description: 'Default citation format',
        options: [
          { value: 'apa', label: 'APA' },
          { value: 'mla', label: 'MLA' },
          { value: 'chicago', label: 'Chicago' },
          { value: 'harvard', label: 'Harvard' },
          { value: 'ieee', label: 'IEEE' },
        ],
      },
      showTooltips: {
        type: 'boolean',
        default: true,
        label: 'Show Tooltips',
        description: 'Show citation details on hover',
      },
      linkToDOI: {
        type: 'boolean',
        default: true,
        label: 'Link to DOI',
        description: 'Make citations clickable links to DOI',
      },
    },
  },

  'com.quarry.custom-callouts': {
    id: 'com.quarry.custom-callouts',
    name: 'Custom Callouts',
    version: '1.0.0',
    description: 'Add beautiful callout blocks with :::type[title] syntax',
    author: 'Quarry Team',
    authorUrl: 'https://quarry.frame.dev',
    minQuarryVersion: '1.0.0',
    main: 'main.js',
    styles: 'styles.css',
    type: 'renderer',
    position: 'content',
    settings: {
      showIcons: {
        type: 'boolean',
        default: true,
        label: 'Show Icons',
        description: 'Display icons in callout headers',
      },
      collapsible: {
        type: 'boolean',
        default: true,
        label: 'Collapsible',
        description: 'Allow callouts to be collapsed',
      },
      defaultCollapsed: {
        type: 'boolean',
        default: false,
        label: 'Default Collapsed',
        description: 'Start callouts in collapsed state',
      },
    },
  },

  'com.quarry.latex-math': {
    id: 'com.quarry.latex-math',
    name: 'LaTeX Math Renderer',
    version: '1.0.0',
    description: 'Render mathematical equations and formulas using KaTeX with $...$ and $$...$$ syntax',
    author: 'Quarry Team',
    authorUrl: 'https://quarry.frame.dev',
    minQuarryVersion: '1.0.0',
    main: 'main.js',
    styles: 'styles.css',
    type: 'renderer',
    position: 'content',
    settings: {
      displayMode: {
        type: 'select',
        default: 'normal',
        label: 'Display Mode',
        description: 'Display density for equations',
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'compact', label: 'Compact' },
        ],
      },
      renderQuality: {
        type: 'select',
        default: 'high',
        label: 'Render Quality',
        description: 'Rendering quality (affects performance)',
        options: [
          { value: 'high', label: 'High Quality' },
          { value: 'low', label: 'Low Quality (Faster)' },
        ],
      },
      enableChem: {
        type: 'boolean',
        default: true,
        label: 'Chemistry Equations',
        description: 'Enable mhchem extension for chemistry formulas',
      },
      enableCopyOnClick: {
        type: 'boolean',
        default: true,
        label: 'Copy on Click',
        description: 'Click equation to copy LaTeX source',
      },
      fontSize: {
        type: 'slider',
        default: 100,
        label: 'Font Size',
        description: 'Font size percentage',
        min: 80,
        max: 150,
        step: 10,
      },
      errorColor: {
        type: 'select',
        default: 'red',
        label: 'Error Color',
        description: 'Color for rendering errors',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'orange', label: 'Orange' },
          { value: 'gray', label: 'Gray' },
        ],
      },
    },
  },
}

// ============================================================================
// BUNDLED PLUGIN CODE
// ============================================================================

/**
 * Pomodoro Timer Plugin Code
 */
const POMODORO_CODE = `
// React is passed as a parameter by the plugin loader
const { useState, useEffect, useCallback } = React;

function PomodoroWidget({ api, settings, theme, isDark }) {
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    setTimeLeft((isBreak ? settings.breakDuration : settings.workDuration) * 60);
  }, [settings.workDuration, settings.breakDuration, isBreak]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsRunning(false);
          if (settings.soundEnabled) {
            try { new Audio('/sounds/bell.mp3').play(); } catch {}
          }
          if (!isBreak) {
            setSessions(s => s + 1);
            api.showNotice('Work session complete! Take a break.', 'success');
          } else {
            api.showNotice('Break over! Ready to work?', 'info');
          }
          if (settings.autoStartBreaks && !isBreak) {
            setIsBreak(true);
            setIsRunning(true);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isBreak, settings]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
  };

  const toggle = () => setIsRunning(!isRunning);
  const reset = () => {
    setIsRunning(false);
    setTimeLeft((isBreak ? settings.breakDuration : settings.workDuration) * 60);
  };
  const switchMode = () => {
    setIsBreak(!isBreak);
    setIsRunning(false);
  };

  const bg = isDark ? 'bg-zinc-800' : 'bg-zinc-100';
  const text = isDark ? 'text-zinc-100' : 'text-zinc-900';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const accent = isBreak ? 'text-green-500' : 'text-red-500';

  return React.createElement('div', { className: 'p-3 ' + text },
    React.createElement('div', { className: 'flex items-center justify-between mb-2' },
      React.createElement('span', { className: 'text-xs font-medium uppercase ' + muted },
        isBreak ? 'Break' : 'Focus'),
      React.createElement('span', { className: 'text-xs ' + muted }, 'Sessions: ' + sessions)
    ),
    React.createElement('div', { className: 'text-center py-4 ' + bg + ' rounded-lg mb-3' },
      React.createElement('div', { className: 'text-3xl font-mono font-bold ' + accent },
        formatTime(timeLeft))
    ),
    React.createElement('div', { className: 'flex gap-2' },
      React.createElement('button', {
        onClick: toggle,
        className: 'flex-1 py-1.5 rounded text-sm font-medium ' + (isRunning
          ? 'bg-yellow-500 text-white'
          : 'bg-green-500 text-white')
      }, isRunning ? 'Pause' : 'Start'),
      React.createElement('button', {
        onClick: reset,
        className: 'px-3 py-1.5 rounded text-sm ' + bg
      }, 'Reset'),
      React.createElement('button', {
        onClick: switchMode,
        className: 'px-3 py-1.5 rounded text-sm ' + bg
      }, isBreak ? 'Work' : 'Break')
    )
  );
}

class PomodoroTimerPlugin {
  async onLoad() {
    this.api.registerSidebarWidget(PomodoroWidget);
  }
  async onUnload() {}
}

module.exports = PomodoroTimerPlugin;
`

const POMODORO_STYLES = `
.pomodoro-widget { transition: all 0.2s ease; }
`

/**
 * Citation Manager Plugin Code
 */
const CITATION_CODE = `
// React is passed as a parameter by the plugin loader

function CitationReference({ match, api }) {
  const key = match[1];
  const settings = api.getContext().settings || {};
  const isDark = api.getContext().isDark;

  return React.createElement('span', {
    className: 'citation-ref cursor-pointer ' + (isDark ? 'text-blue-400' : 'text-blue-600'),
    title: settings.showTooltips ? 'Citation: ' + key : undefined,
    onClick: () => api.showNotice('Citation: ' + key, 'info')
  }, '[' + key + ']');
}

class CitationManagerPlugin {
  async onLoad() {
    this.api.registerMarkdownRenderer({
      pattern: /\\[@([^\\]]+)\\]/g,
      component: CitationReference,
      priority: 10
    });
  }
  async onUnload() {}
}

module.exports = CitationManagerPlugin;
`

const CITATION_STYLES = `
.citation-ref { transition: color 0.15s ease; }
.citation-ref:hover { text-decoration: underline; }
`

/**
 * Custom Callouts Plugin Code
 */
const CALLOUTS_CODE = `
// React is passed as a parameter by the plugin loader
const { useState } = React;

const CALLOUT_CONFIG = {
  tip: { icon: '💡', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500' },
  warning: { icon: '⚠️', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-500' },
  danger: { icon: '🚨', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500' },
  info: { icon: 'ℹ️', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500' },
  note: { icon: '📝', bg: 'bg-zinc-50 dark:bg-zinc-800', border: 'border-zinc-400' },
  success: { icon: '✅', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500' }
};

function CalloutRenderer({ match, content }) {
  const [collapsed, setCollapsed] = useState(false);
  const type = (match[1] || 'note').toLowerCase();
  const title = match[2] || type.charAt(0).toUpperCase() + type.slice(1);
  const body = match[3] || '';
  const config = CALLOUT_CONFIG[type] || CALLOUT_CONFIG.note;

  return React.createElement('div', {
    className: 'callout my-4 rounded-lg border-l-4 ' + config.border + ' ' + config.bg
  },
    React.createElement('div', {
      className: 'flex items-center gap-2 px-4 py-2 cursor-pointer font-medium',
      onClick: () => setCollapsed(!collapsed)
    },
      React.createElement('span', null, config.icon),
      React.createElement('span', null, title),
      React.createElement('span', { className: 'ml-auto text-xs opacity-50' },
        collapsed ? '▶' : '▼')
    ),
    !collapsed && React.createElement('div', {
      className: 'px-4 pb-3 text-sm opacity-90'
    }, body)
  );
}

class CustomCalloutsPlugin {
  async onLoad() {
    this.api.registerMarkdownRenderer({
      pattern: /:::([a-z]+)\\[([^\\]]*)\\]\\n([\\s\\S]*?):::/gm,
      component: CalloutRenderer,
      priority: 5
    });
  }
  async onUnload() {}
}

module.exports = CustomCalloutsPlugin;
`

const CALLOUTS_STYLES = `
.callout { transition: all 0.2s ease; }
.callout:hover { transform: translateX(2px); }
`

/**
 * LaTeX Math Renderer Plugin Code
 */
const LATEX_CODE = `
// React is passed as a parameter by the plugin loader
const { useState, useCallback } = React;

class LatexMathPlugin {
  constructor() {
    this.manifest = null;
    this.api = null;
    this.context = null;
  }

  async onLoad() {
    // Register markdown renderer for inline and block math
    this.api.registerMarkdownRenderer({
      // Match both inline $...$ and block $$...$$ patterns
      pattern: /(\$\$[^\$]+\$\$|\$[^\$]+\$)/g,
      component: LatexRenderer,
      priority: 100, // High priority to process before other renderers
    });

    this.api.log('LaTeX Math Renderer loaded');
  }

  async onUnload() {
    this.api.log('LaTeX Math Renderer unloaded');
  }
}

// LaTeX Renderer Component
function LatexRenderer({ match, api, content, pluginId }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const settings = api.getContext().settings;
  const latex = match[0];
  const isBlock = latex.startsWith('$$');
  const source = isBlock ? latex.slice(2, -2).trim() : latex.slice(1, -1).trim();

  // Render equation using KaTeX
  const renderMath = useCallback(() => {
    try {
      if (typeof window === 'undefined') return null;

      // Lazy load KaTeX
      const katex = window.katex;
      if (!katex) {
        setError('KaTeX library not loaded');
        return null;
      }

      const options = {
        displayMode: isBlock,
        throwOnError: false,
        strict: settings.renderQuality === 'high' ? 'error' : 'ignore',
        macros: {
          '\\\\ce': '\\\\ce', // Chemistry extension
        },
      };

      // Add mhchem if enabled
      if (settings.enableChem && katex.macros) {
        Object.assign(options.macros, katex.macros);
      }

      const html = katex.renderToString(source, options);
      return html;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [source, isBlock, settings]);

  const handleCopy = useCallback(() => {
    if (!settings.enableCopyOnClick) return;

    navigator.clipboard.writeText(source).then(() => {
      setCopied(true);
      api.showNotice('LaTeX copied to clipboard', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [source, settings.enableCopyOnClick, api]);

  const html = renderMath();

  if (error) {
    const errorColorClass = settings.errorColor === 'red' ? 'border-red-500 text-red-600' :
                            settings.errorColor === 'orange' ? 'border-orange-500 text-orange-600' :
                            'border-gray-500 text-gray-600';

    return React.createElement('span', {
      className: \`inline-block px-2 py-1 rounded border-2 \${errorColorClass} text-xs font-mono\`,
      title: \`LaTeX Error: \${error}\`,
    }, \`[Math Error: \${source.substring(0, 20)}...]\`);
  }

  if (!html) {
    return React.createElement('span', { className: 'text-gray-500 italic' }, '[Loading math...]');
  }

  const fontSize = settings.fontSize || 100;
  const displayClass = settings.displayMode === 'compact' ? 'latex-compact' : 'latex-normal';
  const cursor = settings.enableCopyOnClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : '';

  return React.createElement('span', {
    className: \`latex-math \${isBlock ? 'latex-block' : 'latex-inline'} \${displayClass} \${cursor} \${copied ? 'copied' : ''}\`,
    style: { fontSize: \`\${fontSize}%\` },
    onClick: handleCopy,
    title: settings.enableCopyOnClick ? 'Click to copy LaTeX' : '',
    dangerouslySetInnerHTML: { __html: html },
  });
}

module.exports = LatexMathPlugin;
`

/**
 * LaTeX Math Renderer Styles
 */
const LATEX_STYLES = `
.latex-math {
  display: inline-block;
  transition: all 0.2s ease;
}

.latex-block {
  display: block;
  text-align: center;
  margin: 1em 0;
  padding: 0.5em;
}

.latex-inline {
  margin: 0 0.2em;
  vertical-align: middle;
}

.latex-compact .katex {
  font-size: 0.9em;
}

.latex-math.copied {
  background-color: rgba(34, 197, 94, 0.1);
  border-radius: 4px;
}

/* KaTeX override for better integration */
.latex-math .katex {
  font-size: 1.1em;
}

.latex-math .katex-display {
  margin: 0;
}
`

/**
 * Bundled plugin code and styles
 */
export const BUNDLED_CODE: Record<string, { code: string; styles: string }> = {
  'com.quarry.pomodoro-timer': {
    code: POMODORO_CODE,
    styles: POMODORO_STYLES,
  },
  'com.quarry.citation-manager': {
    code: CITATION_CODE,
    styles: CITATION_STYLES,
  },
  'com.quarry.custom-callouts': {
    code: CALLOUTS_CODE,
    styles: CALLOUTS_STYLES,
  },
  'com.quarry.latex-math': {
    code: LATEX_CODE,
    styles: LATEX_STYLES,
  },
}

/**
 * Get bundled plugin data
 */
export function getBundledPlugin(pluginId: string): {
  manifest: PluginManifest
  code: string
  styles: string
} | null {
  const manifest = BUNDLED_MANIFESTS[pluginId]
  const bundle = BUNDLED_CODE[pluginId]

  if (!manifest || !bundle) return null

  return {
    manifest,
    code: bundle.code,
    styles: bundle.styles,
  }
}

/**
 * Get all bundled plugins
 */
export function getAllBundledPlugins(): Array<{
  manifest: PluginManifest
  code: string
  styles: string
}> {
  return BUNDLED_PLUGIN_IDS.map((id) => getBundledPlugin(id)).filter(Boolean) as Array<{
    manifest: PluginManifest
    code: string
    styles: string
  }>
}
