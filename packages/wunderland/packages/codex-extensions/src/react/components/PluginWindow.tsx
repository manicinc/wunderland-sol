/**
 * Plugin Window - Floating VST-style plugin window
 * @module @framers/codex-extensions/react
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { PluginManifest } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface PluginWindowProps {
  /** Plugin manifest */
  plugin: PluginManifest;
  /** Plugin component to render */
  children: React.ReactNode;
  /** Whether window is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Minimize handler */
  onMinimize?: () => void;
  /** Initial position */
  initialPosition?: { x: number; y: number };
  /** Initial size */
  initialSize?: { width: number; height: number };
  /** Whether to show pin button */
  showPin?: boolean;
  /** Whether window is pinned (always on top) */
  isPinned?: boolean;
  /** Pin toggle handler */
  onPinToggle?: () => void;
  /** Theme */
  theme?: string;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

// ============================================================================
// Component
// ============================================================================

export function PluginWindow({
  plugin,
  children,
  isOpen,
  onClose,
  onMinimize,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 500, height: 400 },
  showPin = true,
  isPinned = false,
  onPinToggle,
  theme = 'light',
}: PluginWindowProps) {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [size, setSize] = useState<Size>(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState<{
    position: Position;
    size: Size;
  } | null>(null);

  const windowRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number }>({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
  });
  const resizeStartRef = useRef<{
    width: number;
    height: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
  }>({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
  });

  const isDark = theme.includes('dark');

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: position.x,
        y: position.y,
        startX: e.clientX,
        startY: e.clientY,
      };
    },
    [position, isMaximized]
  );

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: string) => {
      if (isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeDirection(direction);
      resizeStartRef.current = {
        width: size.width,
        height: size.height,
        x: position.x,
        y: position.y,
        startX: e.clientX,
        startY: e.clientY,
      };
    },
    [size, position, isMaximized]
  );

  // Mouse move/up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.startX;
        const deltaY = e.clientY - dragStartRef.current.startY;
        setPosition({
          x: Math.max(0, dragStartRef.current.x + deltaX),
          y: Math.max(0, dragStartRef.current.y + deltaY),
        });
      }

      if (isResizing && resizeDirection) {
        const deltaX = e.clientX - resizeStartRef.current.startX;
        const deltaY = e.clientY - resizeStartRef.current.startY;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        let newX = resizeStartRef.current.x;
        let newY = resizeStartRef.current.y;

        if (resizeDirection.includes('e')) {
          newWidth = Math.max(300, resizeStartRef.current.width + deltaX);
        }
        if (resizeDirection.includes('w')) {
          const widthDelta = -deltaX;
          newWidth = Math.max(300, resizeStartRef.current.width + widthDelta);
          if (newWidth > 300) {
            newX = resizeStartRef.current.x + deltaX;
          }
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(200, resizeStartRef.current.height + deltaY);
        }
        if (resizeDirection.includes('n')) {
          const heightDelta = -deltaY;
          newHeight = Math.max(200, resizeStartRef.current.height + heightDelta);
          if (newHeight > 200) {
            newY = resizeStartRef.current.y + deltaY;
          }
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, resizeDirection]);

  // Maximize/restore
  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      if (preMaximizeState) {
        setPosition(preMaximizeState.position);
        setSize(preMaximizeState.size);
      }
      setIsMaximized(false);
    } else {
      setPreMaximizeState({ position, size });
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight - 60 });
      setIsMaximized(true);
    }
  }, [isMaximized, position, size, preMaximizeState]);

  // Double-click title to maximize
  const handleTitleDoubleClick = useCallback(() => {
    handleMaximize();
  }, [handleMaximize]);

  if (!isOpen) return null;

  const resizeHandleClass = `absolute bg-transparent ${isMaximized ? 'hidden' : ''}`;

  return (
    <div
      ref={windowRef}
      className={`
        fixed shadow-2xl rounded-lg overflow-hidden
        ${isDark ? 'bg-zinc-900' : 'bg-white'}
        ${isPinned ? 'z-[100]' : 'z-50'}
        ${isDragging || isResizing ? 'select-none' : ''}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Title bar */}
      <div
        className={`
          flex items-center justify-between h-10 px-3
          ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        `}
        onMouseDown={handleDragStart}
        onDoubleClick={handleTitleDoubleClick}
      >
        <div className="flex items-center gap-2 select-none">
          <span
            className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}
          >
            {plugin.name}
          </span>
          {plugin.verified && <span className="text-xs text-green-500">✓</span>}
        </div>

        <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
          {/* Pin button */}
          {showPin && onPinToggle && (
            <button
              onClick={onPinToggle}
              className={`
                p-1.5 rounded transition-colors
                ${
                  isPinned
                    ? 'text-cyan-500'
                    : isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                }
              `}
              title={isPinned ? 'Unpin' : 'Pin on top'}
            >
              <svg
                className="w-4 h-4"
                fill={isPinned ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
          )}

          {/* Minimize button */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className={`
                p-1.5 rounded transition-colors
                ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'}
              `}
              title="Minimize"
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
                  d="M20 12H4"
                />
              </svg>
            </button>
          )}

          {/* Maximize button */}
          <button
            onClick={handleMaximize}
            className={`
              p-1.5 rounded transition-colors
              ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'}
            `}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMaximized ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              )}
            </svg>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              p-1.5 rounded transition-colors
              ${isDark ? 'text-zinc-400 hover:text-white hover:bg-red-500/20' : 'text-zinc-600 hover:text-zinc-900 hover:bg-red-100'}
            `}
            title="Close"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={`
          overflow-auto
          ${isDark ? 'bg-zinc-900' : 'bg-white'}
        `}
        style={{ height: `calc(100% - 40px)` }}
      >
        {children}
      </div>

      {/* Resize handles */}
      <div
        className={`${resizeHandleClass} top-0 left-0 w-2 h-2 cursor-nw-resize`}
        onMouseDown={e => handleResizeStart(e, 'nw')}
      />
      <div
        className={`${resizeHandleClass} top-0 right-0 w-2 h-2 cursor-ne-resize`}
        onMouseDown={e => handleResizeStart(e, 'ne')}
      />
      <div
        className={`${resizeHandleClass} bottom-0 left-0 w-2 h-2 cursor-sw-resize`}
        onMouseDown={e => handleResizeStart(e, 'sw')}
      />
      <div
        className={`${resizeHandleClass} bottom-0 right-0 w-2 h-2 cursor-se-resize`}
        onMouseDown={e => handleResizeStart(e, 'se')}
      />
      <div
        className={`${resizeHandleClass} top-0 left-2 right-2 h-1 cursor-n-resize`}
        onMouseDown={e => handleResizeStart(e, 'n')}
      />
      <div
        className={`${resizeHandleClass} bottom-0 left-2 right-2 h-1 cursor-s-resize`}
        onMouseDown={e => handleResizeStart(e, 's')}
      />
      <div
        className={`${resizeHandleClass} left-0 top-2 bottom-2 w-1 cursor-w-resize`}
        onMouseDown={e => handleResizeStart(e, 'w')}
      />
      <div
        className={`${resizeHandleClass} right-0 top-2 bottom-2 w-1 cursor-e-resize`}
        onMouseDown={e => handleResizeStart(e, 'e')}
      />
    </div>
  );
}

export default PluginWindow;





