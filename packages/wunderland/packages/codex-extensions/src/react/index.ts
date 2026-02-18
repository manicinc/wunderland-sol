/**
 * React components and hooks for Codex Extensions
 * @module @framers/codex-extensions/react
 */

// Context & Providers
export {
  CodexAPIProvider,
  useCodexAPI,
  useCodexNavigation,
  useCodexContent,
  useCodexUI,
  useCodexEvents,
  useCodexStorage,
  useCodexTheme,
  useCodexCommands,
} from './context/CodexAPIContext';

export type {
  CodexAPIProviderProps,
  CodexPluginAPI,
  StrandData,
  KnowledgeTreeNode,
  SearchResult,
  ToolbarItem,
  SidebarPanel,
  ContextMenuItem,
  Command,
  NotificationType,
  CodexEventType,
  EventHandler,
} from './context/CodexAPIContext';

// Components
export { PluginManager } from './components/PluginManager';
export type { PluginManagerProps } from './components/PluginManager';

export { PluginWindow } from './components/PluginWindow';
export type { PluginWindowProps } from './components/PluginWindow';

export {
  PluginSlot,
  PluginSlotProvider,
  PluginSlotContext,
  usePluginSlot,
} from './components/PluginSlot';
export type { PluginSlotProps, SlotName } from './components/PluginSlot';

// Re-export main types for convenience
export type {
  Plugin,
  PluginManifest,
  PluginState,
  ViewerPlugin,
  CodexPlugin,
  Theme,
  ThemeManifest,
  ThemeColors,
} from '../types';





