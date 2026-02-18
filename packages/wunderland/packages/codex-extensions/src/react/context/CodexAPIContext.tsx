/**
 * Codex API Context - Provides plugin API access
 * @module @framers/codex-extensions/react
 */

import React, { createContext, useContext, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface StrandData {
  path: string;
  name: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface KnowledgeTreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: KnowledgeTreeNode[];
}

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

export interface ToolbarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  position?: 'left' | 'center' | 'right';
}

export interface SidebarPanel {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ComponentType;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (context: { selection?: string; path?: string }) => void;
}

export interface Command {
  id: string;
  name: string;
  description?: string;
  keybinding?: string;
  execute: (...args: unknown[]) => void | Promise<void>;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type CodexEventType =
  | 'strand:open'
  | 'strand:close'
  | 'path:change'
  | 'content:load'
  | 'content:change'
  | 'search:query'
  | 'theme:change'
  | 'plugin:load'
  | 'plugin:enable'
  | 'plugin:disable';

export type EventHandler = (data?: unknown) => void;

/**
 * Complete Codex Plugin API
 */
export interface CodexPluginAPI {
  // Navigation
  navigation: {
    getCurrentPath(): string;
    getCurrentStrand(): StrandData | null;
    navigateTo(path: string): Promise<void>;
    openStrand(path: string): Promise<void>;
    goBack(): void;
    goForward(): void;
  };

  // Content
  content: {
    getContent(): string;
    getMetadata(): Record<string, unknown>;
    getTree(): KnowledgeTreeNode[];
    search(
      query: string,
      options?: { limit?: number; semantic?: boolean }
    ): Promise<SearchResult[]>;
    getBookmarks(): Array<{ path: string; name: string }>;
    getHistory(): Array<{ path: string; name: string; timestamp: Date }>;
  };

  // UI
  ui: {
    showNotification(message: string, type?: NotificationType, duration?: number): void;
    showModal(
      component: React.ComponentType<{ onClose: () => void }>,
      props?: object
    ): void;
    closeModal(): void;
    addToolbarItem(item: ToolbarItem): () => void;
    addSidebarPanel(panel: SidebarPanel): () => void;
    addContextMenuItem(item: ContextMenuItem): () => void;
    openSidebar(): void;
    closeSidebar(): void;
    toggleSidebar(): void;
    openMetadataPanel(): void;
    closeMetadataPanel(): void;
  };

  // Events
  events: {
    on(event: CodexEventType, handler: EventHandler): () => void;
    off(event: CodexEventType, handler: EventHandler): void;
    emit(event: CodexEventType, data?: unknown): void;
  };

  // Storage (per-plugin isolated)
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
  };

  // Theme
  theme: {
    getCurrent(): string;
    isDark(): boolean;
    getColors(): Record<string, string>;
    onChange(handler: (theme: string) => void): () => void;
  };

  // Commands
  commands: {
    register(command: Command): () => void;
    execute(commandId: string, ...args: unknown[]): Promise<void>;
    getAll(): Command[];
  };
}

// ============================================================================
// Context
// ============================================================================

const CodexAPIContext = createContext<CodexPluginAPI | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

export interface CodexAPIProviderProps {
  children: React.ReactNode;

  // Navigation handlers
  currentPath: string;
  currentStrand: StrandData | null;
  onNavigate: (path: string) => Promise<void>;
  onOpenStrand: (path: string) => Promise<void>;

  // Content
  content: string;
  metadata: Record<string, unknown>;
  tree: KnowledgeTreeNode[];
  onSearch: (
    query: string,
    options?: { limit?: number; semantic?: boolean }
  ) => Promise<SearchResult[]>;
  bookmarks: Array<{ path: string; name: string }>;
  history: Array<{ path: string; name: string; timestamp: Date }>;

  // UI
  onShowNotification: (
    message: string,
    type?: NotificationType,
    duration?: number
  ) => void;
  onShowModal: (
    component: React.ComponentType<{ onClose: () => void }>,
    props?: object
  ) => void;
  onCloseModal: () => void;
  onToggleSidebar: (open?: boolean) => void;
  onToggleMetadataPanel: (open?: boolean) => void;

  // Theme
  theme: string;

  // Plugin ID for storage isolation
  pluginId?: string;
}

// ============================================================================
// Provider Implementation
// ============================================================================

export function CodexAPIProvider({
  children,
  currentPath,
  currentStrand,
  onNavigate,
  onOpenStrand,
  content,
  metadata,
  tree,
  onSearch,
  bookmarks,
  history,
  onShowNotification,
  onShowModal,
  onCloseModal,
  onToggleSidebar,
  onToggleMetadataPanel,
  theme,
  pluginId = 'default',
}: CodexAPIProviderProps) {
  // Event handlers registry
  const eventHandlers = useMemo(() => new Map<CodexEventType, Set<EventHandler>>(), []);

  // Toolbar items registry
  const toolbarItems = useMemo(() => new Map<string, ToolbarItem>(), []);

  // Sidebar panels registry
  const sidebarPanels = useMemo(() => new Map<string, SidebarPanel>(), []);

  // Context menu items registry
  const contextMenuItems = useMemo(() => new Map<string, ContextMenuItem>(), []);

  // Commands registry
  const commands = useMemo(() => new Map<string, Command>(), []);

  // History stack for navigation
  const historyStack = useMemo(
    () => ({ back: [] as string[], forward: [] as string[] }),
    []
  );

  // Storage key prefix
  const storagePrefix = `codex-plugin-${pluginId}-`;

  // Build the API object
  const api = useMemo<CodexPluginAPI>(
    () => ({
      // Navigation
      navigation: {
        getCurrentPath: () => currentPath,
        getCurrentStrand: () => currentStrand,
        navigateTo: async path => {
          historyStack.back.push(currentPath);
          historyStack.forward = [];
          await onNavigate(path);
        },
        openStrand: onOpenStrand,
        goBack: () => {
          const prev = historyStack.back.pop();
          if (prev) {
            historyStack.forward.push(currentPath);
            onNavigate(prev);
          }
        },
        goForward: () => {
          const next = historyStack.forward.pop();
          if (next) {
            historyStack.back.push(currentPath);
            onNavigate(next);
          }
        },
      },

      // Content
      content: {
        getContent: () => content,
        getMetadata: () => metadata,
        getTree: () => tree,
        search: onSearch,
        getBookmarks: () => bookmarks,
        getHistory: () => history,
      },

      // UI
      ui: {
        showNotification: onShowNotification,
        showModal: onShowModal,
        closeModal: onCloseModal,
        addToolbarItem: item => {
          toolbarItems.set(item.id, item);
          return () => toolbarItems.delete(item.id);
        },
        addSidebarPanel: panel => {
          sidebarPanels.set(panel.id, panel);
          return () => sidebarPanels.delete(panel.id);
        },
        addContextMenuItem: item => {
          contextMenuItems.set(item.id, item);
          return () => contextMenuItems.delete(item.id);
        },
        openSidebar: () => onToggleSidebar(true),
        closeSidebar: () => onToggleSidebar(false),
        toggleSidebar: () => onToggleSidebar(),
        openMetadataPanel: () => onToggleMetadataPanel(true),
        closeMetadataPanel: () => onToggleMetadataPanel(false),
      },

      // Events
      events: {
        on: (event, handler) => {
          if (!eventHandlers.has(event)) {
            eventHandlers.set(event, new Set());
          }
          eventHandlers.get(event)!.add(handler);
          return () => eventHandlers.get(event)?.delete(handler);
        },
        off: (event, handler) => {
          eventHandlers.get(event)?.delete(handler);
        },
        emit: (event, data) => {
          eventHandlers.get(event)?.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`[CodexAPI] Event handler error for ${event}:`, error);
            }
          });
        },
      },

      // Storage
      storage: {
        get: async <T,>(key: string): Promise<T | null> => {
          if (typeof localStorage === 'undefined') return null;
          try {
            const value = localStorage.getItem(storagePrefix + key);
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        },
        set: async <T,>(key: string, value: T): Promise<void> => {
          if (typeof localStorage === 'undefined') return;
          localStorage.setItem(storagePrefix + key, JSON.stringify(value));
        },
        remove: async (key: string): Promise<void> => {
          if (typeof localStorage === 'undefined') return;
          localStorage.removeItem(storagePrefix + key);
        },
        clear: async (): Promise<void> => {
          if (typeof localStorage === 'undefined') return;
          const keys = Object.keys(localStorage).filter(k => k.startsWith(storagePrefix));
          keys.forEach(k => localStorage.removeItem(k));
        },
        keys: async (): Promise<string[]> => {
          if (typeof localStorage === 'undefined') return [];
          return Object.keys(localStorage)
            .filter(k => k.startsWith(storagePrefix))
            .map(k => k.slice(storagePrefix.length));
        },
      },

      // Theme
      theme: {
        getCurrent: () => theme,
        isDark: () => theme.includes('dark'),
        getColors: () => {
          if (typeof getComputedStyle === 'undefined') return {};
          const style = getComputedStyle(document.documentElement);
          const colors: Record<string, string> = {};
          const varNames = [
            'bg-primary',
            'bg-secondary',
            'bg-tertiary',
            'text-primary',
            'text-secondary',
            'text-muted',
            'accent',
            'accent-hover',
            'accent-muted',
            'border',
            'border-muted',
          ];
          varNames.forEach(name => {
            colors[name] = style.getPropertyValue(`--codex-${name}`).trim();
          });
          return colors;
        },
        onChange: handler => {
          const observer = new MutationObserver(() => {
            handler(theme);
          });
          if (typeof document !== 'undefined') {
            observer.observe(document.documentElement, {
              attributes: true,
              attributeFilter: ['class'],
            });
          }
          return () => observer.disconnect();
        },
      },

      // Commands
      commands: {
        register: command => {
          commands.set(command.id, command);
          return () => commands.delete(command.id);
        },
        execute: async (commandId, ...args) => {
          const command = commands.get(commandId);
          if (command) {
            await command.execute(...args);
          } else {
            console.warn(`[CodexAPI] Command not found: ${commandId}`);
          }
        },
        getAll: () => Array.from(commands.values()),
      },
    }),
    [
      currentPath,
      currentStrand,
      content,
      metadata,
      tree,
      bookmarks,
      history,
      theme,
      storagePrefix,
      onNavigate,
      onOpenStrand,
      onSearch,
      onShowNotification,
      onShowModal,
      onCloseModal,
      onToggleSidebar,
      onToggleMetadataPanel,
      eventHandlers,
      toolbarItems,
      sidebarPanels,
      contextMenuItems,
      commands,
      historyStack,
    ]
  );

  return <CodexAPIContext.Provider value={api}>{children}</CodexAPIContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the Codex Plugin API
 */
export function useCodexAPI(): CodexPluginAPI {
  const api = useContext(CodexAPIContext);
  if (!api) {
    throw new Error('useCodexAPI must be used within a CodexAPIProvider');
  }
  return api;
}

/**
 * Hook to access specific API sections
 */
export function useCodexNavigation() {
  return useCodexAPI().navigation;
}

export function useCodexContent() {
  return useCodexAPI().content;
}

export function useCodexUI() {
  return useCodexAPI().ui;
}

export function useCodexEvents() {
  return useCodexAPI().events;
}

export function useCodexStorage() {
  return useCodexAPI().storage;
}

export function useCodexTheme() {
  const api = useCodexAPI();
  return {
    theme: api.theme.getCurrent(),
    isDark: api.theme.isDark(),
    colors: api.theme.getColors(),
    onChange: api.theme.onChange,
  };
}

export function useCodexCommands() {
  return useCodexAPI().commands;
}
