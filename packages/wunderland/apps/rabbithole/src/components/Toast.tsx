'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
  action?: { label: string; href: string };
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, 'id'> & { durationMs?: number }) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
  dismissToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.3)', icon: '\u2713' },
  error: { bg: 'rgba(233, 87, 63, 0.12)', border: 'rgba(233, 87, 63, 0.3)', icon: '\u2717' },
  warning: { bg: 'rgba(245, 166, 35, 0.12)', border: 'rgba(245, 166, 35, 0.3)', icon: '\u26A0' },
  info: { bg: 'rgba(0, 200, 255, 0.12)', border: 'rgba(0, 200, 255, 0.3)', icon: '\u2139' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'> & { durationMs?: number }) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { ...toast, id }]);
      const duration = toast.durationMs ?? (toast.variant === 'error' ? 6000 : 4000);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, dismissToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxWidth: 380,
            pointerEvents: 'none',
          }}
        >
          {toasts.map((t) => {
            const s = variantStyles[t.variant];
            return (
              <div
                key={t.id}
                style={{
                  pointerEvents: 'auto',
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  backdropFilter: 'blur(12px)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.8125rem',
                  color: 'var(--color-text, #e8e0d0)',
                  animation: 'toast-slide-in 0.25s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{s.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
                    <div style={{ opacity: 0.85, lineHeight: 1.4 }}>{t.message}</div>
                    {t.action && (
                      <a
                        href={t.action.href}
                        style={{
                          display: 'inline-block',
                          marginTop: 8,
                          padding: '4px 12px',
                          borderRadius: 4,
                          background: 'var(--color-accent, #c9a227)',
                          color: '#1a1a1a',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          textDecoration: 'none',
                        }}
                      >
                        {t.action.label}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => dismissToast(t.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      opacity: 0.6,
                      fontSize: '1rem',
                      lineHeight: 1,
                      padding: 0,
                      flexShrink: 0,
                    }}
                    aria-label="Dismiss"
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
