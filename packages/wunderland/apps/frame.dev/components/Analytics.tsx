/**
 * Analytics Component - GDPR Compliant with Anonymous Tracking
 * 
 * PRIVACY MODES:
 * 
 * 1. ANONYMOUS MODE (No Consent Required):
 *    - GA4 Consent Mode v2: Cookieless pings, modeled conversions
 *    - Clarity Cookieless Mode: Session replay without cookies
 *    - No PII, no persistent identifiers, IP anonymized
 *    - Compliant with GDPR Art. 6(1)(f) legitimate interest
 * 
 * 2. FULL TRACKING (After Consent):
 *    - GA4 with cookies for returning user recognition
 *    - Clarity with full session replay
 *    - Enhanced engagement events (scroll, time, clicks)
 * 
 * 3. DO NOT TRACK:
 *    - Respects browser DNT setting completely
 *    - No scripts loaded at all
 */

'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

interface AnalyticsProps {
  /** Google Analytics 4 Measurement ID (e.g., G-XXXXXXXXXX) */
  gaId?: string
  /** Microsoft Clarity Project ID (e.g., abc123def) */
  clarityId?: string
}

/**
 * Check if user has enabled Do Not Track
 */
function isDNTEnabled(): boolean {
  if (typeof navigator === 'undefined') return false
  const dnt = navigator.doNotTrack || (window as unknown as { doNotTrack?: string }).doNotTrack || (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack
  return dnt === '1' || dnt === 'yes'
}

/**
 * Get cookie consent status from localStorage
 * Returns: 'granted' | 'denied' | 'pending'
 */
function getConsentStatus(): 'granted' | 'denied' | 'pending' {
  if (typeof window === 'undefined') return 'pending'
  const consent = localStorage.getItem('cookie-consent')
  if (consent === 'true') return 'granted'
  if (consent === 'false') return 'denied'
  return 'pending'
}

/**
 * Track consent decision in GA4 (works even without full consent)
 */
function trackConsentDecision(decision: 'accepted' | 'rejected') {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'consent_decision', {
      event_category: 'privacy',
      event_label: decision,
      non_interaction: true,
    })
  }
}

export default function Analytics({ gaId, clarityId }: AnalyticsProps) {
  const [consentStatus, setConsentStatus] = useState<'granted' | 'denied' | 'pending'>('pending')
  const [dntEnabled, setDntEnabled] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setConsentStatus(getConsentStatus())
    setDntEnabled(isDNTEnabled())

    // Listen for consent changes
    const handleConsentChange = (e: Event) => {
      const newStatus = getConsentStatus()
      const previousStatus = consentStatus
      setConsentStatus(newStatus)

      // Track consent decision (only on actual change from pending)
      if (previousStatus === 'pending' && newStatus !== 'pending') {
        trackConsentDecision(newStatus === 'granted' ? 'accepted' : 'rejected')
      }

      // Update GA4 consent state
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: newStatus === 'granted' ? 'granted' : 'denied',
        })
      }

      // Initialize Clarity after consent (if not already loaded)
      if (newStatus === 'granted' && clarityId && !(window as any).clarity) {
        loadClarity(clarityId, true)
      }
    }

    window.addEventListener('cookie-consent-changed', handleConsentChange)
    return () => window.removeEventListener('cookie-consent-changed', handleConsentChange)
  }, [consentStatus, clarityId])

  // Enhanced page view tracking (only when full consent granted)
  useEffect(() => {
    if (consentStatus !== 'granted' || !gaId || dntEnabled) return

    const handleRouteChange = () => {
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'page_view', {
          page_path: window.location.pathname,
          page_title: document.title,
        })
      }
    }

    // Track initial page view
    handleRouteChange()

    // Track navigation events (for SPA)
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [consentStatus, gaId, dntEnabled])

  // If DNT is enabled, respect it completely - no tracking at all
  if (dntEnabled) {
    return null
  }

  // No analytics IDs provided
  if (!gaId && !clarityId) {
    return null
  }

  // Don't render during SSR
  if (!isClient) {
    return null
  }

  const hasFullConsent = consentStatus === 'granted'

  return (
    <>
      {/* ============================================================
          GOOGLE ANALYTICS 4 - Consent Mode v2
          ============================================================
          ALWAYS loads for anonymous tracking (GDPR legitimate interest)
          - Without consent: Cookieless pings, no user ID, modeled data
          - With consent: Full tracking with cookies
          ============================================================ */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}

              // Consent Mode v2 - Set defaults BEFORE loading
              gtag('consent', 'default', {
                analytics_storage: '${hasFullConsent ? 'granted' : 'denied'}',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                functionality_storage: 'denied',
                personalization_storage: 'denied',
                security_storage: 'granted',
                // Enable cookieless pings for anonymous tracking
                wait_for_update: 500,
              });

              gtag('js', new Date());

              // Configure GA4 with maximum privacy
              gtag('config', '${gaId}', {
                // Privacy settings
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false,
                
                // Cookie settings (only used when consent granted)
                cookie_flags: 'SameSite=None;Secure',
                cookie_expires: 63072000, // 2 years max
                
                // Always send page views (anonymous without consent)
                send_page_view: true,
                
                // Debug mode (remove in production)
                // debug_mode: true,
              });

              // ============================================================
              // ENHANCED TRACKING (Only with full consent)
              // ============================================================
              ${hasFullConsent ? `
              (function() {
                // Scroll depth tracking
                var scrollDepths = [25, 50, 75, 100];
                var trackedDepths = [];
                var ticking = false;

                function trackScroll() {
                  if (ticking) return;
                  ticking = true;
                  
                  requestAnimationFrame(function() {
                    var scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
                    
                    scrollDepths.forEach(function(depth) {
                      if (scrollPercent >= depth && trackedDepths.indexOf(depth) === -1) {
                        gtag('event', 'scroll_depth', {
                          event_category: 'engagement',
                          event_label: depth + '%',
                          value: depth,
                          non_interaction: true
                        });
                        trackedDepths.push(depth);
                      }
                    });
                    ticking = false;
                  });
                }

                window.addEventListener('scroll', trackScroll, { passive: true });

                // Time on page tracking
                var startTime = Date.now();
                var timeIntervals = [30, 60, 120, 300]; // seconds
                var trackedIntervals = [];

                setInterval(function() {
                  var timeOnPage = Math.round((Date.now() - startTime) / 1000);
                  
                  timeIntervals.forEach(function(interval) {
                    if (timeOnPage >= interval && trackedIntervals.indexOf(interval) === -1) {
                      gtag('event', 'time_on_page', {
                        event_category: 'engagement',
                        event_label: interval + 's',
                        value: interval,
                        non_interaction: true
                      });
                      trackedIntervals.push(interval);
                    }
                  });
                }, 5000);

                // CTA and social click tracking
                document.addEventListener('click', function(e) {
                  var target = e.target.closest('a');
                  if (!target) return;
                  
                  var href = target.href || '';
                  
                  if (href.includes('mailto:')) {
                    gtag('event', 'contact_click', { event_category: 'engagement', event_label: 'email' });
                  } else if (href.includes('discord')) {
                    gtag('event', 'social_click', { event_category: 'engagement', event_label: 'discord' });
                  } else if (href.includes('github')) {
                    gtag('event', 'social_click', { event_category: 'engagement', event_label: 'github' });
                  } else if (href.includes('twitter') || href.includes('x.com')) {
                    gtag('event', 'social_click', { event_category: 'engagement', event_label: 'twitter' });
                  } else if (href.includes('#pricing')) {
                    gtag('event', 'cta_click', { event_category: 'conversion', event_label: 'pricing' });
                  } else if (href.includes('/quarry/app')) {
                    gtag('event', 'cta_click', { event_category: 'conversion', event_label: 'try_app' });
                  }
                });

                // Track outbound links
                document.addEventListener('click', function(e) {
                  var target = e.target.closest('a');
                  if (!target || !target.href) return;
                  
                  try {
                    var url = new URL(target.href);
                    if (url.hostname !== window.location.hostname) {
                      gtag('event', 'outbound_click', {
                        event_category: 'outbound',
                        event_label: url.hostname,
                        transport_type: 'beacon'
                      });
                    }
                  } catch(err) {}
                });
              })();
              ` : '// Enhanced tracking disabled - anonymous mode only'}
            `}
          </Script>
        </>
      )}

      {/* ============================================================
          MICROSOFT CLARITY - Cookieless Mode Available
          ============================================================
          Mode depends on consent:
          - Without consent: Cookieless mode (anonymous sessions)
          - With consent: Full mode with cookies
          ============================================================ */}
      {clarityId && (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");

            // Configure Clarity based on consent
            ${!hasFullConsent ? `
            // Cookieless mode - no persistent tracking
            window.clarity("set", "cookies", false);
            ` : `
            // Full mode with consent - enable all features
            window.clarity("set", "cookies", true);
            `}

            // Identify page type for better analytics
            window.clarity("set", "page_type", "${typeof window !== 'undefined' && window.location.pathname.includes('/quarry/landing') ? 'landing' : 'marketing'}");
          `}
        </Script>
      )}
    </>
  )
}

/**
 * Dynamically load Clarity (used when consent is granted after initial load)
 */
function loadClarity(clarityId: string, withCookies: boolean) {
  if (typeof window === 'undefined' || (window as any).clarity) return
  
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${clarityId}`
  document.head.appendChild(script)
  
  script.onload = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'cookies', withCookies)
    }
  }
}
