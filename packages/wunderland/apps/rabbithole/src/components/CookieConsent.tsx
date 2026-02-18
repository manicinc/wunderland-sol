'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  hasConsentDecision,
  getConsent,
  setConsent,
  acceptAll,
  rejectAll,
  type ConsentPreferences,
} from '@/lib/consent';
import { initAnalytics } from '@/lib/analytics';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    functional: true,
    marketing: false,
    updatedAt: '',
  });

  // Init analytics once on mount
  useEffect(() => {
    const cleanup = initAnalytics();
    return cleanup;
  }, []);

  // Show banner if no decision yet
  useEffect(() => {
    if (!hasConsentDecision()) {
      setVisible(true);
    } else {
      const stored = getConsent();
      if (stored) setPrefs(stored);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    const p = acceptAll();
    setPrefs(p);
    setVisible(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    const p = rejectAll();
    setPrefs(p);
    setVisible(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    const p = setConsent(prefs);
    setPrefs(p);
    setVisible(false);
    setShowDetails(false);
  }, [prefs]);

  const toggleCategory = (key: 'analytics' | 'functional' | 'marketing') => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-banner__inner">
        {!showDetails ? (
          <>
            <div className="cookie-banner__content">
              <h3 className="cookie-banner__title">We value your privacy</h3>
              <p className="cookie-banner__text">
                We use cookies and similar technologies to improve your experience, analyse usage,
                and support security. You can customise your preferences or accept all.{' '}
                <a href="/cookies" className="cookie-banner__link">
                  Cookie Policy
                </a>
              </p>
            </div>
            <div className="cookie-banner__actions">
              <button className="btn btn--ghost btn--sm" onClick={handleRejectAll}>
                Reject All
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setShowDetails(true)}>
                Customise
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleAcceptAll}>
                Accept All
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cookie-banner__content">
              <h3 className="cookie-banner__title">Cookie Preferences</h3>

              <div className="cookie-banner__category">
                <div className="cookie-banner__category-header">
                  <span className="cookie-banner__category-name">Strictly Necessary</span>
                  <span className="cookie-banner__toggle cookie-banner__toggle--locked">
                    Always on
                  </span>
                </div>
                <p className="cookie-banner__category-desc">
                  Authentication, security, and core functionality. Cannot be disabled.
                </p>
              </div>

              <div className="cookie-banner__category">
                <div className="cookie-banner__category-header">
                  <span className="cookie-banner__category-name">Analytics</span>
                  <label className="cookie-banner__switch">
                    <input
                      type="checkbox"
                      checked={prefs.analytics}
                      onChange={() => toggleCategory('analytics')}
                    />
                    <span className="cookie-banner__slider" />
                  </label>
                </div>
                <p className="cookie-banner__category-desc">
                  Microsoft Clarity session recording, aggregate usage statistics.
                </p>
              </div>

              <div className="cookie-banner__category">
                <div className="cookie-banner__category-header">
                  <span className="cookie-banner__category-name">Functional</span>
                  <label className="cookie-banner__switch">
                    <input
                      type="checkbox"
                      checked={prefs.functional}
                      onChange={() => toggleCategory('functional')}
                    />
                    <span className="cookie-banner__slider" />
                  </label>
                </div>
                <p className="cookie-banner__category-desc">
                  Theme preferences, sidebar state, UI customisation.
                </p>
              </div>

              <div className="cookie-banner__category">
                <div className="cookie-banner__category-header">
                  <span className="cookie-banner__category-name">Marketing</span>
                  <label className="cookie-banner__switch">
                    <input
                      type="checkbox"
                      checked={prefs.marketing}
                      onChange={() => toggleCategory('marketing')}
                    />
                    <span className="cookie-banner__slider" />
                  </label>
                </div>
                <p className="cookie-banner__category-desc">
                  Third-party tracking for advertising. Currently not used.
                </p>
              </div>
            </div>
            <div className="cookie-banner__actions">
              <button className="btn btn--ghost btn--sm" onClick={() => setShowDetails(false)}>
                Back
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleSavePreferences}>
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
