/**
 * Plugin Slot - Injection point for plugin components
 * @module @framers/codex-extensions/react
 */

import React, { useContext, useMemo } from 'react';
import type { ViewerPlugin, PluginSlot as PluginSlotType } from '../../types';

// ============================================================================
// Types
// ============================================================================

export type SlotName =
  | 'toolbar-left'
  | 'toolbar-center'
  | 'toolbar-right'
  | 'sidebar-panel'
  | 'metadata-panel'
  | 'content-header'
  | 'content-footer'
  | 'context-menu'
  | 'modal'
  | 'floating'
  | 'command-palette';

export interface PluginSlotProps {
  /** Slot name/location */
  name: SlotName;
  /** Additional props to pass to plugin components */
  componentProps?: Record<string, unknown>;
  /** Wrapper className */
  className?: string;
  /** Render when empty */
  fallback?: React.ReactNode;
}

interface PluginSlotContextValue {
  enabledPlugins: ViewerPlugin[];
  theme: string;
}

// ============================================================================
// Context
// ============================================================================

export const PluginSlotContext = React.createContext<PluginSlotContextValue>({
  enabledPlugins: [],
  theme: 'light',
});

export function PluginSlotProvider({
  children,
  enabledPlugins,
  theme,
}: {
  children: React.ReactNode;
  enabledPlugins: ViewerPlugin[];
  theme: string;
}) {
  const value = useMemo(() => ({ enabledPlugins, theme }), [enabledPlugins, theme]);
  return (
    <PluginSlotContext.Provider value={value}>{children}</PluginSlotContext.Provider>
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * Plugin Slot - Renders all plugin components registered for this slot
 *
 * @example
 * ```tsx
 * // In your layout
 * <PluginSlot name="toolbar-right" />
 *
 * // Plugin registers to this slot:
 * const plugin: ViewerPlugin = {
 *   slots: [{
 *     name: 'toolbar-right',
 *     component: MyToolbarButton,
 *     priority: 10,
 *   }],
 * };
 * ```
 */
export function PluginSlot({
  name,
  componentProps = {},
  className = '',
  fallback = null,
}: PluginSlotProps) {
  const { enabledPlugins, theme } = useContext(PluginSlotContext);

  // Collect all components registered for this slot
  const slotComponents = useMemo(() => {
    const components: Array<{
      plugin: ViewerPlugin;
      slot: PluginSlotType;
    }> = [];

    for (const plugin of enabledPlugins) {
      if (!plugin.slots) continue;

      for (const slot of plugin.slots) {
        if (slot.name === name) {
          components.push({ plugin, slot });
        }
      }
    }

    // Sort by priority (higher = first)
    components.sort((a, b) => (b.slot.priority ?? 0) - (a.slot.priority ?? 0));

    return components;
  }, [enabledPlugins, name]);

  if (slotComponents.length === 0) {
    return <>{fallback}</>;
  }

  return (
    <div className={className} data-plugin-slot={name}>
      {slotComponents.map(({ plugin, slot }, index) => {
        const Component = slot.component;
        return (
          <PluginErrorBoundary
            key={`${plugin.manifest.id}-${index}`}
            pluginId={plugin.manifest.id}
            pluginName={plugin.manifest.name}
          >
            <Component {...componentProps} pluginId={plugin.manifest.id} theme={theme} />
          </PluginErrorBoundary>
        );
      })}
    </div>
  );
}

// ============================================================================
// Error Boundary
// ============================================================================

interface PluginErrorBoundaryProps {
  children: React.ReactNode;
  pluginId: string;
  pluginName: string;
}

interface PluginErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PluginErrorBoundary extends React.Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  constructor(props: PluginErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[PluginSlot] Error in plugin "${this.props.pluginName}" (${this.props.pluginId}):`,
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-xs text-red-500 p-1">
          Plugin error: {this.props.pluginName}
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Hook to register a component to a slot from within a plugin
 */
export function usePluginSlot(
  slotName: SlotName,
  component: React.ComponentType<unknown>,
  priority: number = 0
): PluginSlotType {
  return useMemo(
    () => ({
      name: slotName,
      component,
      priority,
    }),
    [slotName, component, priority]
  );
}

export default PluginSlot;





