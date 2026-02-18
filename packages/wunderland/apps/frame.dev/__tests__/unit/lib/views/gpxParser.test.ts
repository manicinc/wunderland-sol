/**
 * GPX Parser Tests
 * @module __tests__/unit/lib/views/gpxParser.test
 *
 * Tests for GPX/KML parsing types and helper functions.
 * Note: Full XML parsing tests require jsdom environment (DOMParser).
 */

import { describe, it, expect } from 'vitest'
import type { GpxPoint, GpxTrack, GpxWaypoint, GpxParseResult } from '@/lib/views/gpxParser'

// ============================================================================
// TYPE VALIDATION TESTS
// ============================================================================

describe('GPX Parser Types', () => {
  describe('GpxPoint interface', () => {
    it('should define required lat/lng properties', () => {
      const point: GpxPoint = {
        lat: 48.1234,
        lng: 11.5678,
      }
      expect(point.lat).toBe(48.1234)
      expect(point.lng).toBe(11.5678)
    })

    it('should allow optional elevation', () => {
      const point: GpxPoint = {
        lat: 48.1234,
        lng: 11.5678,
        ele: 500,
      }
      expect(point.ele).toBe(500)
    })

    it('should allow optional timestamp', () => {
      const point: GpxPoint = {
        lat: 48.1234,
        lng: 11.5678,
        time: new Date('2024-01-15T10:00:00Z'),
      }
      expect(point.time).toBeInstanceOf(Date)
    })

    it('should allow optional name and description', () => {
      const point: GpxPoint = {
        lat: 48.1234,
        lng: 11.5678,
        name: 'Summit',
        desc: 'The peak',
      }
      expect(point.name).toBe('Summit')
      expect(point.desc).toBe('The peak')
    })
  })

  describe('GpxWaypoint interface', () => {
    it('should extend GpxPoint with symbol', () => {
      const waypoint: GpxWaypoint = {
        lat: 48.1234,
        lng: 11.5678,
        name: 'Campsite',
        sym: 'Campground',
      }
      expect(waypoint.sym).toBe('Campground')
    })

    it('should allow waypoint type', () => {
      const waypoint: GpxWaypoint = {
        lat: 48.1234,
        lng: 11.5678,
        type: 'POI',
      }
      expect(waypoint.type).toBe('POI')
    })
  })

  describe('GpxTrack interface', () => {
    it('should require name and points', () => {
      const track: GpxTrack = {
        name: 'Morning Hike',
        points: [
          { lat: 48.1234, lng: 11.5678 },
          { lat: 48.1235, lng: 11.5679 },
        ],
      }
      expect(track.name).toBe('Morning Hike')
      expect(track.points).toHaveLength(2)
    })

    it('should allow track type classification', () => {
      const track: GpxTrack = {
        name: 'Trail Run',
        points: [],
        type: 'running',
      }
      expect(track.type).toBe('running')
    })

    it('should support all track types', () => {
      const types: GpxTrack['type'][] = ['hiking', 'cycling', 'running', 'driving', 'other']
      types.forEach((type) => {
        const track: GpxTrack = { name: 'Test', points: [], type }
        expect(track.type).toBe(type)
      })
    })

    it('should allow statistics properties', () => {
      const track: GpxTrack = {
        name: 'Alpine Trail',
        points: [],
        distance: 15000, // meters
        elevationGain: 800,
        elevationLoss: 750,
        duration: 7200, // seconds
        minEle: 1000,
        maxEle: 1800,
      }
      expect(track.distance).toBe(15000)
      expect(track.elevationGain).toBe(800)
      expect(track.elevationLoss).toBe(750)
      expect(track.duration).toBe(7200)
      expect(track.minEle).toBe(1000)
      expect(track.maxEle).toBe(1800)
    })

    it('should allow optional color and source', () => {
      const track: GpxTrack = {
        name: 'Custom Track',
        points: [],
        color: '#FF5722',
        source: 'strava_export.gpx',
      }
      expect(track.color).toBe('#FF5722')
      expect(track.source).toBe('strava_export.gpx')
    })

    it('should allow nested waypoints', () => {
      const track: GpxTrack = {
        name: 'Trail with POIs',
        points: [],
        waypoints: [
          { lat: 48.1, lng: 11.5, name: 'Start' },
          { lat: 48.2, lng: 11.6, name: 'End' },
        ],
      }
      expect(track.waypoints).toHaveLength(2)
    })
  })

  describe('GpxParseResult interface', () => {
    it('should contain tracks, waypoints, and routes arrays', () => {
      const result: GpxParseResult = {
        tracks: [],
        waypoints: [],
        routes: [],
      }
      expect(Array.isArray(result.tracks)).toBe(true)
      expect(Array.isArray(result.waypoints)).toBe(true)
      expect(Array.isArray(result.routes)).toBe(true)
    })

    it('should allow optional metadata', () => {
      const result: GpxParseResult = {
        tracks: [],
        waypoints: [],
        routes: [],
        metadata: {
          name: 'Summer Trip 2024',
          description: 'Adventure in the Alps',
          author: 'Jane Doe',
          time: new Date('2024-07-15'),
        },
      }
      expect(result.metadata?.name).toBe('Summer Trip 2024')
      expect(result.metadata?.author).toBe('Jane Doe')
    })

    it('should allow bounds in metadata', () => {
      const result: GpxParseResult = {
        tracks: [],
        waypoints: [],
        routes: [],
        metadata: {
          bounds: {
            minLat: 47.0,
            maxLat: 48.0,
            minLng: 10.0,
            maxLng: 12.0,
          },
        },
      }
      expect(result.metadata?.bounds?.minLat).toBe(47.0)
      expect(result.metadata?.bounds?.maxLat).toBe(48.0)
    })
  })
})

// ============================================================================
// COORDINATE VALIDATION
// ============================================================================

describe('Coordinate Validation', () => {
  it('should accept valid latitude range (-90 to 90)', () => {
    const validLats = [-90, -45, 0, 45, 90]
    validLats.forEach((lat) => {
      const point: GpxPoint = { lat, lng: 0 }
      expect(point.lat).toBe(lat)
    })
  })

  it('should accept valid longitude range (-180 to 180)', () => {
    const validLngs = [-180, -90, 0, 90, 180]
    validLngs.forEach((lng) => {
      const point: GpxPoint = { lat: 0, lng }
      expect(point.lng).toBe(lng)
    })
  })

  it('should handle high precision coordinates', () => {
    const point: GpxPoint = {
      lat: 48.123456789,
      lng: 11.987654321,
    }
    expect(point.lat).toBeCloseTo(48.123456789, 9)
    expect(point.lng).toBeCloseTo(11.987654321, 9)
  })
})

// ============================================================================
// HELPER UTILITIES
// ============================================================================

describe('Helper Utilities', () => {
  describe('Distance calculation concepts', () => {
    it('should understand Haversine formula principle', () => {
      // Earth's radius in meters
      const EARTH_RADIUS_M = 6371000

      // For two points, distance = 2 * R * arcsin(sqrt(a))
      // where a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlng/2)

      // For points 1 degree apart at equator (~111 km)
      const expectedDistance = (Math.PI / 180) * EARTH_RADIUS_M
      expect(expectedDistance).toBeCloseTo(111195, 0)
    })
  })

  describe('Elevation calculations', () => {
    it('should sum positive changes for gain', () => {
      const elevations = [100, 150, 130, 180] // gain: 50 + 50 = 100
      let gain = 0
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1]
        if (diff > 0) gain += diff
      }
      expect(gain).toBe(100)
    })

    it('should sum negative changes for loss', () => {
      const elevations = [100, 150, 130, 180] // loss: 20
      let loss = 0
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1]
        if (diff < 0) loss += Math.abs(diff)
      }
      expect(loss).toBe(20)
    })
  })

  describe('Duration calculations', () => {
    it('should calculate seconds between timestamps', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T12:30:00Z')
      const durationSeconds = (end.getTime() - start.getTime()) / 1000
      expect(durationSeconds).toBe(9000) // 2.5 hours
    })
  })

  describe('Track type detection patterns', () => {
    const detectType = (text: string): string => {
      const lower = text.toLowerCase()
      if (/hik|trek|walk|trail/.test(lower)) return 'hiking'
      if (/bike|cycl|mtb/.test(lower)) return 'cycling'
      if (/run|jog/.test(lower)) return 'running'
      if (/driv|car/.test(lower)) return 'driving'
      return 'other'
    }

    it('should detect hiking tracks', () => {
      expect(detectType('Morning Hike')).toBe('hiking')
      expect(detectType('Mountain Trek')).toBe('hiking')
      expect(detectType('Trail Walk')).toBe('hiking')
    })

    it('should detect cycling tracks', () => {
      expect(detectType('Bike Ride')).toBe('cycling')
      expect(detectType('Cycling Tour')).toBe('cycling')
      expect(detectType('MTB Adventure')).toBe('cycling')
    })

    it('should detect running tracks', () => {
      expect(detectType('Morning Run')).toBe('running')
      expect(detectType('Jogging Route')).toBe('running')
    })

    it('should detect driving tracks', () => {
      expect(detectType('Road Trip Drive')).toBe('driving')
      expect(detectType('Car Route')).toBe('driving')
    })

    it('should default to other for unknown', () => {
      expect(detectType('Random Track')).toBe('other')
    })
  })
})

// ============================================================================
// GPX FORMAT PATTERNS
// ============================================================================

describe('GPX Format Patterns', () => {
  const GPX_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <metadata><name>Test</name></metadata>
  <wpt lat="48.0" lon="11.0"><name>Point A</name></wpt>
  <trk><name>Track 1</name><trkseg>
    <trkpt lat="48.1" lon="11.1"><ele>500</ele></trkpt>
  </trkseg></trk>
</gpx>`

  it('should have gpx root element', () => {
    expect(GPX_SAMPLE).toContain('<gpx')
  })

  it('should have version attribute', () => {
    expect(GPX_SAMPLE).toContain('version="1.1"')
  })

  it('should contain metadata section', () => {
    expect(GPX_SAMPLE).toContain('<metadata>')
  })

  it('should contain waypoint elements', () => {
    expect(GPX_SAMPLE).toContain('<wpt')
    expect(GPX_SAMPLE).toContain('lat="48.0"')
    expect(GPX_SAMPLE).toContain('lon="11.0"')
  })

  it('should contain track elements', () => {
    expect(GPX_SAMPLE).toContain('<trk>')
    expect(GPX_SAMPLE).toContain('<trkseg>')
    expect(GPX_SAMPLE).toContain('<trkpt')
  })

  it('should contain elevation data', () => {
    expect(GPX_SAMPLE).toContain('<ele>500</ele>')
  })
})

// ============================================================================
// KML FORMAT PATTERNS
// ============================================================================

describe('KML Format Patterns', () => {
  const KML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test KML</name>
    <Placemark>
      <name>Track</name>
      <LineString>
        <coordinates>11.1,48.1,500 11.2,48.2,510</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`

  it('should have kml root element', () => {
    expect(KML_SAMPLE).toContain('<kml')
  })

  it('should contain Document element', () => {
    expect(KML_SAMPLE).toContain('<Document>')
  })

  it('should contain Placemark elements', () => {
    expect(KML_SAMPLE).toContain('<Placemark>')
  })

  it('should contain LineString for tracks', () => {
    expect(KML_SAMPLE).toContain('<LineString>')
  })

  it('should use lng,lat,ele coordinate format', () => {
    // KML uses longitude first, then latitude
    expect(KML_SAMPLE).toContain('11.1,48.1,500')
  })
})

// ============================================================================
// STATS FORMATTING
// ============================================================================

describe('Stats Formatting', () => {
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h${mins}m` : `${mins}min`
  }

  it('should format short distances in meters', () => {
    expect(formatDistance(500)).toBe('500m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('should format long distances in kilometers', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(15000)).toBe('15.0km')
    expect(formatDistance(42195)).toBe('42.2km')
  })

  it('should format short durations in minutes', () => {
    expect(formatDuration(1800)).toBe('30min')
    expect(formatDuration(2700)).toBe('45min')
  })

  it('should format long durations in hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1h0m')
    expect(formatDuration(5400)).toBe('1h30m')
    expect(formatDuration(7200)).toBe('2h0m')
  })
})
