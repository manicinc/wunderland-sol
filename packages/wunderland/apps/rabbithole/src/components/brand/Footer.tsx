/**
 * @file Footer.tsx
 * @description Rabbit Hole branded footer component
 */

'use client';

import React from 'react';
import { RabbitHoleLogo } from './RabbitHoleLogo';
import { SocialIcons } from './SocialIcons';
import styles from './Footer.module.scss';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterProps {
  /** Custom tagline for the logo */
  tagline?: string;
  /** Additional footer links */
  links?: FooterLink[];
  /** Custom copyright text */
  copyright?: string;
  /** Additional CSS classes */
  className?: string;
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'About', href: '/about' },
  { label: 'Wunderland', href: 'https://wunderland.sh', external: true },
  { label: 'Docs', href: 'https://docs.wunderland.sh', external: true },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'Security', href: '/security' },
  { label: 'GitHub', href: 'https://github.com/manicinc/wunderland-sol', external: true },
];

export function Footer({
  tagline = "FOUNDER'S CLUB",
  links = DEFAULT_LINKS,
  copyright = `${new Date().getFullYear()} Rabbit Hole Inc.`,
  className,
}: FooterProps) {
  return (
    <footer className={`${styles.footer} ${className || ''}`}>
      <div className={styles.container}>
        {/* Top row: Logo + Social icons */}
        <div className={styles.top}>
          <div className={styles.brand}>
            <RabbitHoleLogo variant="full" tagline={tagline} size="sm" href="/" />
          </div>
          <SocialIcons />
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Bottom row: Links + Copyright */}
        <div className={styles.bottom}>
          <nav className={styles.links}>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={styles.link}
                {...(link.external && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <p className={styles.copyright}>&copy; {copyright}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
