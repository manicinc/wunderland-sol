import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'faq' })
  return {
    title: `${t('title')} - AgentOS`,
    description: t('subtitle'),
    alternates: { canonical: 'https://agentos.sh/faq' },
    openGraph: {
      title: `${t('title')} - AgentOS`,
      description: t('subtitle'),
      url: 'https://agentos.sh/faq',
      siteName: 'AgentOS',
      images: [{ url: '/og-image.png' }],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('title')} - AgentOS`,
      description: t('subtitle')
    },
    authors: [{ name: 'Manic Agency', url: 'https://manic.agency' }]
  }
}

function FAQJsonLd() {
  const t = useTranslations('faq')
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: t('questions.whatIsAgentOS.question'),
        acceptedAnswer: {
          '@type': 'Answer',
          text: t('questions.whatIsAgentOS.answer'),
        },
      },
      {
        '@type': 'Question',
        name: t('questions.customPersonas.question'),
        acceptedAnswer: {
          '@type': 'Answer',
          text: t('questions.customPersonas.answer'),
        },
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  )
}

export default function AgentOSFaqPage() {
  const t = useTranslations('faq')
  
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <FAQJsonLd />
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          {t('subtitle')}
        </p>
      </header>

      <section className="space-y-7 md:space-y-8">
        <article>
          <h2 className="text-xl md:text-2xl font-semibold">{t('questions.whatIsAgentOS.question')}</h2>
          <p className="mt-2">
            {t('questions.whatIsAgentOS.answer')}
          </p>
        </article>
        <article>
          <h2 className="text-xl md:text-2xl font-semibold">{t('questions.integration.question')}</h2>
          <p className="mt-2">
            {t('questions.integration.answer')}
          </p>
        </article>
        <article>
          <h2 className="text-xl md:text-2xl font-semibold">{t('questions.customPersonas.question')}</h2>
          <p className="mt-2">
            {t('questions.customPersonas.answer')}
          </p>
        </article>
      </section>

      <section className="mt-10 md:mt-14">
        <h3 className="text-lg font-semibold">{t('seeAlso')}</h3>
        <ul className="mt-3 grid gap-2 underline text-brand">
          <li><a href="https://vca.chat/faq" target="_blank" rel="noopener">{t('links.vcaFaq')}</a></li>
          <li><a href="https://frame.dev/faq" target="_blank" rel="noopener">{t('links.frameFaq')}</a></li>
          <li><a href="https://manic.agency" target="_blank" rel="noopener">{t('links.manic')}</a></li>
          <li><a href="https://manic.agency/blog" target="_blank" rel="noopener">{t('links.lookingGlass')}</a></li>
        </ul>
      </section>
    </main>
  )
}
