/**
 * Social media links configuration
 * Shared across Rabbit Hole Inc properties
 */

export interface SocialLink {
  platform: string;
  href: string;
  label: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { platform: 'x', href: 'https://x.com/rabbitholewld', label: 'X (Twitter)' },
  { platform: 'github', href: 'https://github.com/manicagency', label: 'GitHub' },
  { platform: 'discord', href: 'https://discord.gg/KxF9b6HY6h', label: 'Discord' },
  { platform: 'linkedin', href: 'https://www.linkedin.com/company/manicagency', label: 'LinkedIn' },
];
