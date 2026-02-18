import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, ArrowRight, Github, Linkedin, Twitter, Globe, Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '../../../i18n';

type Props = {
  params: {
    locale: string;
  };
};

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale: locale as Locale, namespace: 'about' });
  const title = `${t('hero.title')} — AgentOS`;
  const description = t('mission.p1');
  const canonical = locale === 'en' ? '/about' : `/${locale}/about`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: `https://agentos.sh${canonical}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function AboutPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale: locale as Locale, namespace: 'about' });
  const homeHref = locale === 'en' ? '/' : `/${locale}`;

  const connectLinks = [
    { label: t('connect.github'), href: 'https://github.com/framersai/agentos', icon: Github },
    { label: t('connect.linkedin'), href: 'https://www.linkedin.com/company/framersai', icon: Linkedin },
    { label: t('connect.twitter'), href: 'https://twitter.com/framersai', icon: Twitter },
    { label: t('connect.frameDev'), href: 'https://frame.dev', icon: Globe },
  ];

  const contactCards = [
    {
      title: t('team.generalInquiries'),
      description: t('team.description'),
      email: 'team@frame.dev',
    },
    {
      title: t('team.enterpriseSupport'),
      description: t('team.enterpriseSupportDesc'),
      email: 'enterprise@frame.dev',
    },
    {
      title: t('team.hiring'),
      description: t('team.joinUs'),
      email: 'careers@frame.dev',
    },
  ];

  return (
    <main id="main-content" className="relative overflow-hidden bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-accent-primary/10 to-transparent blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-20">
        {/* Hero */}
        <section className="space-y-8 text-center">
          <p className="uppercase tracking-[0.5em] text-xs text-accent-primary">
            {t('hero.weAreFramers')}
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight gradient-text">
            {t('hero.title')}
          </h1>
          <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
            {t('hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/framersai/agentos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#5b21b6] dark:bg-gradient-to-r dark:from-accent-primary dark:to-accent-secondary text-white font-semibold shadow-lg shadow-accent-primary/30 hover:bg-[#6d28d9] dark:hover:from-accent-primary dark:hover:to-accent-secondary transition-colors"
            >
              <Github className="w-4 h-4" />
              {t('cta.viewOnGithub')}
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href={homeHref as Route}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-border-subtle text-[var(--color-text-primary)] font-semibold hover:border-accent-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('cta.backToHome')}
            </Link>
          </div>
        </section>

        {/* Mission */}
        <section className="rounded-[32px] border border-border-subtle/60 bg-white/70 dark:bg-white/5 p-10 space-y-6 shadow-2xl shadow-black/5">
          <h2 className="text-3xl font-bold">{t('mission.title')}</h2>
          <p className="text-lg text-[var(--color-text-secondary)]">{t('mission.p1')}</p>
          <p className="text-lg text-[var(--color-text-secondary)]">{t('mission.p2')}</p>
        </section>

        {/* Team & Contact */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">{t('team.title')}</h2>
            <p className="text-[var(--color-text-secondary)] max-w-3xl">{t('team.description')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {contactCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-border-subtle/60 bg-white/70 dark:bg-white/5 p-6 flex flex-col gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-accent-primary">{t('team.title')}</p>
                  <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mt-2">{card.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">{card.description}</p>
                </div>
                <a
                  href={`mailto:${card.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-background-tertiary)] text-[var(--color-text-primary)] text-sm font-semibold hover:bg-[var(--color-accent-primary)]/10 hover:text-[var(--color-accent-primary)] transition-colors w-fit border border-[var(--color-border-subtle)]"
                >
                  <Mail className="w-4 h-4" />
                  {card.email}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Connect */}
        <section className="rounded-3xl bg-gradient-to-r from-accent-primary/10 via-transparent to-accent-secondary/10 p-8 border border-border-subtle/60">
          <h2 className="text-3xl font-bold mb-6">{t('connect.title')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {connectLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-border-subtle/60 bg-[var(--color-background-secondary)] dark:bg-white/5 px-5 py-4 hover:border-accent-primary hover:bg-[var(--color-accent-primary)]/5 transition-colors"
              >
                <Icon className="w-5 h-5 text-accent-primary" />
                <span className="text-lg font-semibold text-[var(--color-text-primary)]">{label}</span>
                <ArrowRight className="w-4 h-4 ml-auto text-[var(--color-text-secondary)]" />
              </a>
            ))}
          </div>
        </section>

        {/* License */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold">{t('license.title')}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle/60 bg-[var(--color-background-secondary)] dark:bg-white/5 p-6">
              <h3 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">{t('license.core')}</h3>
              <p className="text-[var(--color-text-secondary)]">{t('license.coreDesc')}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle/60 bg-[var(--color-background-secondary)] dark:bg-white/5 p-6">
              <h3 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">{t('license.extensions')}</h3>
              <p className="text-[var(--color-text-secondary)]">{t('license.extensionsDesc')}</p>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('license.footer')}</p>
        </section>
      </div>
    </main>
  );
}