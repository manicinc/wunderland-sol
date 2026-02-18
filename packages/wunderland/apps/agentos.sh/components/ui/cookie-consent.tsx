'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Settings, Check, Shield } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const CONSENT_KEY = 'agentos-cookie-consent';
const CONSENT_VERSION = '1.0';
const CONSENT_EVENT = 'agentos-consent-changed';

/**
 * Gets the current consent state from localStorage
 */
function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === CONSENT_VERSION) {
        return parsed.consent;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Stores consent state in localStorage
 */
function storeConsent(consent: ConsentState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      version: CONSENT_VERSION,
      consent,
      timestamp: new Date().toISOString(),
    }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Notify same-tab listeners of consent changes.
 *
 * Note: the native `storage` event only fires in other tabs/windows.
 */
function dispatchConsentChange(consent: ConsentState): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { consent } }));
  } catch {
    // Ignore dispatch errors
  }
}

/**
 * Updates analytics scripts based on consent
 */
function updateAnalyticsConsent(consent: ConsentState): void {
  if (typeof window === 'undefined') return;

  // Google Analytics consent mode
  if (typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      functionality_storage: consent.functional ? 'granted' : 'denied',
    });
  }

  // Microsoft Clarity - disable if no consent
  if (!consent.analytics && typeof (window as unknown as { clarity?: (...args: unknown[]) => void }).clarity === 'function') {
    // Clarity doesn't have a direct disable method, but we can stop sending data
    (window as unknown as { clarity: (...args: unknown[]) => void }).clarity('stop');
  }
}

export function CookieConsent() {
  const locale = useLocale();
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    analytics: false,
    marketing: false,
    functional: true,
  });

  // Check for existing consent on mount
  useEffect(() => {
    const storedConsent = getStoredConsent();
    if (storedConsent) {
      setConsent(storedConsent);
      updateAnalyticsConsent(storedConsent);
    } else {
      // Show banner if no consent stored
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    const newConsent = { analytics: true, marketing: true, functional: true };
    setConsent(newConsent);
    storeConsent(newConsent);
    updateAnalyticsConsent(newConsent);
    dispatchConsentChange(newConsent);
    setIsVisible(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    const newConsent = { analytics: false, marketing: false, functional: true };
    setConsent(newConsent);
    storeConsent(newConsent);
    updateAnalyticsConsent(newConsent);
    dispatchConsentChange(newConsent);
    setIsVisible(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    storeConsent(consent);
    updateAnalyticsConsent(consent);
    dispatchConsentChange(consent);
    setShowSettings(false);
    setIsVisible(false);
  }, [consent]);

  const privacyHref = `/${locale === 'en' ? '' : locale + '/'}legal/privacy`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="mx-auto max-w-4xl">
            <div className="holographic-card p-6 shadow-2xl border border-[var(--color-border-primary)]">
              {!showSettings ? (
                /* Main Banner */
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-[var(--color-accent-primary)]/10">
                      <Cookie className="w-5 h-5 text-[var(--color-accent-primary)]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                        Privacy & Cookies
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        We use cookies and similar technologies to improve your experience, analyze traffic, 
                        and provide personalized content. By clicking &ldquo;Accept All,&rdquo; you consent to our use of cookies.{' '}
                        <Link 
                          href={privacyHref}
                          className="text-[var(--color-accent-primary)] hover:underline"
                        >
                          Privacy Policy
                        </Link>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1"
                    >
                      <Settings className="w-4 h-4" />
                      Customize
                    </button>
                    <button
                      onClick={handleRejectAll}
                      className="px-4 py-2 text-sm font-semibold border-2 border-[var(--color-border-primary)] rounded-lg text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)] transition-colors"
                    >
                      Reject All
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white rounded-lg shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
                    >
                      Accept All
                    </button>
                  </div>
                </div>
              ) : (
                /* Settings Panel */
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[var(--color-accent-primary)]" />
                      <h3 className="font-semibold text-[var(--color-text-primary)]">
                        Cookie Preferences
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="p-1 hover:bg-[var(--color-background-secondary)] rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-[var(--color-text-muted)]" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Functional - always on */}
                    <div className="flex items-start justify-between p-4 rounded-lg bg-[var(--color-background-secondary)]">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[var(--color-text-primary)]">Essential</span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-success)]/20 text-[var(--color-success)] rounded">
                            Always On
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Required for the website to function properly. Cannot be disabled.
                        </p>
                      </div>
                      <div className="p-2">
                        <Check className="w-5 h-5 text-[var(--color-success)]" />
                      </div>
                    </div>

                    {/* Analytics */}
                    <label className="flex items-start justify-between p-4 rounded-lg bg-[var(--color-background-secondary)] cursor-pointer group">
                      <div className="flex-1">
                        <span className="font-medium text-[var(--color-text-primary)]">Analytics</span>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Help us understand how visitors interact with our website using Google Analytics and Microsoft Clarity.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={consent.analytics}
                        onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
                        className="w-5 h-5 rounded border-[var(--color-border-primary)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)] cursor-pointer"
                      />
                    </label>

                    {/* Marketing */}
                    <label className="flex items-start justify-between p-4 rounded-lg bg-[var(--color-background-secondary)] cursor-pointer group">
                      <div className="flex-1">
                        <span className="font-medium text-[var(--color-text-primary)]">Marketing</span>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Used to deliver personalized advertisements and measure campaign effectiveness.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={consent.marketing}
                        onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                        className="w-5 h-5 rounded border-[var(--color-border-primary)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePreferences}
                      className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white rounded-lg shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsent;
