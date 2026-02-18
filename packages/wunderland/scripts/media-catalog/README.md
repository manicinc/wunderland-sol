# Media Catalog Scripts

Scripts to fetch, catalog, and organize stock images from various providers for the Meditation Focus page backgrounds.

## Supported Providers

| Provider | API Docs | License |
|----------|----------|---------|
| **Pexels** | https://www.pexels.com/api/ | Free for commercial use, attribution appreciated |
| **Pixabay** | https://pixabay.com/api/docs/ | Pixabay License (free, no attribution required) |
| **Unsplash** | https://unsplash.com/developers | Unsplash License (free, attribution required) |
| **Giphy** | https://developers.giphy.com/ | Giphy Terms (attribution required) |

## Setup

1. Copy `.env.example` to `.env` in the project root
2. Add your API keys:

```bash
PEXELS_API_KEY=your_key_here
PIXABAY_API_KEY=your_key_here
UNSPLASH_ACCESS_KEY=your_key_here
GIPHY_API_KEY=your_key_here
```

## Usage

### Fetch All Backgrounds

```bash
# From project root
npx tsx scripts/media-catalog/fetchBackgrounds.ts
```

### Build Catalog Only

```bash
npx tsx scripts/media-catalog/buildCatalog.ts
```

### Options

```bash
# Fetch specific category
npx tsx scripts/media-catalog/fetchBackgrounds.ts --category rain

# Fetch with custom limit per category
npx tsx scripts/media-catalog/fetchBackgrounds.ts --limit 50

# Skip download, only update catalog
npx tsx scripts/media-catalog/fetchBackgrounds.ts --catalog-only

# Force re-download existing images
npx tsx scripts/media-catalog/fetchBackgrounds.ts --force
```

## Output Structure

```
public/media/backgrounds/
├── catalog.json           # Master catalog with all metadata
├── rain/
│   ├── pexels-123.jpg
│   ├── unsplash-abc.jpg
│   └── ...
├── ocean/
├── forest/
├── cafe/
├── fireplace/
├── lofi/
├── nature/
├── urban/
├── abstract/
├── cozy/
└── space/
```

## Catalog Format

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-07T12:00:00Z",
  "categories": {
    "rain": {
      "images": [
        {
          "id": "pexels-123",
          "provider": "pexels",
          "url": "/media/backgrounds/rain/pexels-123.jpg",
          "thumbnail": "/media/backgrounds/rain/thumbs/pexels-123.jpg",
          "width": 1920,
          "height": 1080,
          "photographer": "John Doe",
          "photographerUrl": "https://pexels.com/@johndoe",
          "sourceUrl": "https://pexels.com/photo/123",
          "license": "Pexels License",
          "licenseUrl": "https://www.pexels.com/license/",
          "tags": ["rain", "window", "drops", "moody"],
          "color": "#2a3f5f",
          "downloadable": true
        }
      ]
    }
  },
  "soundscapeMapping": {
    "rain": ["rain", "storm", "moody"],
    "ocean": ["ocean", "beach", "waves"],
    "forest": ["forest", "trees", "nature"],
    "cafe": ["cafe", "coffee", "cozy"],
    "fireplace": ["fireplace", "fire", "cozy"],
    "lofi": ["lofi", "anime", "aesthetic"],
    "white-noise": ["abstract", "minimal", "space"]
  }
}
```

## Licensing Notes

All images are fetched with proper licensing for use in the application:

- **Pexels**: Free for personal and commercial use. Attribution not required but appreciated.
- **Pixabay**: Content is released under the Pixabay License, making it safe to use without attribution.
- **Unsplash**: Free to use. Attribution is required and automatically included in metadata.
- **Giphy**: For GIFs only. Must display "Powered by GIPHY" when showing GIFs.

The catalog includes full attribution data for each image, displayed in the UI when users view or download images.

