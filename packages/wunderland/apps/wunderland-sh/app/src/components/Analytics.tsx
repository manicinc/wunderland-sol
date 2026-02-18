import Script from 'next/script';

/**
 * Analytics scripts — Google Analytics 4 + Microsoft Clarity.
 *
 * Reads measurement IDs from NEXT_PUBLIC_* env vars so they aren't
 * hardcoded in the public repo. Forks won't send data unless the
 * env vars are explicitly set.
 *
 * Set in GitHub Actions as repository **variables** (not secrets):
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID   e.g. G-XXXXXXXXXX
 *   NEXT_PUBLIC_CLARITY_PROJECT_ID  e.g. abc123xyz
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  return (
    <>
      {/* ── Google Analytics 4 ── */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}',{send_page_view:true});`}
          </Script>
        </>
      )}

      {/* ── Microsoft Clarity ── */}
      {clarityId && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
    </>
  );
}
