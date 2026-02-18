import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET

  if (!secret) {
    return new Response(JSON.stringify({ error: 'Missing REVALIDATE_SECRET env var' }), {
      status: 500,
    })
  }

  const body = await req.json().catch(() => ({}))
  const provided = body?.secret ?? new URL(req.url).searchParams.get('secret')

  if (provided !== secret) {
    return new Response(JSON.stringify({ error: 'Invalid secret' }), {
      status: 401,
    })
  }

  let slugArray: string[] | undefined

  if (Array.isArray(body?.slug)) {
    slugArray = body.slug
  } else if (typeof body?.slug === 'string') {
    slugArray = body.slug.split('/').filter(Boolean)
  }

  const path = body?.path ?? (slugArray ? `/codex/${slugArray.join('/')}` : undefined)

  if (path) {
    revalidatePath(path)
  }

  revalidatePath('/sitemap.xml')

  return Response.json({
    revalidated: true,
    path: path ?? 'global',
    timestamp: new Date().toISOString(),
  })
}


