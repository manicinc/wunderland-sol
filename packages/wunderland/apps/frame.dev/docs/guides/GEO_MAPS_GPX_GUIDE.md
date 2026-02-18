# Geo Maps & GPX Tracks Guide

Display interactive maps with location pins, GPX/KML tracks, and route visualization in your Quarry documents.

## Overview

The Geo Maps feature provides:

- **Interactive Leaflet maps** embedded in documents
- **Location markers** from strand metadata
- **GPX/KML track visualization** with elevation and statistics
- **Multiple map styles** (street, satellite, terrain, dark)
- **Responsive design** with mobile touch support

## Quick Start

### Embedding a Map

Add a map view to any document using the embeddable view syntax:

```markdown
::view-map
settings:
  center:
    lat: 48.8566
    lng: 2.3522
  zoom: 12
  style: street
::
```

### With GPX Track

```markdown
::view-map
settings:
  gpxTracks:
    - name: "Alpine Trail"
      file: "./tracks/alpine-trail.gpx"
  showElevation: true
  trackStyle: solid
  trackWidth: 4
::
```

## Map Configuration

### Basic Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `center` | `{lat, lng}` | Auto | Initial map center |
| `zoom` | `number` | 10 | Initial zoom level (1-18) |
| `style` | `string` | `street` | Map tile style |
| `showLabels` | `boolean` | `true` | Show marker labels |
| `clusterMarkers` | `boolean` | `false` | Cluster nearby markers |

### Map Styles

- **`street`**: OpenStreetMap standard tiles
- **`satellite`**: Esri World Imagery
- **`terrain`**: OpenTopoMap with elevation contours
- **`dark`**: CartoDB DarkMatter (auto-switches in dark mode)

### Example Configuration

```markdown
::view-map
settings:
  center:
    lat: 37.7749
    lng: -122.4194
  zoom: 13
  style: terrain
  showRoutes: true
  routeMode: walk
::
```

## GPX/KML Track Support

### Supported Formats

- **GPX 1.0/1.1**: Standard GPS exchange format
- **KML**: Keyhole Markup Language (Google Earth)

### Track Properties

```yaml
gpxTracks:
  - name: "Morning Run"
    file: "./tracks/run.gpx"  # Relative path
    color: "#FF5722"          # Custom track color
```

### Track Statistics

The map automatically calculates and displays:

- **Distance**: Total track length in km/mi
- **Elevation Gain**: Cumulative ascent in meters
- **Elevation Loss**: Cumulative descent in meters
- **Duration**: Total time (if timestamps available)

### Waypoints

GPX waypoints are displayed as markers with:
- Name and description popups
- Elevation information
- Custom symbols (when specified in GPX)

## Location Markers

### From Document Metadata

Add locations in your frontmatter:

```yaml
---
title: Paris Trip
latitude: 48.8566
longitude: 2.3522
---
```

These automatically appear as pins on the map.

### Multiple Locations

Reference multiple strands with location data:

```markdown
::view-map
data:
  source: collection
  filter:
    tag: "travel-2024"
settings:
  style: satellite
  clusterMarkers: true
::
```

## Advanced Features

### Showing Routes

Display driving/walking/transit routes between locations:

```yaml
settings:
  showRoutes: true
  routeMode: drive  # drive | walk | transit
```

### Custom Marker Colors

Color markers by category:

```yaml
settings:
  markerColors:
    restaurant: "#E91E63"
    hotel: "#2196F3"
    attraction: "#4CAF50"
```

### Track Line Styles

Customize track visualization:

```yaml
settings:
  trackStyle: dashed  # solid | dashed | dotted
  trackWidth: 4
```

## Creating GPX Files

### From GPS Devices

Export tracks from:
- Garmin devices (via Garmin Connect)
- Apple Watch (via third-party apps)
- Strava (export as GPX)
- Komoot, AllTrails, etc.

### From Phone Apps

Popular apps with GPX export:
- **iOS**: Maps.me, Gaia GPS, ViewRanger
- **Android**: OsmAnd, Locus Map, GPX Viewer

### From Google Maps

1. Create a route on Google Maps
2. Use a converter tool (e.g., mapstogpx.com)
3. Download the GPX file

### Sample GPX Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <metadata>
    <name>Morning Hike</name>
  </metadata>
  <trk>
    <name>Trail to Summit</name>
    <trkseg>
      <trkpt lat="48.1234" lon="11.5432">
        <ele>500</ele>
        <time>2024-01-15T10:00:00Z</time>
      </trkpt>
      <trkpt lat="48.1235" lon="11.5433">
        <ele>505</ele>
        <time>2024-01-15T10:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
  <wpt lat="48.200" lon="11.600">
    <name>Summit</name>
    <ele>1200</ele>
  </wpt>
</gpx>
```

## Use Cases

### Travel Journal

```markdown
---
title: "Day 3: Rome to Florence"
tags: [italy-2024, travel]
---

# Rome to Florence

Today we took the train through Tuscany...

::view-map
settings:
  gpxTracks:
    - name: "Train Route"
      file: "./tracks/rome-florence.gpx"
      color: "#1976D2"
  style: terrain
  zoom: 8
::
```

### Hiking Log

```markdown
---
title: "Mt. Rainier Summit Attempt"
latitude: 46.8523
longitude: -121.7603
tags: [hiking, mountaineering]
---

# Mt. Rainier - Camp Muir Route

::view-map
settings:
  gpxTracks:
    - name: "Ascent"
      file: "./tracks/rainier-ascent.gpx"
      color: "#4CAF50"
    - name: "Descent"
      file: "./tracks/rainier-descent.gpx"
      color: "#FF5722"
  showElevation: true
  style: terrain
::

## Statistics

- **Distance**: 16 miles round trip
- **Elevation Gain**: 4,500 ft
- **Time**: 12 hours
```

### Location Collection

```markdown
---
title: "Best Coffee Shops in Seattle"
supertags: [collections]
---

::view-map
data:
  source: collection
  filter:
    supertag: "coffee-shop"
    location: "seattle"
settings:
  style: dark
  clusterMarkers: true
  markerColors:
    coffee-shop: "#6F4E37"
::
```

## External Map Links

Click any location marker to access:
- Google Maps navigation
- Apple Maps (on iOS)
- OpenStreetMap detailed view

## Keyboard Navigation

- **Arrow keys**: Pan the map
- **+/-**: Zoom in/out
- **Escape**: Close popups
- **Tab**: Navigate between markers

## Performance Tips

1. **Large GPX files**: Consider simplifying tracks with fewer points for faster rendering
2. **Many markers**: Enable `clusterMarkers` for better performance with 50+ locations
3. **Mobile**: Maps are optimized for touch but complex tracks may render slower

## Troubleshooting

### Map Not Loading

- Check internet connection (tiles load from external servers)
- Verify coordinate format (decimal degrees: `48.8566`, not `48°51'23"`)
- Ensure map container has a defined height

### GPX Not Displaying

- Verify file path is correct and relative to document
- Check GPX file is valid XML
- Ensure track has at least 2 points

### Wrong Location

- Confirm latitude/longitude order (lat first, then lng)
- Check for typos in coordinates
- Verify coordinate precision (6 decimal places recommended)

## API Reference

### `parseGpx(xml: string): Promise<GpxTrack[]>`

Parse a GPX XML string into track data.

```typescript
import { parseGpx } from '@/lib/views/gpxParser'

const tracks = await parseGpx(gpxXmlContent)
console.log(tracks[0].distance) // meters
console.log(tracks[0].elevationGain) // meters
```

### `parseKml(xml: string): Promise<GpxTrack[]>`

Parse a KML XML string into track data.

```typescript
import { parseKml } from '@/lib/views/gpxParser'

const tracks = await parseKml(kmlXmlContent)
```

### `parseGeoFile(content: string, filename: string): Promise<GpxTrack[]>`

Auto-detect format and parse.

```typescript
import { parseGeoFile } from '@/lib/views/gpxParser'

const tracks = await parseGeoFile(content, 'track.gpx')
```

## Related Guides

- [Embeddable Views Overview](./EMBEDDABLE_VIEWS_GUIDE.md)
- [Calendar View Guide](./CALENDAR_VIEW_GUIDE.md)
- [Metadata Reference](./METADATA_REFERENCE.md)




