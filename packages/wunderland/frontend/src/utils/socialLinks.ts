/**
 * Social media links configuration
 * Centralized configuration for all social media links used across the application
 */

export interface SocialLink {
  name: string;
  url: string;
  icon: string;
  ariaLabel: string;
  color?: string;
}

export const socialLinks: SocialLink[] = [
  {
    name: 'GitHub',
    url: 'https://github.com/framersai/agentos',
    icon: 'github',
    ariaLabel: 'Visit our GitHub repository',
    color: '#333'
  },
  {
    name: 'Twitter',
    url: 'https://twitter.com/framersai',
    icon: 'twitter',
    ariaLabel: 'Follow us on Twitter',
    color: '#1DA1F2'
  },
  {
    name: 'LinkedIn',
    url: 'https://linkedin.com/company/framersai',
    icon: 'linkedin',
    ariaLabel: 'Connect with us on LinkedIn',
    color: '#0A66C2'
  },
  {
    name: 'Discord',
    url: 'https://discord.gg/framersai',
    icon: 'discord',
    ariaLabel: 'Join our Discord community',
    color: '#5865F2'
  },
  {
    name: 'Email',
    url: 'mailto:team@vca.chat',
    icon: 'email',
    ariaLabel: 'Send us an email',
    color: '#EA4335'
  }
];

export const getSocialLink = (name: string): SocialLink | undefined => {
  return socialLinks.find(link => link.name.toLowerCase() === name.toLowerCase());
};

export const getPrimarySocialLinks = (): SocialLink[] => {
  // Return the primary social links to show in main UI
  return socialLinks.filter(link => ['GitHub', 'Twitter', 'Discord'].includes(link.name));
};

export const getFooterSocialLinks = (): SocialLink[] => {
  // Return all social links for the footer
  return socialLinks;
};