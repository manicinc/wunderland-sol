/**
 * Embeddable Map View (Static Build Compatible)
 * @module components/quarry/views/embeddable/MapView
 *
 * @description
 * Map view for visualizing places, routes, and GPX tracks.
 * Uses static map tiles with coordinate display for static exports.
 * Falls back to external map links (OpenStreetMap/Google Maps).
 *
 * Features:
 * - Location markers with custom styling
 * - GPX track visualization (as a list with stats)
 * - Multiple tile layer preview styles
 * - Link to open in external maps
 * - Static build compatible (no react-leaflet dependency)
 */

'use client'

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { EmbeddableViewConfig, ViewData, MapViewSettings, GpxTrack } from '@/lib/views'
import type { MentionableEntity } from '@/lib/mentions/types'
import {
  MapPin,
  Navigation,
  Route,
  Layers,
  Mountain,
  Play,
  ExternalLink,
  Map,
  Compass,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface MapViewProps {
  config: EmbeddableViewConfig
  data: ViewData
  onItemClick?: (item: ViewData['items'][0]) => void
  className?: string
}

interface MapMarker {
  id: string
  label: string
  lat: number
  lng: number
  color?: string
  icon?: string
  entity: MentionableEntity
}

// ============================================================================
// TILE LAYER PREVIEW STYLES
// ============================================================================

const TILE_STYLES = {
  street: {
    bg: 'bg-gradient-to-br from-green-100 via-blue-50 to-yellow-50 dark:from-green-900/30 dark:via-blue-900/20 dark:to-yellow-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  satellite: {
    bg: 'bg-gradient-to-br from-green-900 via-brown-800 to-blue-900 dark:from-green-950 dark:via-gray-900 dark:to-blue-950',
    border: 'border-green-700 dark:border-green-900',
  },
  terrain: {
    bg: 'bg-gradient-to-br from-amber-100 via-green-100 to-emerald-100 dark:from-amber-900/30 dark:via-green-900/30 dark:to-emerald-900/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  dark: {
    bg: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
    border: 'border-gray-700',
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract map markers from view data
 */
function extractMarkers(data: ViewData): MapMarker[] {
  const markers: MapMarker[] = []

  for (const item of data.items) {
    const entity = item.entity as MentionableEntity
    const props = entity.properties as Record<string, unknown>

    // Check for coordinates
    const lat = props.latitude ?? props.lat
    const lng = props.longitude ?? props.lng ?? props.lon

    if (typeof lat === 'number' && typeof lng === 'number') {
      markers.push({
        id: item.id,
        label: entity.label,
        lat,
        lng,
        color: (props.color as string) || entity.color,
        icon: (props.icon as string) || entity.icon,
        entity,
      })
    }
  }

  return markers
}

/**
 * Calculate bounds from markers and tracks
 */
function calculateBounds(
  markers: MapMarker[],
  tracks?: GpxTrack[]
): { center: [number, number]; bounds: [[number, number], [number, number]] } | null {
  const allPoints: [number, number][] = []

  // Add marker positions
  for (const marker of markers) {
    allPoints.push([marker.lat, marker.lng])
  }

  // Add track points
  if (tracks) {
    for (const track of tracks) {
      for (const point of track.points) {
        allPoints.push([point.lat, point.lng])
      }
      if (track.waypoints) {
        for (const wp of track.waypoints) {
          allPoints.push([wp.lat, wp.lng])
        }
      }
    }
  }

  if (allPoints.length === 0) return null

  // Calculate bounds
  const lats = allPoints.map((p) => p[0])
  const lngs = allPoints.map((p) => p[1])

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2

  return {
    center: [centerLat, centerLng],
    bounds: [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
  }
}

/**
 * Format distance for display
 */
function formatDistance(meters?: number): string {
  if (!meters) return ''
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * Format duration for display
 */
function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

/**
 * Get OpenStreetMap URL for coordinates
 */
function getOsmUrl(lat: number, lng: number, zoom: number = 14): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`
}

/**
 * Get Google Maps URL for coordinates
 */
function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/**
 * Get track type color
 */
function getTrackTypeColor(type?: string): string {
  switch (type) {
    case 'hiking':
      return 'text-green-500'
    case 'cycling':
      return 'text-orange-500'
    case 'running':
      return 'text-red-500'
    case 'driving':
      return 'text-indigo-500'
    default:
      return 'text-blue-500'
  }
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function MapEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full min-h-[200px] p-6',
        'bg-gradient-to-br from-blue-50 to-green-50',
        'dark:from-blue-950/30 dark:to-green-950/30',
        'border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl',
        className
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
        <MapPin className="relative h-14 w-14 text-blue-400 dark:text-blue-500" />
      </div>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        No locations to display
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
        This map will show places mentioned in your document
      </p>
      <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
        <p className="font-medium text-gray-600 dark:text-gray-300">💡 How to add content:</p>
        <ul className="space-y-1.5 list-none">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">@</span>
            <span>
              Type{' '}
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
                @Paris
              </code>{' '}
              to mention a place
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">📍</span>
            <span>
              Include{' '}
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
                latitude
              </code>{' '}
              and{' '}
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
                longitude
              </code>{' '}
              properties
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">🥾</span>
            <span>
              Attach{' '}
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
                .gpx
              </code>{' '}
              files for hiking/cycling tracks
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// LOCATION CARD COMPONENT
// ============================================================================

interface LocationCardProps {
  marker: MapMarker
  onItemClick?: (item: ViewData['items'][0]) => void
}

function LocationCard({ marker, onItemClick }: LocationCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-pointer',
        'bg-white dark:bg-gray-800/50',
        'border border-gray-200 dark:border-gray-700',
        'hover:border-blue-300 dark:hover:border-blue-700',
        'hover:shadow-md transition-all duration-200'
      )}
      onClick={() =>
        onItemClick?.({
          id: marker.id,
          source: { type: 'mention', id: marker.id },
          entity: marker.entity,
        })
      }
    >
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          'bg-blue-100 dark:bg-blue-900/50'
        )}
        style={{ backgroundColor: marker.color ? `${marker.color}20` : undefined }}
      >
        <MapPin
          className="w-5 h-5"
          style={{ color: marker.color || '#3b82f6' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {marker.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
        </p>
      </div>
      <a
        href={getGoogleMapsUrl(marker.lat, marker.lng)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
        title="Open in Google Maps"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  )
}

// ============================================================================
// TRACK CARD COMPONENT
// ============================================================================

interface TrackCardProps {
  track: GpxTrack
  index: number
}

function TrackCard({ track, index }: TrackCardProps) {
  const colorClass = getTrackTypeColor(track.type)

  return (
    <div
      className={cn(
        'p-3 rounded-lg',
        'bg-white dark:bg-gray-800/50',
        'border border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Route className={cn('w-4 h-4', colorClass)} />
        <span className="font-medium text-sm text-gray-900 dark:text-white">
          {track.name || `Track ${index + 1}`}
        </span>
        {track.type && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {track.type}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {track.distance && (
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {formatDistance(track.distance)}
          </span>
        )}
        {track.elevationGain && (
          <span className="flex items-center gap-1">
            <Mountain className="w-3 h-3" />
            +{Math.round(track.elevationGain)}m
          </span>
        )}
        {track.duration && (
          <span className="flex items-center gap-1">
            <Play className="w-3 h-3" />
            {formatDuration(track.duration)}
          </span>
        )}
        {track.points.length > 0 && (
          <span className="text-gray-400">
            {track.points.length} points
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN MAP VIEW COMPONENT
// ============================================================================

/**
 * Map View Component (Static Build Compatible)
 *
 * Displays locations and tracks as cards with links to external maps.
 * Works with static builds without react-leaflet dependency.
 */
const MapView: React.FC<MapViewProps> = ({ config, data, onItemClick, className }) => {
  const settings = config.settings as MapViewSettings
  const markers = useMemo(() => extractMarkers(data), [data])
  const tracks = settings.gpxTracks || []

  // State for style selection
  const [tileStyle, setTileStyle] = useState<'street' | 'satellite' | 'terrain' | 'dark'>(
    settings.style || 'street'
  )

  // Calculate center
  const mapData = useMemo(() => {
    if (settings.center) {
      return {
        center: [settings.center.lat, settings.center.lng] as [number, number],
      }
    }
    return calculateBounds(markers, tracks)
  }, [markers, tracks, settings.center])

  // No content placeholder
  if (markers.length === 0 && tracks.length === 0) {
    return <MapEmptyState className={className} />
  }

  const center = mapData?.center || [0, 0]
  const style = TILE_STYLES[tileStyle]
  const zoom = settings.zoom || 12

  return (
    <div className={cn('w-full h-full min-h-[300px] flex flex-col', className)}>
      {/* Map Preview Header */}
      <div
        className={cn(
          'relative rounded-t-xl overflow-hidden',
          style.bg,
          'border-x border-t',
          style.border
        )}
      >
        {/* Decorative Map Grid */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Center indicator with coordinates */}
        <div className="relative p-6 flex flex-col items-center justify-center min-h-[140px]">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
            <div className="relative p-4 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-lg backdrop-blur-sm">
              <Compass className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {center[0].toFixed(4)}°, {center[1].toFixed(4)}°
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {markers.length} location{markers.length !== 1 ? 's' : ''}
              {tracks.length > 0 && ` • ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Style Selector */}
        <div className="absolute top-3 right-3 flex gap-1">
          {(Object.keys(TILE_STYLES) as (keyof typeof TILE_STYLES)[]).map((styleKey) => (
            <button
              key={styleKey}
              onClick={() => setTileStyle(styleKey)}
              className={cn(
                'w-8 h-8 rounded-md border flex items-center justify-center',
                'transition-all duration-200',
                tileStyle === styleKey
                  ? 'border-blue-500 ring-2 ring-blue-500/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400',
                TILE_STYLES[styleKey].bg
              )}
              title={styleKey.charAt(0).toUpperCase() + styleKey.slice(1)}
            >
              {styleKey === 'dark' && (
                <Map className="w-4 h-4 text-gray-100" />
              )}
            </button>
          ))}
        </div>

        {/* Open in External Maps */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <a
            href={getOsmUrl(center[0], center[1], zoom)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md',
              'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400',
              'transition-colors flex items-center gap-1.5'
            )}
          >
            <ExternalLink className="w-3 h-3" />
            OpenStreetMap
          </a>
          <a
            href={getGoogleMapsUrl(center[0], center[1])}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md',
              'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400',
              'transition-colors flex items-center gap-1.5'
            )}
          >
            <ExternalLink className="w-3 h-3" />
            Google Maps
          </a>
        </div>
      </div>

      {/* Locations and Tracks List */}
      <div
        className={cn(
          'flex-1 overflow-y-auto p-4 space-y-3',
          'bg-gray-50 dark:bg-gray-900/50',
          'border-x border-b rounded-b-xl',
          'border-gray-200 dark:border-gray-700'
        )}
      >
        {/* Locations */}
        {markers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              Locations
            </h4>
            {markers.map((marker) => (
              <LocationCard
                key={marker.id}
                marker={marker}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        )}

        {/* Tracks */}
        {tracks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Route className="w-3 h-3" />
              Tracks
            </h4>
            {tracks.map((track, index) => (
              <TrackCard key={index} track={track} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { MapView }
export type { MapViewProps, MapMarker }
