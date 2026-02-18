# Social Media Import

Import content from social platforms into your knowledge base with full provenance tracking.

## Supported Platforms

| Platform | Features |
|----------|----------|
| **Reddit** | Subreddit extraction, upvotes, comments |
| **Twitter/X** | Both twitter.com and x.com domains, retweets, likes |
| **Instagram** | Posts and Reels, engagement metrics |
| **Pinterest** | Pin boards, saves |
| **YouTube** | Video duration, view counts, shorts |
| **TikTok** | Video IDs, creator handles |
| **Facebook** | Posts, photos, videos |
| **LinkedIn** | Posts, articles, profiles |
| **Mastodon** | Federated instance support |
| **Threads** | Posts and profiles |

## Features

### Auto-Detection
Paste any social media URL and the platform is automatically detected from the hostname. No manual selection required.

### Metadata Extraction
The import process extracts:
- **Title** - Post title or video name
- **Author** - Original creator/poster
- **Engagement** - Likes, comments, shares, views, upvotes
- **Hashtags** - All #hashtags from the content
- **Mentions** - All @mentions from the content
- **Media** - Thumbnails, images, video references
- **Posted Date** - When the content was originally published

### Attribution Chain
Every imported strand maintains full provenance:
- **Creator** - The original author from the social platform
- **Uploader** - You, the person importing the content
- **Source URL** - Direct link back to the original post
- **Platform** - Which social network it came from

### Import History
Track all your social imports with:
- Platform statistics (count per platform)
- Search and filter by title, URL, or tags
- Sort by date, platform, or title
- Group view by platform

## Usage

### Via Settings Modal
1. Open Settings (gear icon or keyboard shortcut)
2. Navigate to "Social Sources" tab
3. Paste a social media URL
4. Preview the extracted content
5. Click "Import as Strand"

### Via Quick Import
Use the social import card anywhere in the app by pasting a social URL.

## API Reference

### Scrape Endpoint

```
GET /api/scrape?url=<encoded-url>
```

**Response:**
```typescript
{
  content: string,           // Markdown content
  title: string,             // Page/post title
  metadata: {
    author?: string,         // Creator name
    siteName: string,        // Platform name
    platform?: {             // Only for social URLs
      id: string,            // e.g., "reddit", "twitter"
      name: string,          // e.g., "Reddit", "Twitter / X"
      icon: string,          // Lucide icon name
      color: string          // Brand color (hex)
    },
    postId?: string,         // Platform-specific post ID
    username?: string,       // Creator handle
    profileUrl?: string,     // Link to creator's profile
    engagement?: {
      likes?: number,
      comments?: number,
      shares?: number,
      views?: number,
      upvotes?: number,
      saves?: number
    },
    media?: {
      images: string[],
      videos: string[],
      thumbnails: string[]
    },
    hashtags?: string[],     // Extracted hashtags
    mentions?: string[],     // Extracted mentions
    postedAt?: string        // ISO timestamp
  }
}
```

## Library Reference

### Platform Detection

```typescript
import { detectPlatformFromUrl, isSocialUrl } from '@/lib/social/platforms'

// Check if URL is from a social platform
if (isSocialUrl(url)) {
  const platform = detectPlatformFromUrl(url)
  console.log(platform.name) // "Reddit"
}
```

### Extract Post/Username

```typescript
import { extractPostId, extractUsername } from '@/lib/social/platforms'

const postId = extractPostId('https://reddit.com/r/test/comments/abc123')
// "abc123"

const username = extractUsername('https://twitter.com/elonmusk/status/123')
// "@elonmusk"
```

### Parse Engagement

```typescript
import { parseEngagementCount } from '@/lib/social/sourceHelper'

parseEngagementCount('1.2K')  // 1200
parseEngagementCount('5M')    // 5000000
parseEngagementCount('500')   // 500
```

### Create Strand

```typescript
import { createStrandFromSocialImport } from '@/lib/social/strandCreator'

const strandData = createStrandFromSocialImport(
  importResult,
  sourceUrl,
  { customTags: ['favorite', 'reference'] }
)
```

## Components

### SocialImportCard
Main import interface with URL input, auto-scrape, and preview.

### SocialPlatformIcon
Platform icon with brand colors. Supports sizes: `xs`, `sm`, `md`, `lg`, `xl`.

### SocialSourceBadge
Attribution badge showing platform, username, and engagement.

### SocialSourceSettings
Settings tab for managing imports and viewing history.

## Testing

Run the social module tests:

```bash
pnpm vitest run __tests__/unit/social --config vitest.config.ts
```

Test files:
- `platforms.test.ts` - Platform detection and URL parsing
- `sourceHelper.test.ts` - Metadata extraction and utilities
- `strandCreator.test.ts` - Strand creation and history
