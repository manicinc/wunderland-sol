/**
 * Modal Component
 *
 * Accessible modal dialog with neumorphic styling.
 */

import React, { useEffect, useCallback } from 'react';
import { colors, shadows, borderRadius, zIndex, animation } from './tokens';

// ============================================================================
// Types
// ============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

// ============================================================================
// Size Config
// ============================================================================

const SIZE_STYLES: Record<ModalSize, React.CSSProperties> = {
  sm: { maxWidth: '400px', width: '90%' },
  md: { maxWidth: '500px', width: '90%' },
  lg: { maxWidth: '700px', width: '90%' },
  xl: { maxWidth: '900px', width: '90%' },
  full: {
    maxWidth: 'calc(100vw - 2rem)',
    width: 'calc(100vw - 2rem)',
    maxHeight: 'calc(100vh - 2rem)',
  },
};

// ============================================================================
// Close Icon
// ============================================================================

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ============================================================================
// Modal Component
// ============================================================================

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.modalBackdrop,
    padding: '1rem',
    animation: `rh-fade-in ${animation.duration.default} ${animation.easing.out}`,
  };

  const dialogStyle: React.CSSProperties = {
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.lg,
    zIndex: zIndex.modal,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 2rem)',
    animation: `rh-slide-up ${animation.duration.default} ${animation.easing.out}`,
    ...SIZE_STYLES[size],
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '1.5rem',
    borderBottom: `1px solid ${colors.border.subtle}`,
  };

  const titleStyle: React.CSSProperties = {
    color: colors.text.primary,
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: 0,
  };

  const descriptionStyle: React.CSSProperties = {
    color: colors.text.secondary,
    fontSize: '0.875rem',
    marginTop: '0.5rem',
    margin: 0,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: colors.text.muted,
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: borderRadius.sm,
    transition: `all ${animation.duration.fast} ${animation.easing.default}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const contentStyle: React.CSSProperties = {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1,
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: `1px solid ${colors.border.subtle}`,
    background: colors.bg.primary,
    borderRadius: `0 0 ${borderRadius.xl} ${borderRadius.xl}`,
  };

  return (
    <>
      <style>{`
        @keyframes rh-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes rh-slide-up {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Overlay */}
      <div style={overlayStyle} onClick={closeOnOverlay ? onClose : undefined} role="presentation">
        {/* Dialog */}
        <div
          style={dialogStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div style={headerStyle}>
              <div>
                {title && (
                  <h2 id="modal-title" style={titleStyle}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" style={descriptionStyle}>
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  style={closeButtonStyle}
                  onClick={onClose}
                  aria-label="Close modal"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colors.text.primary;
                    e.currentTarget.style.background = colors.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colors.text.muted;
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div style={contentStyle}>{children}</div>

          {/* Footer */}
          {footer && <div style={footerStyle}>{footer}</div>}
        </div>
      </div>
    </>
  );
}

export default Modal;
