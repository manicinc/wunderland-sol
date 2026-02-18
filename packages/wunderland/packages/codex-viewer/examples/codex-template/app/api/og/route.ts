import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const frameMark = (
  <svg width="120" height="32" viewBox="0 0 120 32" fill="none">
    <rect x="1" y="1" width="30" height="30" stroke="#0f172a" strokeWidth="2" rx="6" />
    <rect x="7" y="7" width="18" height="18" stroke="#0f172a" strokeWidth="2" rx="4" />
    <text x="46" y="22" fontSize="18" fontFamily="Inter, sans-serif" fill="#0f172a" fontWeight="600">
      Frame
    </text>
  </svg>
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? 'Codex strand'
  const badge = searchParams.get('badge') ?? 'OpenStrand'
  const summary = searchParams.get('summary') ?? ''
  const image = searchParams.get('image')

  let imageData: ArrayBuffer | undefined
  if (image) {
    try {
      const absoluteUrl = image.startsWith('http') ? image : new URL(image, request.url).toString()
      const res = await fetch(absoluteUrl)
      if (res.ok) {
        imageData = await res.arrayBuffer()
      }
    } catch {
      // silent fallback
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#fdfbf6',
          color: '#0f172a',
          padding: '60px',
          position: 'relative',
          fontFamily: 'Inter, "Space Grotesk", sans-serif',
        }}
      >
        {imageData ? (
          <img
            src={imageData}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.25,
              filter: 'saturate(0.8)',
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top left, rgba(255,255,255,0.9), rgba(253,251,246,0.85))',
            border: '32px solid rgba(15,23,42,0.04)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                backgroundColor: 'rgba(14,165,233,0.08)',
                color: '#0369a1',
                border: '1px solid rgba(14,165,233,0.4)',
              }}
            >
              {badge}
            </span>
          </div>
          <h1
            style={{
              marginTop: 30,
              fontSize: 76,
              lineHeight: 1.05,
              maxWidth: '900px',
              fontWeight: 600,
            }}
          >
            {title}
          </h1>
          {summary ? (
            <p
              style={{
                marginTop: 20,
                fontSize: 32,
                lineHeight: 1.4,
                maxWidth: '860px',
                color: 'rgba(15,23,42,0.8)',
              }}
            >
              {summary}
            </p>
          ) : null}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
            {frameMark}
            <span style={{ fontSize: 26, letterSpacing: '0.4em', textTransform: 'uppercase' }}>
              frame.dev/codex
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}


