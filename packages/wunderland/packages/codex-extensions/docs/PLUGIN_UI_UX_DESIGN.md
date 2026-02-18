# Plugin UI/UX Design System

## Inspired by VST/DAW Architecture

This document outlines the complete UI/UX system for Codex plugins, inspired by how VST (Virtual Studio Technology) plugins work in Digital Audio Workstations like Ableton, Logic, and FL Studio.

---

## Core Concepts

### 1. Plugin as a React Component

Every plugin is fundamentally a **React component** that:
- Receives props from the host (Codex Viewer)
- Uses the Codex theme system (CSS variables)
- Can access public APIs via context/hooks
- Renders in its own modal/panel space

```tsx
interface PluginComponentProps {
  // Host-provided data
  currentStrand?: StrandData;
  currentPath?: string;
  theme: ThemeName;
  
  // Plugin state
  isOpen: boolean;
  onClose: () => void;
  
  // Host APIs (via context)
  api: CodexPluginAPI;
  
  // Plugin-specific config
  config?: Record<string, unknown>;
}
```

### 2. Plugin Slots (Injection Points)

Like VST insert points, plugins can inject into specific UI slots:

| Slot | Location | Example Use |
|------|----------|-------------|
| `toolbar` | Main toolbar | Custom buttons, dropdowns |
| `sidebar-panel` | Left sidebar tabs | Custom navigation views |
| `metadata-panel` | Right panel tabs | Extended metadata views |
| `content-header` | Above content | Banners, status indicators |
| `content-footer` | Below content | Related content, actions |
| `context-menu` | Right-click menu | Custom actions |
| `modal` | Full modal overlay | Complex plugin UIs |
| `floating` | Floating window | Persistent mini-views |
| `command-palette` | Cmd+K menu | Plugin commands |

---

## Plugin Menu System

### Menu Bar Addition

Add a new **"Plugins"** menu to the toolbar:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Search  │  📊 Graph  │  ⏱ Timeline  │  🧩 Plugins  │  ⚙ Settings  │
└─────────────────────────────────────────────────────────────────┘
```

### Plugins Menu Structure

```
🧩 Plugins
├── 📦 Manage Plugins...        (Opens Plugin Manager)
├── 🎨 Themes...                (Opens Theme Manager)
├── ─────────────────
├── ✓ Word Counter              (Toggle enabled plugins)
├── ✓ Citation Generator
├── ✗ Graph Visualizer
├── ─────────────────
├── 🔧 Plugin Settings...
└── 📂 Open Plugins Folder
```

---

## Plugin Manager Modal (VST Browser-style)

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Plugin Manager                                          ─ □ ✕       │
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌───────────────────────────────────────────────┐   │
│ │ Categories   │ │ Search plugins...                    🔍      │   │
│ ├──────────────┤ ├───────────────────────────────────────────────┤   │
│ │ All          │ │                                               │   │
│ │ Installed    │ │ ┌─────────────────────────────────────────┐   │   │
│ │ Updates      │ │ │ 📊 Analytics Dashboard          v1.2.0 │   │   │
│ │ ─────────    │ │ │ Advanced analytics for your codex      │   │   │
│ │ UI           │ │ │ ★★★★☆ (124)    📥 2.3k    ✓ Verified │   │   │
│ │ Visualization│ │ │ [Enable] [Settings] [Details]          │   │   │
│ │ Search       │ │ └─────────────────────────────────────────┘   │   │
│ │ Export       │ │                                               │   │
│ │ Integration  │ │ ┌─────────────────────────────────────────┐   │   │
│ │ ─────────    │ │ │ 🔗 Citation Generator            v2.0.1 │   │   │
│ │ Themes       │ │ │ Auto-generate citations from strands    │   │   │
│ │              │ │ │ ★★★★★ (89)     📥 1.8k    ✓ Verified │   │   │
│ └──────────────┘ │ │ [Disable] [Settings] [Details]         │   │   │
│                  │ └─────────────────────────────────────────┘   │   │
│                  │                                               │   │
│                  │ ┌─────────────────────────────────────────┐   │   │
│                  │ │ ⚠️ Graph Visualizer             v0.9.0 │   │   │
│                  │ │ 3D knowledge graph visualization        │   │   │
│                  │ │ CONFLICT: Incompatible with Analytics   │   │   │
│                  │ │ [Resolve Conflict]                      │   │   │
│                  │ └─────────────────────────────────────────┘   │   │
└──────────────────────────────────────────────────────────────────────┘
```

### Plugin Card States

```tsx
type PluginCardState = 
  | 'available'      // Can be installed
  | 'installed'      // Installed but not enabled
  | 'enabled'        // Active and running
  | 'disabled'       // Manually disabled
  | 'updating'       // Update in progress
  | 'error'          // Failed to load
  | 'incompatible'   // Version mismatch
  | 'conflict'       // Conflicts with another plugin
```

---

## Plugin Window System (VST-style)

### Modal Plugin Window

When a plugin is opened, it appears in a **resizable, draggable modal**:

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Analytics Dashboard                    ─ □ ✕ 📌      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Plugin's React Component              │   │
│  │                                                 │   │
│  │   (Full control over rendering)                 │   │
│  │                                                 │   │
│  │   Uses Codex theme CSS variables               │   │
│  │   Accesses APIs via useCodexAPI() hook         │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [Presets ▼]  [Settings]            [Reset] [Apply]     │
└─────────────────────────────────────────────────────────┘
```

### Window Features

- **📌 Pin** - Keep on top
- **Resize** - Drag corners/edges
- **Drag** - Move by title bar
- **Minimize** - Collapse to toolbar icon
- **Multiple Windows** - Open multiple plugins simultaneously
- **Presets** - Save/load plugin configurations

---

## Public API for Plugins

### CodexPluginAPI Interface

```typescript
interface CodexPluginAPI {
  // Navigation
  navigation: {
    getCurrentPath(): string;
    getCurrentStrand(): StrandData | null;
    navigateTo(path: string): Promise<void>;
    openStrand(path: string): Promise<void>;
  };
  
  // Content
  content: {
    getContent(): string;
    getMetadata(): StrandMetadata;
    getTree(): KnowledgeTreeNode[];
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  };
  
  // UI
  ui: {
    showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
    showModal(component: React.ComponentType, props?: object): void;
    closeModal(): void;
    addToolbarItem(item: ToolbarItem): () => void;
    addSidebarPanel(panel: SidebarPanel): () => void;
    addContextMenuItem(item: ContextMenuItem): () => void;
  };
  
  // Events
  events: {
    on(event: CodexEvent, handler: EventHandler): () => void;
    emit(event: CodexEvent, data?: unknown): void;
  };
  
  // Storage (per-plugin isolated)
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
  };
  
  // Theme
  theme: {
    getCurrent(): ThemeName;
    getColors(): ThemeColors;
    getVariables(): Record<string, string>;
    onChange(handler: (theme: ThemeName) => void): () => void;
  };
  
  // Commands
  commands: {
    register(command: Command): () => void;
    execute(commandId: string, ...args: unknown[]): Promise<void>;
  };
  
  // Analytics (if enabled)
  analytics?: {
    track(event: string, properties?: object): void;
  };
}
```

### Events System

```typescript
type CodexEvent =
  // Navigation
  | 'strand:open'
  | 'strand:close'
  | 'path:change'
  | 'tree:refresh'
  
  // Content
  | 'content:load'
  | 'content:change'
  | 'metadata:change'
  
  // Search
  | 'search:query'
  | 'search:results'
  | 'search:clear'
  
  // UI
  | 'sidebar:toggle'
  | 'panel:toggle'
  | 'modal:open'
  | 'modal:close'
  
  // Theme
  | 'theme:change'
  
  // Plugins
  | 'plugin:load'
  | 'plugin:unload'
  | 'plugin:enable'
  | 'plugin:disable'
  | 'plugin:error'
```

---

## Theme System for Plugins

### Using Theme Variables

Plugins should use CSS variables to stay theme-aware:

```css
.my-plugin {
  background: var(--codex-bg-secondary);
  color: var(--codex-text-primary);
  border: 1px solid var(--codex-border);
  border-radius: var(--codex-radius-md);
}

.my-plugin-accent {
  color: var(--codex-accent);
  background: var(--codex-accent-muted);
}

.my-plugin-button {
  background: var(--codex-bg-tertiary);
  color: var(--codex-text-primary);
  transition: var(--codex-transition-fast);
}

.my-plugin-button:hover {
  background: var(--codex-accent);
  color: var(--codex-text-inverse);
}
```

### React Hook for Theme

```tsx
import { useCodexTheme } from '@framers/codex-extensions/react';

function MyPluginComponent() {
  const { theme, colors, isDark } = useCodexTheme();
  
  return (
    <div style={{ 
      background: colors.bgSecondary,
      color: colors.textPrimary 
    }}>
      Current theme: {theme}
    </div>
  );
}
```

---

## Plugin Lifecycle

### Loading Sequence

```
1. Registry Fetch
   └── Download manifest from registry
   
2. Compatibility Check
   └── Version, dependencies, conflicts
   
3. Security Scan
   └── Check permissions, scan for issues
   
4. Module Load (Lazy)
   └── Dynamic import when needed
   
5. Sandbox Wrap
   └── Error boundaries, timeouts
   
6. Initialize
   └── Call plugin.onLoad()
   
7. Activate (if enabled)
   └── Call plugin.onActivate()
   └── Inject into slots
   └── Register hooks/commands
```

### Graceful Degradation

If a plugin fails:
1. Log error to console
2. Show non-blocking notification
3. Disable the plugin
4. Continue with other plugins
5. Offer "Report Issue" option

---

## Conflict Resolution UI

When plugins conflict:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Plugin Conflict Detected                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ "Graph Visualizer" conflicts with "Analytics Dashboard" │
│                                                         │
│ Reason: Both plugins try to use the same sidebar slot   │
│                                                         │
│ Options:                                                │
│                                                         │
│ ○ Keep "Analytics Dashboard" (disable Graph Visualizer) │
│ ○ Keep "Graph Visualizer" (disable Analytics Dashboard) │
│ ○ Use both (may cause issues)                           │
│                                                         │
│                        [Cancel]  [Apply]                │
└─────────────────────────────────────────────────────────┘
```

---

## Settings Panel per Plugin

Each plugin can have a settings panel:

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Analytics Dashboard Settings                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ General                                                 │
│ ├─ ☑ Show on startup                                   │
│ ├─ ☑ Auto-refresh data                                 │
│ └─ Refresh interval: [5 minutes ▼]                     │
│                                                         │
│ Display                                                 │
│ ├─ Chart type: [Bar ▼]                                 │
│ ├─ Color scheme: [Theme default ▼]                     │
│ └─ ☑ Show legends                                      │
│                                                         │
│ Data                                                    │
│ ├─ Include: [All strands ▼]                            │
│ └─ Date range: [Last 30 days ▼]                        │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ [Export Settings]  [Import Settings]  [Reset Defaults]  │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure for Plugin UI Components

```
packages/codex-extensions/
├── src/
│   ├── react/
│   │   ├── components/
│   │   │   ├── PluginManager.tsx      # Main manager modal
│   │   │   ├── PluginCard.tsx         # Individual plugin card
│   │   │   ├── PluginWindow.tsx       # Floating plugin window
│   │   │   ├── PluginSlot.tsx         # Slot injection point
│   │   │   ├── ThemeManager.tsx       # Theme browser
│   │   │   ├── ThemePreview.tsx       # Theme preview card
│   │   │   ├── ConflictResolver.tsx   # Conflict resolution modal
│   │   │   └── PluginSettings.tsx     # Per-plugin settings
│   │   ├── hooks/
│   │   │   ├── usePluginManager.ts    # Plugin state management
│   │   │   ├── useCodexAPI.ts         # API access hook
│   │   │   ├── useCodexTheme.ts       # Theme access hook
│   │   │   ├── usePluginStorage.ts    # Per-plugin storage
│   │   │   └── usePluginEvents.ts     # Event subscription
│   │   ├── context/
│   │   │   ├── PluginContext.tsx      # Plugin provider
│   │   │   └── CodexAPIContext.tsx    # API provider
│   │   └── index.ts                   # React exports
│   └── ...
```

---

## Integration Points in CodexViewer

### Adding Plugin Menu to Toolbar

```tsx
// In CodexToolbar.tsx
const pluginGroup = {
  id: 'plugins',
  label: 'Plugins',
  items: [
    {
      id: 'manage-plugins',
      label: 'Manage Plugins',
      icon: <Puzzle className="w-4 h-4" />,
      onClick: () => setPluginManagerOpen(true),
    },
    {
      id: 'themes',
      label: 'Themes',
      icon: <Palette className="w-4 h-4" />,
      onClick: () => setThemeManagerOpen(true),
    },
    // Dynamic: enabled plugins
    ...enabledPlugins.map(plugin => ({
      id: plugin.id,
      label: plugin.name,
      icon: plugin.icon,
      checked: true,
      onClick: () => togglePlugin(plugin.id),
    })),
  ],
};
```

### Plugin Slots in Layout

```tsx
// In CodexViewer.tsx
<PluginSlot name="content-header" />

<CodexContent ... />

<PluginSlot name="content-footer" />

{/* Plugin Windows (floating) */}
<PluginWindowContainer />

{/* Plugin Modals */}
<PluginManager 
  isOpen={pluginManagerOpen} 
  onClose={() => setPluginManagerOpen(false)} 
/>
```

---

## Summary

This system provides:

1. **VST-like Plugin Windows** - Floating, resizable, draggable
2. **Plugin Manager** - Browse, install, enable/disable
3. **Theme Manager** - Create, customize, export themes
4. **Slot System** - Inject plugins into specific UI locations
5. **Public API** - Navigation, content, UI, events, storage
6. **Theme Integration** - CSS variables, hooks, auto-sync
7. **Conflict Resolution** - Detect and resolve plugin conflicts
8. **Per-Plugin Settings** - Save/load configurations
9. **Graceful Degradation** - Fail safely, continue running
10. **Security** - Sandboxed execution, permission model





















