/**
 * Tldraw Canvas Wrapper Component
 * React wrapper for tldraw infinite canvas with export capabilities
 * @module shared/CanvasEditor/TldrawWrapper
 */

import React, { useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Tldraw, TLUiOverrides, Editor, exportToBlob } from 'tldraw';
import 'tldraw/tldraw.css';

/**
 * Export options for canvas
 */
export interface CanvasExportOptions {
  /** Scale factor for export */
  scale?: number;
  /** Background color (null for transparent) */
  background?: string | null;
  /** Padding around content */
  padding?: number;
  /** Whether to include dark mode styling */
  darkMode?: boolean;
}

/**
 * Canvas export result
 */
export interface CanvasExportResult {
  /** PNG as base64 data URL */
  png?: string;
  /** SVG as string */
  svg?: string;
  /** Raw blob */
  blob?: Blob;
}

/**
 * Ref handle for TldrawWrapper
 */
export interface TldrawWrapperHandle {
  /** Get current canvas data as JSON string */
  getSnapshot: () => string | null;
  /** Export canvas to PNG */
  exportToPNG: (options?: CanvasExportOptions) => Promise<string | null>;
  /** Export canvas to SVG */
  exportToSVG: (options?: CanvasExportOptions) => Promise<string | null>;
  /** Clear the canvas */
  clear: () => void;
  /** Check if canvas has content */
  hasContent: () => boolean;
  /** Get shape count */
  getShapeCount: () => number;
  /** Check if canvas has handwriting */
  hasHandwriting: () => boolean;
}

interface TldrawWrapperProps {
  /** Initial canvas data (tldraw JSON snapshot) */
  initialData?: string;
  /** Callback when canvas data changes */
  onChange?: (data: string) => void;
  /** Whether canvas is read-only */
  readOnly?: boolean;
  /** Custom theme colors */
  theme?: 'light' | 'dark';
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  /** Callback when editor is ready (provides ref handle) */
  onEditorReady?: (handle: TldrawWrapperHandle) => void;
}

/**
 * Tldraw infinite canvas wrapper
 *
 * @remarks
 * - Provides infinite whiteboard for visual note-taking
 * - Auto-saves changes with configurable interval
 * - Supports light/dark themes
 * - Exports/imports tldraw snapshot format
 * - Read-only mode for viewing
 *
 * @example
 * ```tsx
 * <TldrawWrapper
 *   initialData={savedCanvasData}
 *   onChange={(data) => saveToBackend(data)}
 *   theme="dark"
 *   autoSaveInterval={2000}
 * />
 * ```
 */
const TldrawWrapper = forwardRef<TldrawWrapperHandle, TldrawWrapperProps>(function TldrawWrapper(
  {
    initialData,
    onChange,
    readOnly = false,
    theme = 'light',
    autoSaveInterval = 2000,
    onEditorReady,
  },
  ref
) {
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  /**
   * Get current canvas snapshot as JSON string
   */
  const getSnapshot = useCallback((): string | null => {
    if (!editor) return null;
    try {
      const snapshot = editor.store.getSnapshot();
      return JSON.stringify(snapshot);
    } catch {
      return null;
    }
  }, [editor]);

  /**
   * Export canvas to PNG as base64 data URL
   */
  const exportToPNG = useCallback(
    async (options: CanvasExportOptions = {}): Promise<string | null> => {
      if (!editor) return null;

      try {
        const shapeIds = editor.getCurrentPageShapeIds();
        if (shapeIds.size === 0) return null;

        const blob = await exportToBlob({
          editor,
          ids: [...shapeIds],
          format: 'png',
          opts: {
            scale: options.scale || 2,
            background: options.background !== null,
            padding: options.padding || 32,
            darkMode: options.darkMode || theme === 'dark',
          },
        });

        // Convert blob to base64 data URL
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Failed to export canvas to PNG:', error);
        return null;
      }
    },
    [editor, theme]
  );

  /**
   * Export canvas to SVG as string
   */
  const exportToSVG = useCallback(
    async (options: CanvasExportOptions = {}): Promise<string | null> => {
      if (!editor) return null;

      try {
        const shapeIds = editor.getCurrentPageShapeIds();
        if (shapeIds.size === 0) return null;

        const blob = await exportToBlob({
          editor,
          ids: [...shapeIds],
          format: 'svg',
          opts: {
            scale: options.scale || 1,
            background: options.background !== null,
            padding: options.padding || 32,
            darkMode: options.darkMode || theme === 'dark',
          },
        });

        return await blob.text();
      } catch (error) {
        console.error('Failed to export canvas to SVG:', error);
        return null;
      }
    },
    [editor, theme]
  );

  /**
   * Clear the canvas
   */
  const clear = useCallback(() => {
    if (!editor) return;
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size > 0) {
      editor.deleteShapes([...shapeIds]);
    }
  }, [editor]);

  /**
   * Check if canvas has any content
   */
  const hasContent = useCallback((): boolean => {
    if (!editor) return false;
    return editor.getCurrentPageShapeIds().size > 0;
  }, [editor]);

  /**
   * Get number of shapes on canvas
   */
  const getShapeCount = useCallback((): number => {
    if (!editor) return 0;
    return editor.getCurrentPageShapeIds().size;
  }, [editor]);

  /**
   * Check if canvas has handwriting (draw shapes)
   */
  const hasHandwriting = useCallback((): boolean => {
    if (!editor) return false;
    const shapes = editor.getCurrentPageShapes();
    return shapes.some((shape) => shape.type === 'draw');
  }, [editor]);

  /**
   * Handle editor mount
   */
  const handleMount = useCallback(
    (mountedEditor: Editor) => {
      setEditor(mountedEditor);

      // Load initial data if provided
      if (initialData) {
        try {
          const snapshot = JSON.parse(initialData);
          mountedEditor.store.loadSnapshot(snapshot);
        } catch (error) {
          console.error('Failed to load initial canvas data:', error);
        }
      }
    },
    [initialData]
  );

  /**
   * Auto-save canvas data
   */
  const saveCanvasData = useCallback(() => {
    if (!editor || !onChange) return;

    try {
      const snapshot = editor.store.getSnapshot();
      const data = JSON.stringify(snapshot);
      onChange(data);
    } catch (error) {
      console.error('Failed to save canvas data:', error);
    }
  }, [editor, onChange]);

  /**
   * Create handle object and expose via ref
   */
  const handle: TldrawWrapperHandle = React.useMemo(
    () => ({
      getSnapshot,
      exportToPNG,
      exportToSVG,
      clear,
      hasContent,
      getShapeCount,
      hasHandwriting,
    }),
    [getSnapshot, exportToPNG, exportToSVG, clear, hasContent, getShapeCount, hasHandwriting]
  );

  // Expose handle via ref
  useImperativeHandle(ref, () => handle, [handle]);

  // Call onEditorReady when editor is mounted
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(handle);
    }
  }, [editor, handle, onEditorReady]);

  /**
   * Set up auto-save interval
   */
  useEffect(() => {
    if (!editor || !onChange || readOnly) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Set up new auto-save interval
    autoSaveTimerRef.current = setInterval(() => {
      saveCanvasData();
    }, autoSaveInterval);

    // Save on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      saveCanvasData();
    };
  }, [editor, onChange, readOnly, autoSaveInterval, saveCanvasData]);

  /**
   * Custom UI overrides for theming
   */
  const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
      // Keep all default tools
      return tools;
    },
  };

  return (
    <div
      className="tldraw-wrapper"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <Tldraw
        onMount={handleMount}
        overrides={uiOverrides}
        inferDarkMode={theme === 'dark'}
        className={`tldraw-canvas tldraw-canvas-${theme}`}
      />
    </div>
  );
});

export default TldrawWrapper;
