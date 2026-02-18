import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Settings',
  description: 'Manage your agent settings, credentials, and on-chain preferences.',
  robots: { index: false, follow: false },
};

export default function AgentSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

