/**
 * useAnalytics Hook
 * 
 * React hook for easy access to analytics tracking throughout the app
 * Automatically initializes analytics manager and tracks page views
 */

'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import analytics, { type AnalyticsEvent } from '../lib/analytics-manager';

export function useAnalytics() {
  const pathname = usePathname();

  // Initialize analytics and track page views
  useEffect(() => {
    // Check for consent
    try {
      const stored = localStorage.getItem('agentos-cookie-consent');
      const hasConsent = stored ? JSON.parse(stored).consent?.analytics : false;
      analytics.initialize(hasConsent);
    } catch {
      analytics.initialize(false);
    }

    // Track initial page view
    analytics.trackPageView({
      path: pathname,
      title: document.title,
      referrer: document.referrer,
    });

    // Track scroll depth at 25%, 50%, 75%, 100%
    const scrollDepths = new Set<number>();
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / scrollHeight) * 100;

      [25, 50, 75, 100].forEach(depth => {
        if (scrolled >= depth && !scrollDepths.has(depth)) {
          scrollDepths.add(depth);
          analytics.trackScrollDepth(depth);
        }
      });
    };

    // Track time on page
    const startTime = Date.now();
    const trackTimeOnPage = () => {
      const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
      if (timeOnPage > 0) {
        analytics.trackTimeOnPage(timeOnPage);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', trackTimeOnPage);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', trackTimeOnPage);
    };
  }, [pathname]);

  // Listen for consent changes
  useEffect(() => {
    const syncConsent = (value: string | null) => {
      try {
        const hasConsent = value ? JSON.parse(value).consent?.analytics : false;
        analytics.updateConsent(Boolean(hasConsent));
      } catch {
        // Ignore
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agentos-cookie-consent') {
        syncConsent(e.newValue);
      }
    };

    // Same-tab consent updates (storage event doesn't fire in same tab)
    const handleConsentChange = () => {
      syncConsent(localStorage.getItem('agentos-cookie-consent'));
    };

    window.addEventListener('agentos-consent-changed', handleConsentChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('agentos-consent-changed', handleConsentChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Return analytics tracking functions
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    analytics.trackEvent(event);
  }, []);

  const trackButtonClick = useCallback((buttonName: string, location?: string) => {
    analytics.trackButtonClick(buttonName, location);
  }, []);

  const trackLinkClick = useCallback((url: string, type: 'internal' | 'external' | 'download') => {
    analytics.trackLinkClick(url, type);
  }, []);

  const trackSearch = useCallback((query: string, resultsCount?: number) => {
    analytics.trackSearch(query, resultsCount);
  }, []);

  const trackCodeCopy = useCallback((language?: string) => {
    analytics.trackCodeCopy(language);
  }, []);

  const trackNavigation = useCallback((section: string, action: 'open' | 'close' | 'click') => {
    analytics.trackNavigation(section, action);
  }, []);

  const trackDocsInteraction = useCallback((action: string, page?: string) => {
    analytics.trackDocsInteraction(action, page);
  }, []);

  const trackFeatureUsage = useCallback((featureName: string, action?: string) => {
    analytics.trackFeatureUsage(featureName, action);
  }, []);

  const trackThemeChange = useCallback((theme: 'light' | 'dark') => {
    analytics.trackThemeChange(theme);
  }, []);

  const trackLocaleChange = useCallback((locale: string) => {
    analytics.trackLocaleChange(locale);
  }, []);

  const trackError = useCallback((error: Error, context?: string) => {
    analytics.trackError(error, context);
  }, []);

  return {
    trackEvent,
    trackButtonClick,
    trackLinkClick,
    trackSearch,
    trackCodeCopy,
    trackNavigation,
    trackDocsInteraction,
    trackFeatureUsage,
    trackThemeChange,
    trackLocaleChange,
    trackError,
    // Direct access to full analytics manager if needed
    analytics,
  };
}

export default useAnalytics;
