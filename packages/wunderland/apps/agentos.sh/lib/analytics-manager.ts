/**
 * Unified Analytics Manager
 * 
 * Comprehensive tracking manager for both Google Analytics and Microsoft Clarity
 * Tracks all user interactions, page views, events, and custom data points
 * GDPR-compliant with consent management
 */

'use client';

// Type definitions for window analytics objects
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    clarity?: (...args: unknown[]) => void;
  }
}

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  customData?: Record<string, string | number | boolean | undefined>;
}

export interface PageViewData {
  path: string;
  title?: string;
  referrer?: string;
}

export interface UserProperties {
  userId?: string;
  userType?: 'visitor' | 'registered' | 'premium';
  locale?: string;
  theme?: 'light' | 'dark';
  [key: string]: string | undefined;
}

class AnalyticsManager {
  private isInitialized = false;
  private consentGiven = false;
  private eventQueue: Array<() => void> = [];

  /**
   * Initialize analytics manager
   */
  initialize(hasConsent: boolean = false): void {
    this.isInitialized = true;
    this.consentGiven = hasConsent;

    if (hasConsent) {
      this.flushEventQueue();
    }

    // Track page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.trackEvent({
          action: document.hidden ? 'page_hidden' : 'page_visible',
          category: 'engagement',
          label: window.location.pathname,
        });
      });
    }
  }

  /**
   * Update consent status
   */
  updateConsent(hasConsent: boolean): void {
    this.consentGiven = hasConsent;
    
    if (hasConsent) {
      this.flushEventQueue();
    } else {
      this.eventQueue = [];
    }
  }

  /**
   * Flush queued events when consent is granted
   */
  private flushEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      event?.();
    }
  }

  /**
   * Execute or queue an analytics action based on consent
   */
  private executeOrQueue(action: () => void): void {
    if (!this.isInitialized || !this.consentGiven) {
      this.eventQueue.push(action);
      return;
    }
    action();
  }

  /**
   * Track page view
   */
  trackPageView(data: PageViewData): void {
    this.executeOrQueue(() => {
      // Google Analytics
      if (window.gtag) {
        window.gtag('event', 'page_view', {
          page_path: data.path,
          page_title: data.title,
          page_referrer: data.referrer,
        });
      }

      // Microsoft Clarity - automatically tracks page views
      if (window.clarity) {
        window.clarity('set', 'page', data.path);
      }
    });
  }

  /**
   * Track custom event
   */
  trackEvent(event: AnalyticsEvent): void {
    this.executeOrQueue(() => {
      // Google Analytics
      if (window.gtag) {
        window.gtag('event', event.action, {
          event_category: event.category,
          event_label: event.label,
          value: event.value,
          ...event.customData,
        });
      }

      // Microsoft Clarity custom events
      if (window.clarity) {
        const eventName = `${event.category}_${event.action}`;
        window.clarity('event', eventName);
      }
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    this.executeOrQueue(() => {
      if (window.gtag) {
        window.gtag('set', 'user_properties', properties);
      }

      if (window.clarity) {
        const clarityFn = window.clarity;
        Object.entries(properties).forEach(([key, value]) => {
          clarityFn('set', key, String(value));
        });
      }
    });
  }

  /**
   * Track scroll depth
   */
  trackScrollDepth(depth: number): void {
    this.trackEvent({
      action: 'scroll',
      category: 'engagement',
      label: `${depth}%`,
      value: depth,
    });
  }

  /**
   * Track time on page
   */
  trackTimeOnPage(seconds: number): void {
    this.trackEvent({
      action: 'time_on_page',
      category: 'engagement',
      value: seconds,
    });
  }

  /**
   * Track search
   */
  trackSearch(query: string, resultsCount?: number): void {
    this.trackEvent({
      action: 'search',
      category: 'docs',
      label: query,
      value: resultsCount,
    });
  }

  /**
   * Track navigation
   */
  trackNavigation(section: string, action: 'open' | 'close' | 'click'): void {
    this.trackEvent({
      action,
      category: 'navigation',
      label: section,
    });
  }

  /**
   * Track documentation interactions
   */
  trackDocsInteraction(action: string, page?: string): void {
    this.trackEvent({
      action,
      category: 'docs',
      label: page || window.location.pathname,
    });
  }

  /**
   * Track code copy events
   */
  trackCodeCopy(language?: string): void {
    this.trackEvent({
      action: 'code_copy',
      category: 'docs',
      label: language,
    });
  }

  /**
   * Track link clicks
   */
  trackLinkClick(url: string, type: 'internal' | 'external' | 'download'): void {
    this.trackEvent({
      action: 'link_click',
      category: 'engagement',
      label: url,
      customData: { link_type: type },
    });
  }

  /**
   * Track form interactions
   */
  trackFormEvent(formName: string, action: 'start' | 'submit' | 'error', errorMessage?: string): void {
    this.trackEvent({
      action: `form_${action}`,
      category: 'forms',
      label: formName,
      customData: errorMessage ? { error: errorMessage } : undefined,
    });
  }

  /**
   * Track button clicks
   */
  trackButtonClick(buttonName: string, location?: string): void {
    this.trackEvent({
      action: 'button_click',
      category: 'engagement',
      label: buttonName,
      customData: { location },
    });
  }

  /**
   * Track video interactions
   */
  trackVideo(action: 'play' | 'pause' | 'complete', videoTitle: string, progress?: number): void {
    this.trackEvent({
      action: `video_${action}`,
      category: 'media',
      label: videoTitle,
      value: progress,
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: string): void {
    this.trackEvent({
      action: 'error',
      category: 'errors',
      label: error.message,
      customData: {
        context,
        stack: error.stack?.substring(0, 150), // Truncate stack trace
      },
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.trackEvent({
      action: 'performance',
      category: 'performance',
      label: metric,
      value,
      customData: { unit },
    });
  }

  /**
   * Track theme changes
   */
  trackThemeChange(theme: 'light' | 'dark'): void {
    this.trackEvent({
      action: 'theme_change',
      category: 'settings',
      label: theme,
    });

    this.setUserProperties({ theme });
  }

  /**
   * Track locale changes
   */
  trackLocaleChange(locale: string): void {
    this.trackEvent({
      action: 'locale_change',
      category: 'settings',
      label: locale,
    });

    this.setUserProperties({ locale });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, action?: string): void {
    this.trackEvent({
      action: action || 'use',
      category: 'features',
      label: featureName,
    });
  }

  /**
   * Track outbound links
   */
  trackOutboundLink(url: string, openInNewTab: boolean = true): void {
    this.trackLinkClick(url, 'external');
    
    // Don't delay navigation
    if (!openInNewTab) {
      setTimeout(() => {
        window.location.href = url;
      }, 100);
    }
  }

  /**
   * Identify user (for authenticated users)
   */
  identifyUser(userId: string, properties?: UserProperties): void {
    this.executeOrQueue(() => {
      if (window.gtag) {
        window.gtag('set', { user_id: userId });
      }

      if (window.clarity) {
        window.clarity('identify', userId);
      }

      if (properties) {
        this.setUserProperties({ ...properties, userId });
      }
    });
  }
}

// Export singleton instance
export const analytics = new AnalyticsManager();

// Export for use in components
export default analytics;
