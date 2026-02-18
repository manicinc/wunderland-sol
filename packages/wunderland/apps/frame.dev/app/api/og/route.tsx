/**
 * Dynamic OpenGraph image generation API route
 * 
 * Generates SVG OG images for Codex pages with:
 * - Page title
 * - Hierarchy level badge (Weave/Loom/Strand)
 * - Frame logo
 * - Gradient backgrounds
 * 
 * Usage: /api/og?title=Page+Title&type=strand
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') || 'Quarry'
  const type = (searchParams.get('type') || 'strand') as 'weave' | 'loom' | 'strand'

  // Type-specific colors
  const colors = {
    weave: { bg: '#f59e0b', text: '#78350f', label: 'Weave' },
    loom: { bg: '#06b6d4', text: '#164e63', label: 'Loom' },
    strand: { bg: '#8b5cf6', text: '#5b21b6', label: 'Strand' },
  }

  const color = colors[type]

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '60px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#fff',
              letterSpacing: '0.05em',
            }}
          >
            FRAME CODEX
          </div>
        </div>

        {/* Type Badge */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '60px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: color.bg,
            color: color.text,
            borderRadius: '999px',
            fontSize: '16px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {color.label}
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          <h1
            style={{
              fontSize: title.length > 50 ? '48px' : '64px',
              fontWeight: 'black',
              color: '#fff',
              lineHeight: 1.2,
              margin: 0,
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            {title}
          </h1>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '60px',
            right: '60px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '16px',
            color: '#9ca3af',
          }}
        >
          <span>The codex of humanity for LLM knowledge retrieval</span>
          <span>frame.dev/codex</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

