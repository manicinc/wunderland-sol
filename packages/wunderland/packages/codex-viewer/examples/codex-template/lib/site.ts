const DEFAULT_DEPLOYMENT =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export function getSiteUrl() {
  return DEFAULT_DEPLOYMENT
}

export function toAbsoluteUrl(pathname: string) {
  const trimmed = pathname.startsWith('http') ? pathname : new URL(pathname, getSiteUrl()).toString()
  return trimmed
}

type OgParams = {
  title: string
  badge: string
  summary?: string
  image?: string
}

export function buildOgImageUrl({ title, badge, summary, image }: OgParams) {
  const params = new URLSearchParams({
    title,
    badge,
  })

  if (summary) params.set('summary', summary)
  if (image) params.set('image', image)

  return toAbsoluteUrl(`/api/og?${params.toString()}`)
}

export const DEFAULT_OG_FALLBACK = '/og/codex-generic.png'


