/**
 * Viewer UI Plugin Template
 * Replace this with your actual implementation
 * @module your-viewer-plugin
 */

import React from 'react';
import type {
  ViewerPlugin,
  PluginManifest,
  PluginSlot,
  PluginHook,
  ViewerToolbarExtension,
  ViewerSidebarExtension,
  ViewerCommand,
  ViewerKeybinding,
} from '@framers/codex-extensions';

// Import your manifest
import manifest from '../manifest.json';

// =============================================================================
// Example Components
// =============================================================================

/**
 * Example Toolbar Button Component
 */
const ExampleToolbarButton: React.FC = () => {
  const [active, setActive] = React.useState(false);

  return (
    <button
      className={`codex-plugin-btn ${active ? 'active' : ''}`}
      onClick={() => setActive(!active)}
      title="Example Plugin Action"
      aria-label="Toggle example feature"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    </button>
  );
};

/**
 * Example Sidebar Panel Component
 */
const ExampleSidebarPanel: React.FC = () => {
  return (
    <div className="codex-plugin-sidebar">
      <h3>Example Panel</h3>
      <p>This is an example sidebar panel from your plugin.</p>
      <div className="codex-plugin-sidebar-content">
        {/* Your sidebar content here */}
        <ul>
          <li>Feature 1</li>
          <li>Feature 2</li>
          <li>Feature 3</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Example Slot Component (injected into viewer)
 */
const ExampleSlotComponent: React.FC<{ path?: string }> = ({ path }) => {
  return (
    <div className="codex-plugin-slot">
      <span className="codex-plugin-badge">Plugin Badge</span>
      {path && <span className="codex-plugin-path">{path}</span>}
    </div>
  );
};

// =============================================================================
// Plugin Configuration
// =============================================================================

/**
 * Toolbar Extension
 */
const toolbar: ViewerToolbarExtension = {
  position: 'right',
  items: [
    {
      id: 'example-action',
      icon: <ExampleToolbarButton />,
      label: 'Example Action',
      tooltip: 'Click to toggle example feature',
    },
  ],
};

/**
 * Sidebar Extension
 */
const sidebar: ViewerSidebarExtension = {
  position: 'right',
  title: 'Example Panel',
  icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  component: ExampleSidebarPanel,
  defaultOpen: false,
};

/**
 * Plugin Slots - Components injected into specific locations
 */
const slots: PluginSlot[] = [
  {
    name: 'content-header',
    component: ExampleSlotComponent as React.ComponentType<unknown>,
    priority: 10,
  },
];

/**
 * Plugin Hooks - React to viewer events
 */
const hooks: PluginHook[] = [
  {
    name: 'onNavigate',
    priority: 'normal',
    handler: (path: unknown) => {
      console.log(`[${manifest.name}] Navigated to:`, path);
    },
  },
  {
    name: 'onSearch',
    priority: 'normal',
    handler: (query: unknown) => {
      console.log(`[${manifest.name}] Search query:`, query);
    },
  },
  {
    name: 'onThemeChange',
    priority: 'normal',
    handler: (theme: unknown) => {
      console.log(`[${manifest.name}] Theme changed to:`, theme);
    },
  },
];

/**
 * Commands - Actions that can be triggered programmatically
 */
const commands: ViewerCommand[] = [
  {
    id: 'example.showPanel',
    name: 'Show Example Panel',
    description: 'Opens the example sidebar panel',
    execute: () => {
      console.log(`[${manifest.name}] Showing panel`);
      // Your command logic here
    },
  },
  {
    id: 'example.doSomething',
    name: 'Do Something',
    description: 'Performs an example action',
    execute: async (arg?: unknown) => {
      console.log(`[${manifest.name}] Doing something with:`, arg);
      // Your async command logic here
    },
  },
];

/**
 * Keybindings - Keyboard shortcuts for commands
 */
const keybindings: ViewerKeybinding[] = [
  {
    command: 'example.showPanel',
    key: 'ctrl+shift+e',
    when: 'viewerFocused',
    description: 'Show example panel',
  },
];

/**
 * Custom styles (CSS string)
 */
const styles = `
  .codex-plugin-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border: none;
    background: transparent;
    color: var(--codex-text-secondary);
    border-radius: var(--codex-radius-md);
    cursor: pointer;
    transition: var(--codex-transition-fast);
  }

  .codex-plugin-btn:hover {
    background: var(--codex-bg-tertiary);
    color: var(--codex-text-primary);
  }

  .codex-plugin-btn.active {
    background: var(--codex-accent-muted);
    color: var(--codex-accent);
  }

  .codex-plugin-sidebar {
    padding: 1rem;
  }

  .codex-plugin-sidebar h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--codex-text-primary);
  }

  .codex-plugin-sidebar p {
    margin: 0 0 1rem 0;
    font-size: 0.8125rem;
    color: var(--codex-text-secondary);
  }

  .codex-plugin-sidebar-content ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .codex-plugin-sidebar-content li {
    padding: 0.5rem;
    font-size: 0.8125rem;
    border-radius: var(--codex-radius-sm);
    cursor: pointer;
  }

  .codex-plugin-sidebar-content li:hover {
    background: var(--codex-bg-tertiary);
  }

  .codex-plugin-slot {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .codex-plugin-badge {
    background: var(--codex-accent-muted);
    color: var(--codex-accent);
    padding: 0.125rem 0.375rem;
    border-radius: var(--codex-radius-sm);
    font-weight: 500;
  }
`;

// =============================================================================
// Plugin Export
// =============================================================================

/**
 * The Plugin Export
 * This is what gets loaded by the plugin system
 */
const plugin: ViewerPlugin = {
  manifest: manifest as PluginManifest,

  // Lifecycle hooks
  async onLoad() {
    console.log(`[${manifest.name}] Plugin loaded`);
  },

  async onUnload() {
    console.log(`[${manifest.name}] Plugin unloaded`);
  },

  async onActivate() {
    console.log(`[${manifest.name}] Plugin activated`);
    // Inject styles
    if (typeof document !== 'undefined') {
      const styleEl = document.createElement('style');
      styleEl.id = `plugin-styles-${manifest.id}`;
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }
  },

  async onDeactivate() {
    console.log(`[${manifest.name}] Plugin deactivated`);
    // Remove styles
    if (typeof document !== 'undefined') {
      const styleEl = document.getElementById(`plugin-styles-${manifest.id}`);
      styleEl?.remove();
    }
  },

  // UI Extensions
  slots,
  hooks,
  toolbar,
  sidebar,
  commands,
  keybindings,
  styles,
};

export default plugin;

// Also export individual components for flexibility
export {
  ExampleToolbarButton,
  ExampleSidebarPanel,
  ExampleSlotComponent,
};

