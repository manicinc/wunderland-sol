/**
 * GPX/KML Parser Module
 * @module lib/views/gpxParser
 *
 * Parses GPX and KML files for GPS track data, waypoints, and routes.
 * Supports:
 * - GPX 1.0 and 1.1 formats
 * - KML with LineString and Point elements
 * - Track segments with elevation and timestamps
 * - Waypoints with names and descriptions
 * - Route calculation (distance, elevation gain, duration)
 *
 * @example
 * ```typescript
 * import { parseGpx, parseKml, parseGeoFile } from '@/lib/views/gpxParser'
 *
 * // Parse GPX file
 * const gpxTrack = await parseGpx(gpxXmlString)
 *
 * // Auto-detect format
 * const track = await parseGeoFile(fileContent, 'trail.gpx')
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GpxPoint {
  lat: number
  lng: number
  ele?: number
  time?: Date
  name?: string
  desc?: string
}

export interface GpxWaypoint extends GpxPoint {
  sym?: string // Symbol name (e.g., "Flag", "Campground")
  type?: string // Waypoint type/category
}

export interface GpxTrackSegment {
  points: GpxPoint[]
}

export interface GpxTrack {
  name: string
  description?: string
  type?: 'hiking' | 'cycling' | 'running' | 'driving' | 'other'
  points: GpxPoint[]
  waypoints?: GpxWaypoint[]
  distance?: number // Total distance in meters
  elevationGain?: number // Total elevation gain in meters
  elevationLoss?: number // Total elevation loss in meters
  duration?: number // Duration in seconds (if timestamps available)
  minEle?: number
  maxEle?: number
  color?: string // Display color
  source?: string // Original filename
}

export interface GpxParseResult {
  tracks: GpxTrack[]
  waypoints: GpxWaypoint[]
  routes: GpxTrack[]
  metadata?: {
    name?: string
    description?: string
    author?: string
    time?: Date
    bounds?: {
      minLat: number
      maxLat: number
      minLng: number
      maxLng: number
    }
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EARTH_RADIUS_M = 6371000 // Earth's radius in meters

// Track type detection keywords
const TRACK_TYPE_KEYWORDS: Record<string, string[]> = {
  hiking: ['hike', 'hiking', 'walk', 'walking', 'trek', 'trekking', 'trail', 'backpack'],
  cycling: ['bike', 'biking', 'cycling', 'cycle', 'mtb', 'gravel', 'road'],
  running: ['run', 'running', 'jog', 'jogging', 'sprint'],
  driving: ['drive', 'driving', 'car', 'road trip', 'roadtrip'],
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(p1: GpxPoint, p2: GpxPoint): number {
  const dLat = toRad(p2.lat - p1.lat)
  const dLng = toRad(p2.lng - p1.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Calculate total distance for an array of points
 */
function calculateDistance(points: GpxPoint[]): number {
  let distance = 0
  for (let i = 1; i < points.length; i++) {
    distance += haversineDistance(points[i - 1], points[i])
  }
  return distance
}

/**
 * Calculate elevation statistics
 */
function calculateElevation(points: GpxPoint[]): {
  gain: number
  loss: number
  min: number
  max: number
} {
  let gain = 0
  let loss = 0
  let min = Infinity
  let max = -Infinity

  const elevations = points.filter((p) => p.ele !== undefined).map((p) => p.ele as number)

  if (elevations.length === 0) {
    return { gain: 0, loss: 0, min: 0, max: 0 }
  }

  for (const ele of elevations) {
    if (ele < min) min = ele
    if (ele > max) max = ele
  }

  // Use smoothed elevation for gain/loss to reduce GPS noise
  const smoothed = smoothElevation(elevations)
  for (let i = 1; i < smoothed.length; i++) {
    const diff = smoothed[i] - smoothed[i - 1]
    if (diff > 0) gain += diff
    else loss += Math.abs(diff)
  }

  return { gain, loss, min, max }
}

/**
 * Smooth elevation data using simple moving average
 */
function smoothElevation(elevations: number[], windowSize = 5): number[] {
  if (elevations.length <= windowSize) return elevations

  const smoothed: number[] = []
  const halfWindow = Math.floor(windowSize / 2)

  for (let i = 0; i < elevations.length; i++) {
    const start = Math.max(0, i - halfWindow)
    const end = Math.min(elevations.length, i + halfWindow + 1)
    const window = elevations.slice(start, end)
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length
    smoothed.push(avg)
  }

  return smoothed
}

/**
 * Calculate duration from timestamps
 */
function calculateDuration(points: GpxPoint[]): number | undefined {
  const pointsWithTime = points.filter((p) => p.time)
  if (pointsWithTime.length < 2) return undefined

  const first = pointsWithTime[0].time!.getTime()
  const last = pointsWithTime[pointsWithTime.length - 1].time!.getTime()
  return (last - first) / 1000 // seconds
}

/**
 * Detect track type from name/description
 */
function detectTrackType(name?: string, description?: string): GpxTrack['type'] {
  const text = `${name || ''} ${description || ''}`.toLowerCase()

  for (const [type, keywords] of Object.entries(TRACK_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return type as GpxTrack['type']
    }
  }

  return 'other'
}

/**
 * Get text content from XML element
 */
function getTextContent(element: Element | null): string | undefined {
  return element?.textContent?.trim() || undefined
}

/**
 * Parse a single point element (trkpt, wpt, rtept)
 */
function parsePointElement(element: Element): GpxPoint | null {
  const lat = parseFloat(element.getAttribute('lat') || '')
  const lng = parseFloat(element.getAttribute('lon') || '')

  if (isNaN(lat) || isNaN(lng)) return null

  const point: GpxPoint = { lat, lng }

  const eleEl = element.getElementsByTagName('ele')[0]
  if (eleEl) {
    const ele = parseFloat(getTextContent(eleEl) || '')
    if (!isNaN(ele)) point.ele = ele
  }

  const timeEl = element.getElementsByTagName('time')[0]
  if (timeEl) {
    const timeStr = getTextContent(timeEl)
    if (timeStr) {
      const time = new Date(timeStr)
      if (!isNaN(time.getTime())) point.time = time
    }
  }

  const nameEl = element.getElementsByTagName('name')[0]
  point.name = getTextContent(nameEl)

  const descEl = element.getElementsByTagName('desc')[0]
  point.desc = getTextContent(descEl)

  return point
}

// ============================================================================
// GPX PARSER
// ============================================================================

/**
 * Parse GPX XML string
 */
export function parseGpx(gpxString: string): GpxParseResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(gpxString, 'application/xml')

  // Check for parsing errors
  const parseError = doc.getElementsByTagName('parsererror')[0]
  if (parseError) {
    throw new Error(`GPX parse error: ${parseError.textContent}`)
  }

  const result: GpxParseResult = {
    tracks: [],
    waypoints: [],
    routes: [],
  }

  // Parse metadata
  const metadataEl = doc.getElementsByTagName('metadata')[0]
  if (metadataEl) {
    result.metadata = {
      name: getTextContent(metadataEl.getElementsByTagName('name')[0]),
      description: getTextContent(metadataEl.getElementsByTagName('desc')[0]),
      author: getTextContent(metadataEl.getElementsByTagName('author')[0]?.getElementsByTagName('name')[0]),
    }

    const timeEl = metadataEl.getElementsByTagName('time')[0]
    if (timeEl) {
      const timeStr = getTextContent(timeEl)
      if (timeStr) result.metadata.time = new Date(timeStr)
    }

    const boundsEl = metadataEl.getElementsByTagName('bounds')[0]
    if (boundsEl) {
      result.metadata.bounds = {
        minLat: parseFloat(boundsEl.getAttribute('minlat') || '0'),
        maxLat: parseFloat(boundsEl.getAttribute('maxlat') || '0'),
        minLng: parseFloat(boundsEl.getAttribute('minlon') || '0'),
        maxLng: parseFloat(boundsEl.getAttribute('maxlon') || '0'),
      }
    }
  }

  // Parse waypoints
  const wptElements = doc.getElementsByTagName('wpt')
  for (let i = 0; i < wptElements.length; i++) {
    const point = parsePointElement(wptElements[i]) as GpxWaypoint | null
    if (point) {
      const symEl = wptElements[i].getElementsByTagName('sym')[0]
      point.sym = getTextContent(symEl)

      const typeEl = wptElements[i].getElementsByTagName('type')[0]
      point.type = getTextContent(typeEl)

      result.waypoints.push(point)
    }
  }

  // Parse tracks
  const trkElements = doc.getElementsByTagName('trk')
  for (let i = 0; i < trkElements.length; i++) {
    const trkEl = trkElements[i]
    const name = getTextContent(trkEl.getElementsByTagName('name')[0]) || `Track ${i + 1}`
    const description = getTextContent(trkEl.getElementsByTagName('desc')[0])

    const allPoints: GpxPoint[] = []

    // Parse track segments
    const trksegElements = trkEl.getElementsByTagName('trkseg')
    for (let j = 0; j < trksegElements.length; j++) {
      const trkptElements = trksegElements[j].getElementsByTagName('trkpt')
      for (let k = 0; k < trkptElements.length; k++) {
        const point = parsePointElement(trkptElements[k])
        if (point) allPoints.push(point)
      }
    }

    if (allPoints.length > 0) {
      const elevation = calculateElevation(allPoints)

      const track: GpxTrack = {
        name,
        description,
        type: detectTrackType(name, description),
        points: allPoints,
        distance: calculateDistance(allPoints),
        elevationGain: elevation.gain,
        elevationLoss: elevation.loss,
        minEle: elevation.min !== Infinity ? elevation.min : undefined,
        maxEle: elevation.max !== -Infinity ? elevation.max : undefined,
        duration: calculateDuration(allPoints),
      }

      result.tracks.push(track)
    }
  }

  // Parse routes
  const rteElements = doc.getElementsByTagName('rte')
  for (let i = 0; i < rteElements.length; i++) {
    const rteEl = rteElements[i]
    const name = getTextContent(rteEl.getElementsByTagName('name')[0]) || `Route ${i + 1}`
    const description = getTextContent(rteEl.getElementsByTagName('desc')[0])

    const points: GpxPoint[] = []
    const rteptElements = rteEl.getElementsByTagName('rtept')
    for (let j = 0; j < rteptElements.length; j++) {
      const point = parsePointElement(rteptElements[j])
      if (point) points.push(point)
    }

    if (points.length > 0) {
      const elevation = calculateElevation(points)

      const route: GpxTrack = {
        name,
        description,
        type: detectTrackType(name, description),
        points,
        distance: calculateDistance(points),
        elevationGain: elevation.gain,
        elevationLoss: elevation.loss,
        minEle: elevation.min !== Infinity ? elevation.min : undefined,
        maxEle: elevation.max !== -Infinity ? elevation.max : undefined,
      }

      result.routes.push(route)
    }
  }

  return result
}

// ============================================================================
// KML PARSER
// ============================================================================

/**
 * Parse KML XML string
 */
export function parseKml(kmlString: string): GpxParseResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(kmlString, 'application/xml')

  const parseError = doc.getElementsByTagName('parsererror')[0]
  if (parseError) {
    throw new Error(`KML parse error: ${parseError.textContent}`)
  }

  const result: GpxParseResult = {
    tracks: [],
    waypoints: [],
    routes: [],
  }

  // Parse Document metadata
  const docEl = doc.getElementsByTagName('Document')[0]
  if (docEl) {
    result.metadata = {
      name: getTextContent(docEl.getElementsByTagName('name')[0]),
      description: getTextContent(docEl.getElementsByTagName('description')[0]),
    }
  }

  // Parse Placemarks
  const placemarkElements = doc.getElementsByTagName('Placemark')
  for (let i = 0; i < placemarkElements.length; i++) {
    const placemark = placemarkElements[i]
    const name = getTextContent(placemark.getElementsByTagName('name')[0]) || `Feature ${i + 1}`
    const description = getTextContent(placemark.getElementsByTagName('description')[0])

    // Check for LineString (track)
    const lineStringEl = placemark.getElementsByTagName('LineString')[0]
    if (lineStringEl) {
      const coordinatesEl = lineStringEl.getElementsByTagName('coordinates')[0]
      const coordsText = getTextContent(coordinatesEl)

      if (coordsText) {
        const points = parseKmlCoordinates(coordsText)
        if (points.length > 0) {
          const elevation = calculateElevation(points)

          const track: GpxTrack = {
            name,
            description,
            type: detectTrackType(name, description),
            points,
            distance: calculateDistance(points),
            elevationGain: elevation.gain,
            elevationLoss: elevation.loss,
            minEle: elevation.min !== Infinity ? elevation.min : undefined,
            maxEle: elevation.max !== -Infinity ? elevation.max : undefined,
          }

          result.tracks.push(track)
        }
      }
      continue
    }

    // Check for Point (waypoint)
    const pointEl = placemark.getElementsByTagName('Point')[0]
    if (pointEl) {
      const coordinatesEl = pointEl.getElementsByTagName('coordinates')[0]
      const coordsText = getTextContent(coordinatesEl)

      if (coordsText) {
        const points = parseKmlCoordinates(coordsText)
        if (points.length > 0) {
          const waypoint: GpxWaypoint = {
            ...points[0],
            name,
            desc: description,
          }
          result.waypoints.push(waypoint)
        }
      }
    }

    // Check for gx:Track (extended track format)
    const gxTrackEl = placemark.getElementsByTagName('gx:Track')[0]
    if (gxTrackEl) {
      const whenElements = gxTrackEl.getElementsByTagName('when')
      const coordElements = gxTrackEl.getElementsByTagName('gx:coord')

      const points: GpxPoint[] = []
      const count = Math.min(whenElements.length, coordElements.length)

      for (let j = 0; j < count; j++) {
        const coordStr = getTextContent(coordElements[j])
        if (coordStr) {
          const [lngStr, latStr, eleStr] = coordStr.split(' ')
          const lng = parseFloat(lngStr)
          const lat = parseFloat(latStr)
          const ele = eleStr ? parseFloat(eleStr) : undefined

          if (!isNaN(lng) && !isNaN(lat)) {
            const point: GpxPoint = { lat, lng, ele: isNaN(ele!) ? undefined : ele }
            const timeStr = getTextContent(whenElements[j])
            if (timeStr) {
              const time = new Date(timeStr)
              if (!isNaN(time.getTime())) point.time = time
            }
            points.push(point)
          }
        }
      }

      if (points.length > 0) {
        const elevation = calculateElevation(points)

        const track: GpxTrack = {
          name,
          description,
          type: detectTrackType(name, description),
          points,
          distance: calculateDistance(points),
          elevationGain: elevation.gain,
          elevationLoss: elevation.loss,
          minEle: elevation.min !== Infinity ? elevation.min : undefined,
          maxEle: elevation.max !== -Infinity ? elevation.max : undefined,
          duration: calculateDuration(points),
        }

        result.tracks.push(track)
      }
    }
  }

  return result
}

/**
 * Parse KML coordinates string (lng,lat,ele format)
 */
function parseKmlCoordinates(coordsText: string): GpxPoint[] {
  const points: GpxPoint[] = []
  const coordPairs = coordsText.trim().split(/\s+/)

  for (const pair of coordPairs) {
    const parts = pair.split(',')
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0])
      const lat = parseFloat(parts[1])
      const ele = parts.length >= 3 ? parseFloat(parts[2]) : undefined

      if (!isNaN(lng) && !isNaN(lat)) {
        points.push({
          lat,
          lng,
          ele: ele !== undefined && !isNaN(ele) ? ele : undefined,
        })
      }
    }
  }

  return points
}

// ============================================================================
// UNIFIED PARSER
// ============================================================================

/**
 * Parse geo file (auto-detect GPX or KML)
 */
export function parseGeoFile(content: string, filename?: string): GpxParseResult {
  const ext = filename?.split('.').pop()?.toLowerCase()

  // Try to detect format from extension or content
  if (ext === 'gpx' || content.includes('<gpx')) {
    return parseGpx(content)
  }

  if (ext === 'kml' || content.includes('<kml') || content.includes('<Document')) {
    return parseKml(content)
  }

  // Default to GPX
  return parseGpx(content)
}

/**
 * Load and parse geo file from URL
 */
export async function loadGeoFile(url: string): Promise<GpxParseResult> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load geo file: ${response.statusText}`)
  }

  const content = await response.text()
  const filename = url.split('/').pop()
  return parseGeoFile(content, filename)
}

/**
 * Convert GpxParseResult to array of GpxTrack for map display
 */
export function getAllTracks(result: GpxParseResult): GpxTrack[] {
  return [...result.tracks, ...result.routes]
}

/**
 * Get all waypoints including track waypoints
 */
export function getAllWaypoints(result: GpxParseResult): GpxWaypoint[] {
  const waypoints: GpxWaypoint[] = [...result.waypoints]

  for (const track of result.tracks) {
    if (track.waypoints) {
      waypoints.push(...track.waypoints)
    }
  }

  return waypoints
}

/**
 * Format track stats for display
 */
export function formatTrackStats(track: GpxTrack): string {
  const parts: string[] = []

  if (track.distance) {
    const km = track.distance / 1000
    parts.push(km < 1 ? `${Math.round(track.distance)}m` : `${km.toFixed(1)}km`)
  }

  if (track.elevationGain) {
    parts.push(`↑${Math.round(track.elevationGain)}m`)
  }

  if (track.duration) {
    const hours = Math.floor(track.duration / 3600)
    const mins = Math.floor((track.duration % 3600) / 60)
    parts.push(hours > 0 ? `${hours}h${mins}m` : `${mins}min`)
  }

  return parts.join(' • ')
}





