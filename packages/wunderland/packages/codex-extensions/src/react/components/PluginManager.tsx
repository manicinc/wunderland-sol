/**
 * Plugin Manager Modal - VST-style plugin browser
 * @module @framers/codex-extensions/react
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { PluginManifest, PluginState, Theme } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface PluginManagerProps {
  isOpen: boolean;
  onClose: () => void;

  // Plugin data
  plugins: PluginManifest[];
  pluginStates: Map<string, PluginState>;

  // Theme data
  themes: Theme[];
  activeTheme: string | null;

  // Actions
  onInstallPlugin: (manifest: PluginManifest) => Promise<void>;
  onUninstallPlugin: (id: string) => Promise<void>;
  onEnablePlugin: (id: string) => Promise<void>;
  onDisablePlugin: (id: string) => Promise<void>;
  onOpenPluginSettings: (id: string) => void;

  // Theme actions
  onInstallTheme: (theme: Theme) => void;
  onSetTheme: (id: string | null) => void;
  onExportTheme: (id: string) => void;
  onImportTheme: () => void;

  // Styling
  theme?: string;
}

type TabId = 'plugins' | 'themes';
type CategoryFilter = 'all' | 'installed' | 'updates' | string;

// ============================================================================
// Component
// ============================================================================

export function PluginManager({
  isOpen,
  onClose,
  plugins,
  pluginStates,
  themes,
  activeTheme,
  onInstallPlugin,
  onUninstallPlugin,
  onEnablePlugin,
  onDisablePlugin,
  onOpenPluginSettings,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onInstallTheme,
  onSetTheme,
  onExportTheme,
  onImportTheme,
  theme = 'light',
}: PluginManagerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('plugins');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState<string | null>(null);

  const isDark = theme.includes('dark');

  // Filter plugins
  const filteredPlugins = useMemo(() => {
    let result = [...plugins];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter === 'installed') {
      result = result.filter(p => pluginStates.has(p.id));
    } else if (categoryFilter === 'updates') {
      // TODO: Check for updates
      result = [];
    } else if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }

    return result;
  }, [plugins, pluginStates, searchQuery, categoryFilter]);

  // Filter themes
  const filteredThemes = useMemo(() => {
    if (!searchQuery) return themes;
    const query = searchQuery.toLowerCase();
    return themes.filter(
      t =>
        t.manifest.name.toLowerCase().includes(query) ||
        t.manifest.description.toLowerCase().includes(query)
    );
  }, [themes, searchQuery]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    plugins.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [plugins]);

  // Handlers
  const handleTogglePlugin = useCallback(
    async (id: string) => {
      const state = pluginStates.get(id);
      setLoading(id);
      try {
        if (state?.enabled) {
          await onDisablePlugin(id);
        } else {
          await onEnablePlugin(id);
        }
      } finally {
        setLoading(null);
      }
    },
    [pluginStates, onEnablePlugin, onDisablePlugin]
  );

  const handleInstall = useCallback(
    async (manifest: PluginManifest) => {
      setLoading(manifest.id);
      try {
        await onInstallPlugin(manifest);
      } finally {
        setLoading(null);
      }
    },
    [onInstallPlugin]
  );

  const handleUninstall = useCallback(
    async (id: string) => {
      setLoading(id);
      try {
        await onUninstallPlugin(id);
      } finally {
        setLoading(null);
      }
    },
    [onUninstallPlugin]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative w-full max-w-4xl max-h-[85vh] mx-4
          ${isDark ? 'bg-zinc-900' : 'bg-white'}
          rounded-xl shadow-2xl overflow-hidden
          flex flex-col
        `}
      >
        {/* Header */}
        <div
          className={`
          flex items-center justify-between px-6 py-4
          border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
        `}
        >
          <div className="flex items-center gap-4">
            <h2
              className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}
            >
              Plugin Manager
            </h2>

            {/* Tabs */}
            <div
              className={`
              flex rounded-lg p-1
              ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
            `}
            >
              <button
                onClick={() => setActiveTab('plugins')}
                className={`
                  px-4 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${
                    activeTab === 'plugins'
                      ? isDark
                        ? 'bg-zinc-700 text-white'
                        : 'bg-white text-zinc-900 shadow-sm'
                      : isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-600 hover:text-zinc-900'
                  }
                `}
              >
                🧩 Plugins
              </button>
              <button
                onClick={() => setActiveTab('themes')}
                className={`
                  px-4 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${
                    activeTab === 'themes'
                      ? isDark
                        ? 'bg-zinc-700 text-white'
                        : 'bg-white text-zinc-900 shadow-sm'
                      : isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-600 hover:text-zinc-900'
                  }
                `}
              >
                🎨 Themes
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`
              p-2 rounded-lg transition-colors
              ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
            `}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div
            className={`
            w-48 shrink-0 border-r overflow-y-auto
            ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}
          `}
          >
            {/* Search */}
            <div className="p-3">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`
                  w-full px-3 py-2 text-sm rounded-lg
                  ${
                    isDark
                      ? 'bg-zinc-800 text-white placeholder-zinc-500 border-zinc-700'
                      : 'bg-white text-zinc-900 placeholder-zinc-400 border-zinc-200'
                  }
                  border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                `}
              />
            </div>

            {/* Categories */}
            <nav className="px-2 pb-4">
              <div
                className={`text-xs font-medium uppercase tracking-wider px-2 py-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
              >
                Filter
              </div>

              <CategoryButton
                label="All"
                count={plugins.length}
                active={categoryFilter === 'all'}
                onClick={() => setCategoryFilter('all')}
                isDark={isDark}
              />
              <CategoryButton
                label="Installed"
                count={Array.from(pluginStates.values()).length}
                active={categoryFilter === 'installed'}
                onClick={() => setCategoryFilter('installed')}
                isDark={isDark}
              />
              <CategoryButton
                label="Updates"
                count={0}
                active={categoryFilter === 'updates'}
                onClick={() => setCategoryFilter('updates')}
                isDark={isDark}
              />

              <div
                className={`text-xs font-medium uppercase tracking-wider px-2 py-2 mt-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
              >
                Categories
              </div>

              {categories.map(cat => (
                <CategoryButton
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  count={plugins.filter(p => p.category === cat).length}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                  isDark={isDark}
                />
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'plugins' && (
              <div className="space-y-3">
                {filteredPlugins.length === 0 ? (
                  <div
                    className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                  >
                    No plugins found
                  </div>
                ) : (
                  filteredPlugins.map(plugin => (
                    <PluginCard
                      key={plugin.id}
                      plugin={plugin}
                      state={pluginStates.get(plugin.id)}
                      loading={loading === plugin.id}
                      onToggle={() => handleTogglePlugin(plugin.id)}
                      onInstall={() => handleInstall(plugin)}
                      onUninstall={() => handleUninstall(plugin.id)}
                      onSettings={() => onOpenPluginSettings(plugin.id)}
                      isDark={isDark}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'themes' && (
              <div>
                {/* Theme actions */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={onImportTheme}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      ${
                        isDark
                          ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                          : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                      }
                    `}
                  >
                    Import Theme
                  </button>
                </div>

                {/* Theme grid */}
                <div className="grid grid-cols-2 gap-4">
                  {filteredThemes.map(t => (
                    <ThemeCard
                      key={t.manifest.id}
                      theme={t}
                      isActive={activeTheme === t.manifest.id}
                      onSelect={() => onSetTheme(t.manifest.id)}
                      onExport={() => onExportTheme(t.manifest.id)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function CategoryButton({
  label,
  count,
  active,
  onClick,
  isDark,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors
        ${
          active
            ? isDark
              ? 'bg-zinc-800 text-white'
              : 'bg-white text-zinc-900 shadow-sm'
            : isDark
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'
        }
      `}
    >
      <span>{label}</span>
      <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {count}
      </span>
    </button>
  );
}

function PluginCard({
  plugin,
  state,
  loading,
  onToggle,
  onInstall,
  onUninstall,
  onSettings,
  isDark,
}: {
  plugin: PluginManifest;
  state?: PluginState;
  loading: boolean;
  onToggle: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onSettings: () => void;
  isDark: boolean;
}) {
  const isInstalled = !!state;
  const isEnabled = state?.enabled ?? false;
  const hasError = state?.status === 'error';
  const hasConflict = state?.status === 'conflict';

  return (
    <div
      className={`
        p-4 rounded-xl border transition-colors
        ${
          isDark
            ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
            : 'bg-white border-zinc-200 hover:border-zinc-300'
        }
        ${hasError ? 'border-red-500/50' : ''}
        ${hasConflict ? 'border-yellow-500/50' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {plugin.name}
            </h3>
            <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              v{plugin.version}
            </span>
            {plugin.verified && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
                ✓ Verified
              </span>
            )}
          </div>

          <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {plugin.description}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {plugin.author.name}
            </span>
            {plugin.downloads !== undefined && (
              <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                📥 {plugin.downloads.toLocaleString()}
              </span>
            )}
            {plugin.category && (
              <span
                className={`
                text-xs px-2 py-0.5 rounded-full
                ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}
              `}
              >
                {plugin.category}
              </span>
            )}
          </div>

          {hasError && <p className="mt-2 text-xs text-red-500">Error: {state?.error}</p>}

          {hasConflict && (
            <p className="mt-2 text-xs text-yellow-500">
              ⚠️ Conflicts detected - {state?.error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstalled ? (
            <>
              <button
                onClick={onToggle}
                disabled={loading}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                  ${
                    isEnabled
                      ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                      : isDark
                        ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  }
                  ${loading ? 'opacity-50 cursor-wait' : ''}
                `}
              >
                {loading ? '...' : isEnabled ? 'Enabled' : 'Enable'}
              </button>

              <button
                onClick={onSettings}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
                `}
                title="Settings"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>

              <button
                onClick={onUninstall}
                disabled={loading}
                className={`
                  p-1.5 rounded-lg transition-colors text-red-500
                  ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}
                  ${loading ? 'opacity-50 cursor-wait' : ''}
                `}
                title="Uninstall"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={onInstall}
              disabled={loading}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-lg transition-colors
                bg-cyan-500 text-white hover:bg-cyan-600
                ${loading ? 'opacity-50 cursor-wait' : ''}
              `}
            >
              {loading ? 'Installing...' : 'Install'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  isActive,
  onSelect,
  onExport,
  isDark,
}: {
  theme: Theme;
  isActive: boolean;
  onSelect: () => void;
  onExport: () => void;
  isDark: boolean;
}) {
  const { manifest, colors } = theme;

  return (
    <div
      className={`
        rounded-xl border overflow-hidden transition-all cursor-pointer
        ${
          isActive
            ? 'ring-2 ring-cyan-500 border-cyan-500'
            : isDark
              ? 'border-zinc-700 hover:border-zinc-600'
              : 'border-zinc-200 hover:border-zinc-300'
        }
      `}
      onClick={onSelect}
    >
      {/* Preview */}
      <div className="h-24 p-3" style={{ background: colors.bgPrimary }}>
        <div className="h-full rounded-lg p-2" style={{ background: colors.bgSecondary }}>
          <div className="flex gap-2 mb-2">
            <div className="w-16 h-2 rounded" style={{ background: colors.accent }} />
            <div className="w-8 h-2 rounded" style={{ background: colors.textMuted }} />
          </div>
          <div
            className="w-full h-1.5 rounded mb-1"
            style={{ background: colors.textPrimary, opacity: 0.3 }}
          />
          <div
            className="w-3/4 h-1.5 rounded"
            style={{ background: colors.textPrimary, opacity: 0.3 }}
          />
        </div>
      </div>

      {/* Info */}
      <div className={`p-3 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4
              className={`font-medium text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}
            >
              {manifest.name}
            </h4>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {manifest.author.name}
            </p>
          </div>

          <div className="flex gap-1">
            {isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500">
                Active
              </span>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                onExport();
              }}
              className={`
                p-1 rounded transition-colors
                ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
              `}
              title="Export"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PluginManager;
