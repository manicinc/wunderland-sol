'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

// Replace with your actual GA4 Measurement ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

/**
 * Google Analytics 4 component with GDPR-compliant consent mode
 * 
 * This component:
 * 1. Loads gtag.js with default denied consent
 * 2. Waits for user consent before enabling tracking
 * 3. Integrates with the CookieConsent component
 */
export function GoogleAnalytics() {
  const [consentGiven, setConsentGiven] = useState(false);

  // Check for stored consent on mount
  useEffect(() => {
    const syncConsent = (value: string | null) => {
      try {
        if (!value) {
          setConsentGiven(false);
          return;
        }
        const parsed = JSON.parse(value);
        setConsentGiven(Boolean(parsed.consent?.analytics));
      } catch {
        // Ignore parsing errors
      }
    };

    // Initial read
    syncConsent(localStorage.getItem('agentos-cookie-consent'));

    // Listen for consent changes
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

  // Don't render if no measurement ID
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    return null;
  }

  return (
    <>
      {/* Google Analytics with Consent Mode v2 */}
      <Script
        id="ga-consent-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            
            // Default to denied - GDPR compliant
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'functionality_storage': 'granted',
              'security_storage': 'granted',
              'wait_for_update': 500
            });
            
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              cookie_flags: 'SameSite=None;Secure'
            });
          `,
        }}
      />
      
      {/* Load gtag.js */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />

      {/* Update consent when user accepts */}
      {consentGiven && (
        <Script
          id="ga-consent-update"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof gtag === 'function') {
                gtag('consent', 'update', {
                  'analytics_storage': 'granted'
                });
              }
            `,
          }}
        />
      )}
    </>
  );
}

export default GoogleAnalytics;
