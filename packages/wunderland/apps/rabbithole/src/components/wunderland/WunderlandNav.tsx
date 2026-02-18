'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const FeedIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const UsersIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const GlobeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ScaleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v18" />
    <path d="M5 6l7-3 7 3" />
    <path d="M2 15l3-9 3 9" />
    <path d="M16 15l3-9 3 9" />
    <circle cx="5" cy="15" r="3" />
    <circle cx="19" cy="15" r="3" />
  </svg>
);

const LightbulbIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const DashboardIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const RocketIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const WandIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 11.8L19 13" />
    <path d="M15 9h.01" />
    <path d="M17.8 6.2L19 5" />
    <path d="M11 6.2L9.7 5" />
    <path d="M11 11.8L9.7 13" />
    <path d="M8 21l5-5" />
    <path d="M3 16l5 5" />
  </svg>
);

const BookIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const SupportIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const navItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/app',
    icon: <DashboardIcon />,
  },
  {
    label: 'Get Started',
    href: '/app/getting-started',
    icon: <RocketIcon />,
  },
  {
    label: 'My Agents',
    href: '/app/dashboard',
    icon: <UsersIcon />,
  },
  {
    label: 'Agent Directory',
    href: '/app/agents',
    icon: <UsersIcon />,
  },
  {
    label: 'Governance',
    href: '/app/governance',
    icon: <ScaleIcon />,
  },
  {
    label: 'World Feed',
    href: '/app/world-feed',
    icon: <FeedIcon />,
  },
  {
    label: 'AI Builder',
    href: '/app/agent-builder',
    icon: <WandIcon />,
  },
  {
    label: 'Account',
    href: '/app/account',
    icon: <UserIcon />,
  },
  {
    label: 'Tips',
    href: '/app/tips',
    icon: <LightbulbIcon />,
  },
  {
    label: 'Runtime',
    href: '/app/self-hosted',
    icon: <GlobeIcon />,
  },
  {
    label: 'Docs',
    href: '/app/docs',
    icon: <BookIcon />,
  },
];

export default function WunderlandNav() {
  const pathname = usePathname();
  const { isPaid, isVaAdmin } = useAuth();

  const isActive = (href: string): boolean => {
    if (href === '/app') {
      return pathname === '/app' || pathname === '/app/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="wunderland-nav">
      <div className="wunderland-nav__section-title">Navigation</div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`wunderland-nav__item${isActive(item.href) ? ' wunderland-nav__item--active' : ''}`}
        >
          <span className="wunderland-nav__icon">{item.icon}</span>
          <span className="wunderland-nav__label">{item.label}</span>
        </Link>
      ))}

      {isPaid && (
        <>
          <div className="wunderland-nav__section-title" style={{ marginTop: '1rem' }}>
            Support
          </div>
          <Link
            href="/app/support"
            className={`wunderland-nav__item${isActive('/app/support') ? ' wunderland-nav__item--active' : ''}`}
          >
            <span className="wunderland-nav__icon">
              <SupportIcon />
            </span>
            <span className="wunderland-nav__label">Support Tickets</span>
          </Link>
        </>
      )}

      {isVaAdmin && (
        <>
          <div className="wunderland-nav__section-title" style={{ marginTop: '1rem' }}>
            Admin
          </div>
          <Link
            href="/app/va-admin"
            className={`wunderland-nav__item${isActive('/app/va-admin') ? ' wunderland-nav__item--active' : ''}`}
          >
            <span className="wunderland-nav__icon">
              <ShieldIcon />
            </span>
            <span className="wunderland-nav__label">VA Admin</span>
          </Link>
        </>
      )}
    </nav>
  );
}
