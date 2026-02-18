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
  { platform: 'x', href: 'https://x.com/rabbitholeinc', label: 'X (Twitter)' },
  { platform: 'github', href: 'https://github.com/rabbitholeinc', label: 'GitHub' },
  { platform: 'discord', href: 'https://discord.gg/KxF9b6HY6h', label: 'Discord' },
  { platform: 'linkedin', href: 'https://linkedin.com/company/rabbitholeinc', label: 'LinkedIn' },
  { platform: 'youtube', href: 'https://youtube.com/@rabbitholeinc', label: 'YouTube' },
];
