/**
 * Collection Cover Generator
 * 
 * Generates beautiful, intricate SVG covers for collections
 * with advanced gradients, patterns, and geometric designs.
 */

export type CoverPattern = 
  | 'geometric'
  | 'waves'
  | 'mesh'
  | 'circuits'
  | 'topography'
  | 'aurora'
  | 'crystalline'
  | 'constellation'
  | 'abstract'
  | 'hexagons'

export interface CoverConfig {
  pattern: CoverPattern
  primaryColor: string
  secondaryColor?: string
  accentColor?: string
  seed?: number
  animated?: boolean
}

// Deterministic pseudo-random number generator
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = Math.sin(s * 9999) * 10000
    return s - Math.floor(s)
  }
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 99, g: 102, b: 241 } // Default indigo
}

// Darken color
function darken(hex: string, amount: number = 0.2): string {
  const { r, g, b } = hexToRgb(hex)
  const factor = 1 - amount
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
}

// Lighten color
function lighten(hex: string, amount: number = 0.2): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amount))}, ${Math.min(255, Math.round(g + (255 - g) * amount))}, ${Math.min(255, Math.round(b + (255 - b) * amount))})`
}

// Generate geometric pattern
function generateGeometric(config: CoverConfig, width: number, height: number): string {
  const random = seededRandom(config.seed || 42)
  const shapes: string[] = []
  const primary = config.primaryColor
  const secondary = config.secondaryColor || darken(primary, 0.3)
  
  // Generate overlapping triangles and polygons
  for (let i = 0; i < 12; i++) {
    const x = random() * width
    const y = random() * height
    const size = 30 + random() * 80
    const rotation = random() * 360
    const opacity = 0.1 + random() * 0.4
    
    const points = []
    const sides = 3 + Math.floor(random() * 4)
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2
      points.push(`${x + Math.cos(angle) * size},${y + Math.sin(angle) * size}`)
    }
    
    shapes.push(`<polygon 
      points="${points.join(' ')}" 
      fill="${i % 2 === 0 ? primary : secondary}" 
      opacity="${opacity}"
      transform="rotate(${rotation} ${x} ${y})"
    />`)
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="geo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.7)}" />
          <stop offset="100%" style="stop-color:${darken(primary, 0.5)}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo-bg)" />
      ${shapes.join('\n')}
    </svg>
  `
}

// Generate flowing waves pattern
function generateWaves(config: CoverConfig, width: number, height: number): string {
  const primary = config.primaryColor
  const secondary = config.secondaryColor || lighten(primary, 0.3)
  const accent = config.accentColor || lighten(primary, 0.5)
  
  const waves: string[] = []
  for (let i = 0; i < 5; i++) {
    const y = height * 0.3 + i * 25
    const amplitude = 20 + i * 5
    const frequency = 0.02 - i * 0.002
    const opacity = 0.3 - i * 0.05
    
    let path = `M 0 ${y}`
    for (let x = 0; x <= width; x += 10) {
      const offsetY = Math.sin(x * frequency + i) * amplitude
      path += ` L ${x} ${y + offsetY}`
    }
    path += ` L ${width} ${height} L 0 ${height} Z`
    
    const colors = [primary, secondary, accent]
    waves.push(`<path d="${path}" fill="${colors[i % 3]}" opacity="${opacity}" />`)
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="wave-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.6)}" />
          <stop offset="50%" style="stop-color:${darken(primary, 0.4)}" />
          <stop offset="100%" style="stop-color:${darken(secondary, 0.3)}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#wave-bg)" />
      ${waves.join('\n')}
    </svg>
  `
}

// Generate mesh gradient pattern
function generateMesh(config: CoverConfig, width: number, height: number): string {
  const random = seededRandom(config.seed || 42)
  const primary = config.primaryColor
  const secondary = config.secondaryColor || lighten(primary, 0.2)
  const accent = config.accentColor || darken(primary, 0.2)
  
  const circles: string[] = []
  const colors = [primary, secondary, accent, lighten(primary, 0.4)]
  
  for (let i = 0; i < 8; i++) {
    const cx = random() * width
    const cy = random() * height
    const r = 80 + random() * 150
    const color = colors[i % colors.length]
    
    circles.push(`
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.6">
        ${config.animated ? `<animate attributeName="cx" values="${cx};${cx + 20};${cx}" dur="${3 + i}s" repeatCount="indefinite" />` : ''}
      </circle>
    `)
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="mesh-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
        </filter>
        <linearGradient id="mesh-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.8)}" />
          <stop offset="100%" style="stop-color:${darken(secondary, 0.7)}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#mesh-bg)" />
      <g filter="url(#mesh-blur)">
        ${circles.join('\n')}
      </g>
    </svg>
  `
}

// Generate circuit board pattern
function generateCircuits(config: CoverConfig, width: number, height: number): string {
  const random = seededRandom(config.seed || 42)
  const primary = config.primaryColor
  const lines: string[] = []
  const nodes: string[] = []
  
  const gridSize = 30
  const cols = Math.ceil(width / gridSize)
  const rows = Math.ceil(height / gridSize)
  
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (random() > 0.7) {
        const px = x * gridSize + gridSize / 2
        const py = y * gridSize + gridSize / 2
        
        // Draw node
        nodes.push(`<circle cx="${px}" cy="${py}" r="3" fill="${primary}" opacity="0.8" />`)
        
        // Draw connections
        if (random() > 0.5 && x < cols - 1) {
          const nextX = (x + 1) * gridSize + gridSize / 2
          lines.push(`<line x1="${px}" y1="${py}" x2="${nextX}" y2="${py}" stroke="${primary}" stroke-width="1.5" opacity="0.4" />`)
        }
        if (random() > 0.5 && y < rows - 1) {
          const nextY = (y + 1) * gridSize + gridSize / 2
          lines.push(`<line x1="${px}" y1="${py}" x2="${px}" y2="${nextY}" stroke="${primary}" stroke-width="1.5" opacity="0.4" />`)
        }
      }
    }
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="circuit-bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.5)}" />
          <stop offset="100%" style="stop-color:${darken(primary, 0.85)}" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit-bg)" />
      <g>
        ${lines.join('\n')}
        ${nodes.join('\n')}
      </g>
    </svg>
  `
}

// Generate topography/contour lines pattern
function generateTopography(config: CoverConfig, width: number, height: number): string {
  const random = seededRandom(config.seed || 42)
  const primary = config.primaryColor
  const paths: string[] = []
  
  for (let i = 0; i < 15; i++) {
    const baseY = (height / 15) * i + 20
    let path = `M -10 ${baseY}`
    
    for (let x = 0; x <= width + 20; x += 20) {
      const noise = (random() - 0.5) * 40
      path += ` Q ${x + 10} ${baseY + noise} ${x + 20} ${baseY + (random() - 0.5) * 30}`
    }
    
    const opacity = 0.15 + (i / 15) * 0.4
    paths.push(`<path d="${path}" fill="none" stroke="${primary}" stroke-width="1.5" opacity="${opacity}" />`)
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="topo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.75)}" />
          <stop offset="100%" style="stop-color:${darken(primary, 0.6)}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#topo-bg)" />
      ${paths.join('\n')}
    </svg>
  `
}

// Generate aurora/northern lights pattern
function generateAurora(config: CoverConfig, width: number, height: number): string {
  const primary = config.primaryColor
  const secondary = config.secondaryColor || lighten(primary, 0.3)
  const accent = config.accentColor || '#22c55e' // Green tint for aurora
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="aurora-bg" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:#0f172a" />
          <stop offset="100%" style="stop-color:#1e1b4b" />
        </linearGradient>
        <linearGradient id="aurora1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:0" />
          <stop offset="30%" style="stop-color:${primary};stop-opacity:0.6" />
          <stop offset="50%" style="stop-color:${secondary};stop-opacity:0.8" />
          <stop offset="70%" style="stop-color:${accent};stop-opacity:0.6" />
          <stop offset="100%" style="stop-color:${accent};stop-opacity:0" />
        </linearGradient>
        <filter id="aurora-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#aurora-bg)" />
      <g filter="url(#aurora-blur)">
        <ellipse cx="${width * 0.5}" cy="${height * 0.3}" rx="${width * 0.8}" ry="${height * 0.4}" fill="url(#aurora1)" opacity="0.7">
          ${config.animated ? '<animate attributeName="ry" values="40%;45%;40%" dur="4s" repeatCount="indefinite" />' : ''}
        </ellipse>
        <ellipse cx="${width * 0.3}" cy="${height * 0.5}" rx="${width * 0.5}" ry="${height * 0.25}" fill="${accent}" opacity="0.3">
          ${config.animated ? '<animate attributeName="cx" values="30%;35%;30%" dur="5s" repeatCount="indefinite" />' : ''}
        </ellipse>
        <ellipse cx="${width * 0.7}" cy="${height * 0.4}" rx="${width * 0.4}" ry="${height * 0.3}" fill="${secondary}" opacity="0.4">
          ${config.animated ? '<animate attributeName="cy" values="40%;35%;40%" dur="6s" repeatCount="indefinite" />' : ''}
        </ellipse>
      </g>
      <!-- Stars -->
      ${Array.from({ length: 20 }, (_, i) => {
        const x = ((i * 37) % 100)
        const y = ((i * 23) % 100)
        const size = 1 + (i % 3)
        return `<circle cx="${x}%" cy="${y}%" r="${size}" fill="white" opacity="${0.3 + (i % 5) * 0.15}" />`
      }).join('\n')}
    </svg>
  `
}

// Generate crystalline/faceted pattern
function generateCrystalline(config: CoverConfig, width: number, height: number): string {
  const random = seededRandom(config.seed || 42)
  const primary = config.primaryColor
  const triangles: string[] = []
  
  // Create Delaunay-like triangulation effect
  const points: [number, number][] = []
  for (let i = 0; i < 30; i++) {
    points.push([random() * width, random() * height])
  }
  // Add corner points
  points.push([0, 0], [width, 0], [0, height], [width, height])
  
  // Simple triangulation by connecting nearby points
  for (let i = 0; i < points.length - 2; i += 3) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    const p3 = points[(i + 2) % points.length]
    
    const opacity = 0.3 + random() * 0.5
    const lightness = random() * 0.3
    const fill = random() > 0.5 ? lighten(primary, lightness) : darken(primary, lightness)
    
    triangles.push(`
      <polygon 
        points="${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}" 
        fill="${fill}" 
        stroke="${lighten(primary, 0.2)}"
        stroke-width="0.5"
        opacity="${opacity}"
      />
    `)
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="crystal-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.7)}" />
          <stop offset="50%" style="stop-color:${darken(primary, 0.5)}" />
          <stop offset="100%" style="stop-color:${darken(primary, 0.6)}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#crystal-bg)" />
      ${triangles.join('\n')}
    </svg>
  `
}

// Generate constellation pattern
function generateConstellation(config: CoverConfig, width: number, height: number): string {
  const random = seededRandom(config.seed || 42)
  const primary = config.primaryColor
  const stars: string[] = []
  const lines: string[] = []
  const points: [number, number][] = []
  
  // Generate star positions
  for (let i = 0; i < 25; i++) {
    const x = random() * width
    const y = random() * height
    const size = 1 + random() * 3
    const brightness = 0.4 + random() * 0.6
    points.push([x, y])
    
    stars.push(`
      <circle cx="${x}" cy="${y}" r="${size}" fill="${lighten(primary, 0.8)}" opacity="${brightness}">
        ${config.animated ? `<animate attributeName="opacity" values="${brightness};${brightness * 0.5};${brightness}" dur="${2 + random() * 3}s" repeatCount="indefinite" />` : ''}
      </circle>
    `)
  }
  
  // Connect nearby stars
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.hypot(points[j][0] - points[i][0], points[j][1] - points[i][1])
      if (dist < 100 && random() > 0.6) {
        lines.push(`
          <line 
            x1="${points[i][0]}" y1="${points[i][1]}" 
            x2="${points[j][0]}" y2="${points[j][1]}" 
            stroke="${primary}" 
            stroke-width="0.5" 
            opacity="0.3"
          />
        `)
      }
    }
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="const-bg" cx="30%" cy="30%" r="80%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.6)}" />
          <stop offset="100%" style="stop-color:#0f0f23" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#const-bg)" />
      ${lines.join('\n')}
      ${stars.join('\n')}
    </svg>
  `
}

// Generate abstract fluid shapes
function generateAbstract(config: CoverConfig, width: number, height: number): string {
  const random = seededRandom(config.seed || 42)
  const primary = config.primaryColor
  const secondary = config.secondaryColor || lighten(primary, 0.2)
  const blobs: string[] = []
  
  for (let i = 0; i < 5; i++) {
    const cx = random() * width
    const cy = random() * height
    const size = 60 + random() * 120
    
    // Generate organic blob path
    const points = 8
    let path = ''
    const angleStep = (Math.PI * 2) / points
    
    for (let j = 0; j < points; j++) {
      const angle = j * angleStep
      const r = size * (0.7 + random() * 0.6)
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      
      if (j === 0) {
        path = `M ${x} ${y}`
      } else {
        const cp1x = cx + Math.cos(angle - angleStep / 2) * r * 1.2
        const cp1y = cy + Math.sin(angle - angleStep / 2) * r * 1.2
        path += ` Q ${cp1x} ${cp1y} ${x} ${y}`
      }
    }
    path += ' Z'
    
    const color = i % 2 === 0 ? primary : secondary
    blobs.push(`<path d="${path}" fill="${color}" opacity="${0.2 + random() * 0.3}" />`)
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="abstract-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
        </filter>
        <linearGradient id="abstract-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.75)}" />
          <stop offset="100%" style="stop-color:${darken(secondary, 0.7)}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#abstract-bg)" />
      <g filter="url(#abstract-blur)">
        ${blobs.join('\n')}
      </g>
    </svg>
  `
}

// Generate hexagon grid pattern
function generateHexagons(config: CoverConfig, width: number, height: number): string {
  const random = seededRandom(config.seed || 42)
  const primary = config.primaryColor
  const hexagons: string[] = []
  
  const size = 25
  const h = size * Math.sqrt(3)
  const cols = Math.ceil(width / (size * 1.5)) + 1
  const rows = Math.ceil(height / h) + 1
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * size * 1.5
      const y = row * h + (col % 2 === 1 ? h / 2 : 0)
      
      const points = []
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 30) * Math.PI / 180
        points.push(`${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`)
      }
      
      const opacity = random() > 0.7 ? 0.3 + random() * 0.4 : 0.1
      const lightness = random() * 0.3
      const fill = random() > 0.5 ? lighten(primary, lightness) : primary
      
      hexagons.push(`
        <polygon 
          points="${points.join(' ')}" 
          fill="${fill}" 
          stroke="${lighten(primary, 0.3)}"
          stroke-width="1"
          opacity="${opacity}"
        />
      `)
    }
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="hex-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${darken(primary, 0.8)}" />
          <stop offset="100%" style="stop-color:${darken(primary, 0.6)}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-bg)" />
      ${hexagons.join('\n')}
    </svg>
  `
}

/**
 * Generate a cover SVG for a collection
 */
export function generateCollectionCover(config: CoverConfig, width: number = 400, height: number = 200): string {
  switch (config.pattern) {
    case 'geometric':
      return generateGeometric(config, width, height)
    case 'waves':
      return generateWaves(config, width, height)
    case 'mesh':
      return generateMesh(config, width, height)
    case 'circuits':
      return generateCircuits(config, width, height)
    case 'topography':
      return generateTopography(config, width, height)
    case 'aurora':
      return generateAurora(config, width, height)
    case 'crystalline':
      return generateCrystalline(config, width, height)
    case 'constellation':
      return generateConstellation(config, width, height)
    case 'abstract':
      return generateAbstract(config, width, height)
    case 'hexagons':
      return generateHexagons(config, width, height)
    default:
      return generateMesh(config, width, height)
  }
}

/**
 * Generate a data URL for a cover SVG
 */
export function generateCollectionCoverDataUrl(config: CoverConfig, width: number = 400, height: number = 200): string {
  const svg = generateCollectionCover(config, width, height)
  const encoded = encodeURIComponent(svg)
  return `data:image/svg+xml,${encoded}`
}

/**
 * Get a random pattern based on a seed
 */
export function getPatternFromSeed(seed: number): CoverPattern {
  const patterns: CoverPattern[] = [
    'geometric', 'waves', 'mesh', 'circuits', 'topography',
    'aurora', 'crystalline', 'constellation', 'abstract', 'hexagons'
  ]
  return patterns[seed % patterns.length]
}

/**
 * Generate a default cover based on collection name and color
 */
export function generateDefaultCover(name: string, color: string): string {
  // Create a seed from the name
  const seed = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const pattern = getPatternFromSeed(seed)
  
  return generateCollectionCoverDataUrl({
    pattern,
    primaryColor: color,
    seed,
  })
}

export const COVER_PATTERNS: { id: CoverPattern; name: string; description: string }[] = [
  { id: 'geometric', name: 'Geometric', description: 'Overlapping polygons and triangles' },
  { id: 'waves', name: 'Waves', description: 'Flowing wave patterns' },
  { id: 'mesh', name: 'Mesh Gradient', description: 'Soft blurred gradients' },
  { id: 'circuits', name: 'Circuits', description: 'Tech-inspired circuit board' },
  { id: 'topography', name: 'Topography', description: 'Contour map lines' },
  { id: 'aurora', name: 'Aurora', description: 'Northern lights effect' },
  { id: 'crystalline', name: 'Crystalline', description: 'Faceted crystal patterns' },
  { id: 'constellation', name: 'Constellation', description: 'Starry night connections' },
  { id: 'abstract', name: 'Abstract', description: 'Organic fluid shapes' },
  { id: 'hexagons', name: 'Hexagons', description: 'Honeycomb grid pattern' },
]

// ============================================================================
// CATEGORY TO PATTERN MAPPINGS
// ============================================================================

/**
 * Semantic category to pattern mapping for intelligent cover suggestions.
 * Used by NLP analysis to suggest appropriate cover patterns based on content.
 */
export const CATEGORY_COVER_SUGGESTIONS: Record<string, CoverPattern[]> = {
  // Technical & Development
  technology: ['circuits', 'hexagons', 'mesh'],
  programming: ['circuits', 'geometric', 'hexagons'],
  software: ['circuits', 'mesh', 'geometric'],
  engineering: ['circuits', 'topography', 'geometric'],
  
  // Science & Research
  science: ['constellation', 'crystalline', 'topography'],
  research: ['constellation', 'abstract', 'mesh'],
  physics: ['constellation', 'waves', 'crystalline'],
  chemistry: ['crystalline', 'hexagons', 'abstract'],
  biology: ['waves', 'abstract', 'topography'],
  mathematics: ['geometric', 'crystalline', 'circuits'],
  
  // Creative & Design
  creative: ['aurora', 'abstract', 'waves'],
  design: ['mesh', 'geometric', 'abstract'],
  art: ['abstract', 'aurora', 'crystalline'],
  music: ['waves', 'aurora', 'abstract'],
  writing: ['waves', 'aurora', 'topography'],
  
  // Business & Professional
  business: ['geometric', 'mesh', 'topography'],
  finance: ['geometric', 'circuits', 'mesh'],
  marketing: ['aurora', 'mesh', 'waves'],
  management: ['geometric', 'topography', 'mesh'],
  
  // Personal & Lifestyle
  personal: ['waves', 'aurora', 'abstract'],
  journal: ['aurora', 'waves', 'topography'],
  notes: ['mesh', 'abstract', 'waves'],
  ideas: ['constellation', 'aurora', 'abstract'],
  
  // Nature & Environment
  nature: ['topography', 'waves', 'aurora'],
  travel: ['topography', 'constellation', 'aurora'],
  environment: ['waves', 'topography', 'aurora'],
  
  // Education & Learning
  education: ['constellation', 'geometric', 'hexagons'],
  learning: ['constellation', 'crystalline', 'geometric'],
  tutorial: ['circuits', 'geometric', 'hexagons'],
  reference: ['hexagons', 'circuits', 'geometric'],
  
  // Projects & Planning
  projects: ['geometric', 'circuits', 'mesh'],
  planning: ['topography', 'geometric', 'mesh'],
  roadmap: ['topography', 'geometric', 'constellation'],
  
  // Default fallbacks
  default: ['mesh', 'abstract', 'waves'],
  inbox: ['mesh', 'waves', 'abstract'],
  wiki: ['hexagons', 'geometric', 'circuits'],
}

/**
 * Color suggestions for different categories
 */
export const CATEGORY_COLOR_SUGGESTIONS: Record<string, string[]> = {
  technology: ['#6366f1', '#3b82f6', '#06b6d4'],
  science: ['#8b5cf6', '#6366f1', '#14b8a6'],
  creative: ['#ec4899', '#f43f5e', '#8b5cf6'],
  business: ['#1e293b', '#64748b', '#3b82f6'],
  personal: ['#f97316', '#eab308', '#22c55e'],
  nature: ['#22c55e', '#14b8a6', '#3b82f6'],
  education: ['#6366f1', '#8b5cf6', '#06b6d4'],
  default: ['#6366f1', '#8b5cf6', '#3b82f6'],
}

/**
 * Keywords used for semantic matching to categories
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  technology: ['code', 'api', 'software', 'tech', 'developer', 'programming', 'framework', 'library', 'database', 'server', 'cloud', 'devops', 'backend', 'frontend'],
  science: ['research', 'study', 'experiment', 'theory', 'hypothesis', 'analysis', 'data', 'scientific', 'laboratory', 'discovery'],
  creative: ['design', 'art', 'creative', 'visual', 'aesthetic', 'color', 'typography', 'illustration', 'animation', 'ui', 'ux'],
  business: ['business', 'strategy', 'revenue', 'profit', 'market', 'sales', 'customer', 'product', 'startup', 'enterprise'],
  personal: ['journal', 'diary', 'reflection', 'thoughts', 'personal', 'life', 'goals', 'habits', 'wellness', 'mindfulness'],
  nature: ['nature', 'outdoor', 'travel', 'environment', 'hiking', 'wildlife', 'garden', 'forest', 'ocean', 'mountain'],
  education: ['learn', 'tutorial', 'guide', 'course', 'lesson', 'teach', 'student', 'education', 'training', 'skill'],
  projects: ['project', 'task', 'milestone', 'sprint', 'roadmap', 'planning', 'timeline', 'deadline', 'deliverable'],
}

/**
 * Suggest a cover pattern based on content text
 */
export async function suggestCoverForContent(
  name: string,
  description?: string
): Promise<CoverConfig> {
  const text = `${name} ${description || ''}`.toLowerCase()
  
  // Find best matching category
  let bestCategory = 'default'
  let bestScore = 0
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(keyword => text.includes(keyword)).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }
  
  // Get patterns for this category
  const patterns = CATEGORY_COVER_SUGGESTIONS[bestCategory] || CATEGORY_COVER_SUGGESTIONS.default
  const colors = CATEGORY_COLOR_SUGGESTIONS[bestCategory] || CATEGORY_COLOR_SUGGESTIONS.default
  
  // Generate a seed from the name for consistency
  const seed = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  return {
    pattern: patterns[seed % patterns.length],
    primaryColor: colors[seed % colors.length],
    seed,
  }
}

/**
 * Get suggested patterns for a category
 */
export function getSuggestedPatternsForCategory(category: string): CoverPattern[] {
  return CATEGORY_COVER_SUGGESTIONS[category] || CATEGORY_COVER_SUGGESTIONS.default
}

/**
 * Get suggested colors for a category
 */
export function getSuggestedColorsForCategory(category: string): string[] {
  return CATEGORY_COLOR_SUGGESTIONS[category] || CATEGORY_COLOR_SUGGESTIONS.default
}

/**
 * Detect category from text using keyword matching
 */
export function detectCategoryFromText(text: string): string {
  const lowerText = text.toLowerCase()
  
  let bestCategory = 'default'
  let bestScore = 0
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(keyword => lowerText.includes(keyword)).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }
  
  return bestCategory
}


