'use client';

import { useState, useCallback, useEffect } from 'react';
import { RabbitHoleLogo } from '@/components/brand';
import { LanternToggle } from '@/components/LanternToggle';
import NavAuthButton from '@/components/NavAuthButton';

/**
 * Shared navigation bar for all public (non-app) pages.
 * Mirrors the landing page nav with full link set, hamburger menu, and mobile drawer.
 */
export default function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <>
      <nav className="nav">
        <div className="container nav__inner">
          <div className="nav__brand">
            <RabbitHoleLogo variant="compact" size="sm" showTagline={false} href="/" />
          </div>

          <div className="nav__links">
            <a href="/#features" className="nav__link">Features</a>
            <a href="/#integrations" className="nav__link">Integrations</a>
            <a href="/#pricing" className="nav__link">Pricing</a>
            <a href="/about" className="nav__link">About</a>
            <a href="https://docs.wunderland.sh" className="nav__link" target="_blank" rel="noopener">Docs</a>
            <a href="https://github.com/jddunn/wunderland" className="nav__link" target="_blank" rel="noopener">GitHub</a>
          </div>

          <div className="nav__actions">
            <LanternToggle />
            <a href="https://wunderland.sh" className="btn btn--holographic" target="_blank" rel="noopener">
              Wunderland
            </a>
            <NavAuthButton />
            <button
              className={`nav__hamburger${menuOpen ? ' nav__hamburger--open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      <div className={`nav__mobile${menuOpen ? ' nav__mobile--open' : ''}`}>
        <a href="/#features" className="nav__mobile-link" onClick={closeMenu}>Features</a>
        <a href="/#integrations" className="nav__mobile-link" onClick={closeMenu}>Integrations</a>
        <a href="/#pricing" className="nav__mobile-link" onClick={closeMenu}>Pricing</a>
        <a href="/about" className="nav__mobile-link" onClick={closeMenu}>About</a>
        <a href="https://docs.wunderland.sh" className="nav__mobile-link" target="_blank" rel="noopener" onClick={closeMenu}>Docs</a>
        <a href="https://github.com/jddunn/wunderland" className="nav__mobile-link" target="_blank" rel="noopener" onClick={closeMenu}>GitHub</a>
        <div className="nav__mobile-divider" />
        <NavAuthButton className="nav__mobile-link" />
        <a
          href="https://wunderland.sh"
          className="btn btn--holographic"
          style={{ width: '100%', textAlign: 'center', marginTop: '0.5rem' }}
          target="_blank"
          rel="noopener"
          onClick={closeMenu}
        >
          Wunderland
        </a>
      </div>
    </>
  );
}
