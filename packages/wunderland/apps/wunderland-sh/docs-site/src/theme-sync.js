/**
 * theme-sync.js — Syncs theme between wunderland.sh and docs.wunderland.sh via domain cookie.
 *
 * wunderland.sh writes a `wl-theme` cookie on `.wunderland.sh` domain.
 * This module reads that cookie on load and syncs it to Docusaurus's theme system.
 * When the user toggles theme on docs, it writes back to the cookie.
 */

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? match[1] : null;
}

function setCookie(name, value) {
  document.cookie = `${name}=${value};path=/;domain=.wunderland.sh;max-age=31536000;SameSite=Lax`;
}

// On page load: read wl-theme cookie and sync to Docusaurus
export function onRouteDidUpdate() {
  try {
    const cookieTheme = getCookie('wl-theme');
    if (!cookieTheme) return;

    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (cookieTheme !== currentTheme) {
      document.documentElement.setAttribute('data-theme', cookieTheme);
      // Also update Docusaurus's localStorage key so it persists
      localStorage.setItem('theme', cookieTheme);
    }
  } catch {
    // Ignore cookie/localStorage errors (SSR, privacy mode, etc.)
  }
}

// Watch for theme changes and sync back to cookie
if (typeof window !== 'undefined') {
  // Initial sync on module load
  try {
    const cookieTheme = getCookie('wl-theme');
    if (cookieTheme) {
      document.documentElement.setAttribute('data-theme', cookieTheme);
      localStorage.setItem('theme', cookieTheme);
    }
  } catch {
    // Ignore
  }

  // Observe data-theme attribute changes (Docusaurus toggle)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        const newTheme = document.documentElement.getAttribute('data-theme');
        if (newTheme) {
          setCookie('wl-theme', newTheme);
        }
      }
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
}
