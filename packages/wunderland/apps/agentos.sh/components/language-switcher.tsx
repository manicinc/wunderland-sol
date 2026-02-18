'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { locales, localeNames, type Locale } from '../i18n';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const switchLocale = (newLocale: Locale) => {
    if (!pathname) return;

    // Normalise: remove existing locale prefix if present
    let subPath = pathname;
    const segments = pathname.split('/');
    const firstSeg = segments[1] as Locale | undefined;
    if (firstSeg && locales.includes(firstSeg)) {
      subPath = '/' + segments.slice(2).join('/');
      if (subPath === '//' || subPath === '') subPath = '/';
    }

    // Build the new url – English remains at root
    const targetPath =
      newLocale === 'en' ? subPath || '/' : `/${newLocale}${subPath === '/' ? '' : subPath}`;

    // Persist preference (non-critical)
    try {
      localStorage.setItem('preferred-locale', newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    } catch {
      /* ignore */
    }

    // Use full navigation to guarantee fresh messages and styles for locale
    if (typeof window !== 'undefined') {
      window.location.assign(targetPath);
    } else {
      router.replace(targetPath);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass-morphism hover:bg-accent-primary/10 transition-all min-h-[44px] min-w-[44px]"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline text-sm font-medium">
          {localeNames[locale]}
        </span>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl overflow-hidden z-50 border border-[var(--color-border-primary)] bg-[var(--color-background-card)] backdrop-blur-xl"
          role="menu"
          aria-orientation="vertical"
          style={{ 
            boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 2px 10px rgba(0,0,0,0.1)' 
          }}
        >
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-all ${
                loc === locale
                  ? 'bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] font-semibold'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-accent-primary)]/10 hover:text-[var(--color-accent-primary)]'
              }`}
              role="menuitem"
            >
              <span>{localeNames[loc]}</span>
              {loc === locale && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

