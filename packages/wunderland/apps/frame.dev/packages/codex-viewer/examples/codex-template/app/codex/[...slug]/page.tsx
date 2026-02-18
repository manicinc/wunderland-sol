import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { buildOgImageUrl, toAbsoluteUrl } from '@/lib/site'
import { buildPermalink, getAllStrands, getStrandBySlug } from '@/lib/strands'

type PageProps = {
  params: {
    slug: string[]
  }
}

export const revalidate = 3600

export async function generateStaticParams() {
  const strands = await getAllStrands()
  const limit = Number(process.env.CODEX_PRERENDER_LIMIT ?? 100)

  return strands.slice(0, limit).map((strand) => ({
    slug: strand.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const strand = await getStrandBySlug(params.slug)

  if (!strand) {
    return {
      title: 'Strand not found',
      description: 'This strand could not be located.',
    }
  }

  const title = strand.frontmatter.title ?? strand.slug[strand.slug.length - 1]
  const description = strand.frontmatter.description ?? strand.summary ?? 'Codex strand'
  const imageCandidate = strand.firstImage?.startsWith('http')
    ? strand.firstImage
    : strand.firstImage
      ? toAbsoluteUrl(strand.firstImage.startsWith('/') ? strand.firstImage : `/${strand.firstImage}`)
      : undefined

  const ogImage = buildOgImageUrl({
    title,
    badge: strand.weaveLabel,
    summary: strand.summary,
    image: imageCandidate,
  })

  const canonical = buildPermalink(strand.slug)

  return {
    title: `${title} · ${strand.weaveLabel}`,
    description,
    keywords: strand.frontmatter.tags,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} OpenStrand`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function StrandPage({ params }: PageProps) {
  const strand = await getStrandBySlug(params.slug)

  if (!strand) {
    notFound()
  }

  const title = strand.frontmatter.title ?? strand.slug[strand.slug.length - 1]
  const status = strand.frontmatter?.publishing?.status ?? 'draft'
  const lastUpdated = strand.frontmatter?.publishing?.lastUpdated ?? strand.lastUpdatedISO

  return (
    <main className="mx-auto max-w-4xl pb-16 pt-8">
      <div className="rounded-3xl border border-amber-200/70 bg-white/90 p-8 shadow-lg">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{strand.weaveLabel}</span>
          <span className="rounded-full bg-gray-900 px-3 py-1 text-white">{status}</span>
        </div>
        <h1 className="mt-6 text-4xl font-semibold text-gray-900">{title}</h1>
        {strand.summary && <p className="mt-4 text-lg text-gray-700">{strand.summary}</p>}

        <div className="mt-6 grid gap-4 text-sm text-gray-600 sm:grid-cols-2">
          <dl className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Last updated</dt>
            <dd className="mt-1 text-base text-gray-900">
              {new Date(lastUpdated).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </dl>
          <dl className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">Path</dt>
            <dd className="mt-1 font-mono text-xs text-gray-800">weaves/{strand.relativePath}</dd>
          </dl>
        </div>
      </div>

      <article className="prose prose-lg mt-10 max-w-none rounded-3xl border border-gray-200 bg-white/95 p-8 shadow-xl prose-headings:font-semibold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-code:rounded prose-code:bg-gray-900/5 prose-code:px-1.5 prose-code:py-0.5">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {strand.content}
        </ReactMarkdown>
      </article>
    </main>
  )
}


