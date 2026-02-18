# OpenStrand Storage & Profile System

> Documentation for the unified storage layer and user profile management system
> 
> **Last Updated**: December 31, 2025

---

## Overview

The OpenStrand storage system provides a unified abstraction layer for persisting user data across multiple backends, with comprehensive profile management, gamification, and export/import capabilities.

### Related Documentation

- **[Database Connections Guide](./DATABASE_CONNECTIONS_GUIDE.md)** - Managing Local, GitHub, and PostgreSQL backends
- **[Electron Build Guide](./ELECTRON_BUILD.md)** - Building the desktop application

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  useProfile()  │  useFlashcards()  │  useRelationships()    │
├─────────────────────────────────────────────────────────────┤
│                  Connection Manager                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Local Vault  │ │    GitHub    │ │     PostgreSQL       │ │
│  │   (SQLite)   │ │  Repository  │ │     Database         │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Storage Abstraction                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │profileStorage│ │flashcardStore│ │progressStorage       │ │
│  │              │ │              │ │settingsStorage       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                      Backend Layer                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ localStorage │ │  IndexedDB   │ │   Memory (SSR)       │ │
│  │  (default)   │ │ (localForage)│ │                      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Database Backends

Frame.dev supports three database backends that can be switched at runtime:

| Backend | Use Case | Best For |
|---------|----------|----------|
| **Local Vault** | SQLite/IndexedDB on device | Personal use, offline-first, privacy |
| **GitHub** | Sync with Git repository | Version control, collaboration via PRs |
| **PostgreSQL** | Remote database | Teams, enterprise, custom integrations |

See the **[Database Connections Guide](./DATABASE_CONNECTIONS_GUIDE.md)** for detailed setup instructions.

---

## Storage Layer (`lib/storage.ts`)

### Storage Class

The `Storage` class provides a unified interface for data persistence:

```typescript
import { Storage } from '@/lib/storage'

// Create a namespaced storage instance
const myStorage = new Storage({
  namespace: 'my_app',      // Key prefix
  version: 1,               // For migrations
  backend: 'localStorage'   // or 'indexedDB', 'memory'
})

// Basic operations
await myStorage.set('key', { data: 'value' })
const data = await myStorage.get('key', defaultValue)
await myStorage.remove('key')
const exists = await myStorage.has('key')
const allKeys = await myStorage.keys()
await myStorage.clear()
```

### Pre-configured Instances

```typescript
import { 
  profileStorage,    // User profile data
  flashcardStorage,  // Flashcard decks and cards
  progressStorage,   // Study progress and stats
  settingsStorage    // App preferences
} from '@/lib/storage'
```

### Export/Import

```typescript
// Export single namespace
const exportData = await profileStorage.export()

// Import data
const result = await profileStorage.import(exportData, { 
  merge: false,    // Replace all data (default)
  validate: true   // Verify checksum
})

// Export all OpenStrand data
import { exportAllData, importAllData } from '@/lib/storage'

const allData = await exportAllData()
await importAllData(allData, { merge: false })

// Download backup file
await profileStorage.downloadBackup('my-backup.json')

// Restore from file
const file = inputElement.files[0]
const result = await profileStorage.restoreFromFile(file)
```

### Export Format

```json
{
  "metadata": {
    "version": 1,
    "exportedAt": "2025-12-03T10:30:00.000Z",
    "namespace": "openstrand_profile",
    "checksum": "a1b2c3d4"
  },
  "data": {
    "displayName": "John",
    "totalXp": 1500,
    "...": "..."
  }
}
```

---

## StorageManager & Block Tags Cache

The `StorageManager` provides a high-level API for the SQLite/IndexedDB storage layer, including block tags caching.

### Block Tags Cache

Block tags are cached to optimize performance when viewing strands:

```typescript
interface StorableBlockTagsCache {
  type: 'block-tags-cache'
  id: string                    // btc-{strandPath}
  strandPath: string           // Path to the strand
  blocks: CachedBlock[]        // Extracted blocks with tags
  strandContentHash: string    // For invalidation detection
  expiresAt: string            // TTL expiration timestamp
  syncStatus: EntitySyncStatus
  contentHash: string
  version: number
  createdAt: string
  updatedAt: string
}
```

### StorageManager API

```typescript
import { getStorageManager } from '@/lib/storage/StorageManager'

const storage = getStorageManager()

// Get cached block tags for a strand
const cache = await storage.getBlockTagsCache('wiki/my-strand')

// Save block tags cache (with 24h TTL by default)
await storage.saveBlockTagsCache('wiki/my-strand', blocks, contentHash)

// Invalidate cache for a strand
await storage.invalidateBlockTagsCache('wiki/my-strand')
```

### Auto-Invalidation

The cache is automatically invalidated when:
- `storage.saveStrand(path, content)` is called
- `storage.deleteStrand(path)` is called

This ensures cached blocks are always fresh after content changes.

### Database Schema

The `block_tags_cache` table (schema v2):

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (btc-{path}) |
| `strand_path` | TEXT | Path to strand (indexed) |
| `blocks` | TEXT | JSON array of blocks |
| `strand_content_hash` | TEXT | Content hash for validation |
| `expires_at` | TEXT | TTL expiration timestamp |
| `sync_status` | TEXT | Sync state |
| `content_hash` | TEXT | Cache content hash |
| `version` | INTEGER | Schema version |
| `created_at` | TEXT | Creation timestamp |
| `updated_at` | TEXT | Last update timestamp |

---

## Profile System (`hooks/useProfile.ts`)

### Basic Usage

```typescript
import { useProfile } from '@/components/quarry/hooks/useProfile'

function MyComponent() {
  const {
    // Profile data
    displayName,
    avatar,
    bio,
    totalXp,
    level,
    levelTitle,
    
    // Statistics
    stats,
    xpProgress,
    xpToNextLevel,
    streakStatus,
    
    // Settings
    settings,
    
    // Actions
    updateDisplayName,
    updateSettings,
    addXp,
    recordStudySession,
    
    // Export/Import
    downloadBackup,
    restoreFromFile
  } = useProfile()
  
  // ...
}
```

### Profile Data Structure

```typescript
interface UserProfile {
  profileId: string        // UUID
  displayName: string      // User's display name
  avatar?: string          // Avatar URL
  bio?: string             // Short bio
  
  // Progression
  totalXp: number          // Total experience points
  level: number            // Current level (1-12+)
  levelTitle: string       // "Novice" → "Transcendent"
  
  // Statistics
  stats: ProfileStats
  
  // Settings
  settings: ProfileSettings
  
  // Achievements
  achievements: AchievementProgress[]
  featuredAchievements: string[]  // IDs to display
  
  // Activity
  activityHeatmap: Record<string, number>  // Minutes per day
  subjectProficiency: Record<string, number>  // 0-100 per subject
}
```

### Statistics Tracking

```typescript
interface ProfileStats {
  strandsCreated: number
  strandsViewed: number
  flashcardsReviewed: number
  flashcardsCreated: number
  quizzesTaken: number
  quizzesPassed: number
  roadmapsStarted: number
  roadmapsCompleted: number
  currentStreak: number
  longestStreak: number
  totalStudyMinutes: number
  perfectQuizzes: number
  averageQuizScore: number
  lastStudyDate?: string
}
```

### Settings Structure

```typescript
interface ProfileSettings {
  // Theme
  theme: 'light' | 'dark' | 'system'
  
  // Study goals
  dailyGoalMinutes: number      // Default: 15
  studyReminders: boolean       // Enable notifications
  reminderTime?: string         // "HH:MM" format
  
  // Effects
  soundEffects: boolean         // Play sounds
  celebrations: boolean         // Confetti on achievements
  reduceMotion: boolean         // Accessibility
  
  // Display
  fontSize: 'small' | 'medium' | 'large'
  showShortcuts: boolean        // Show keyboard hints
  
  // Flashcards
  flipDuration: number          // Animation duration (ms)
  autoAdvance: boolean          // Auto-show next card
}
```

### XP & Level System

```typescript
// Add XP and check for level up
const result = await addXp(50)
if (result.leveledUp) {
  console.log(`Level up! Now level ${result.newLevel}: ${result.newTitle}`)
}

// Level thresholds (exponential curve)
// Level 1: 0 XP - Novice
// Level 2: 100 XP - Apprentice
// Level 3: 300 XP - Student
// Level 4: 600 XP - Scholar
// Level 5: 1000 XP - Researcher
// Level 6: 1500 XP - Expert
// Level 7: 2200 XP - Master
// Level 8: 3000 XP - Sage
// Level 9: 4000 XP - Grandmaster
// Level 10: 5500 XP - Luminary
// Level 11: 7500 XP - Enlightened
// Level 12: 10000 XP - Transcendent
```

### Recording Study Sessions

```typescript
// After a flashcard session
await recordStudySession({
  id: 'session-123',
  type: 'flashcard',
  startedAt: startTime,
  endedAt: new Date().toISOString(),
  itemsReviewed: 25,
  correctCount: 20,
  duration: 600, // seconds
  xpEarned: 150,
  deckIds: ['deck-1'],
  streakMaintained: true
})

// Automatically updates:
// - Activity heatmap
// - Stats (flashcardsReviewed, totalStudyMinutes)
// - Streak tracking
// - XP and level
```

### Streak System

```typescript
const { streakStatus } = useProfile()

if (streakStatus.maintained) {
  // User studied today or yesterday
  console.log(`${stats.currentStreak} day streak!`)
} else {
  // Streak broken (more than 1 day since last study)
  console.log(`Streak lost after ${streakStatus.daysElapsed} days`)
}
```

---

## ProfileSettings Component

### Usage

```tsx
import { ProfileSettings } from '@/components/quarry/ui/ProfileSettings'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  
  return (
    <>
      <button onClick={() => setShowSettings(true)}>
        Settings
      </button>
      
      <ProfileSettings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  )
}
```

### Features

1. **Profile Tab**
   - Edit display name
   - Edit bio
   - View XP/level progress
   - View study statistics

2. **Preferences Tab**
   - Daily study goal
   - Study reminders
   - Flashcard settings

3. **Appearance Tab**
   - Theme selection (light/dark/system)
   - Font size
   - Sound effects toggle
   - Celebration animations toggle
   - Reduce motion (accessibility)

4. **Data Tab**
   - Export backup (downloads JSON)
   - Import backup (upload JSON)
   - Storage info
   - Reset all data (with confirmation)

5. **About Tab**
   - App information
   - Feature list
   - Keyboard shortcuts reference

---

## Best Practices

### 1. Always Handle Loading State

```typescript
const { loading, error } = useProfile()

if (loading) return <Spinner />
if (error) return <Error message={error} />
```

### 2. Use Optimistic Updates

```typescript
// Settings update immediately (no await needed for UI)
updateSettings({ theme: 'dark' })

// But for critical data, await the result
const success = await saveProfile()
```

### 3. Backup Before Import

```typescript
// Always offer export before import
const handleImport = async () => {
  const confirmBackup = window.confirm(
    'Would you like to download a backup first?'
  )
  if (confirmBackup) {
    await downloadBackup()
  }
  // Then proceed with import
}
```

### 4. Handle Quota Errors

```typescript
const success = await myStorage.set('large-data', data)
if (!success) {
  // Storage quota may be exceeded
  showNotification('Storage full. Please export and clear old data.')
}
```

---

## Migration Guide

### Adding New Settings

```typescript
// In useProfile.ts, add to DEFAULT_SETTINGS
const DEFAULT_SETTINGS = {
  // ...existing
  newSetting: defaultValue
}

// When loading, missing keys get default values automatically
const userSettings = await settingsStorage.get('preferences', DEFAULT_SETTINGS)
```

### Storage Version Upgrade

```typescript
// Check version and migrate
const storage = new Storage({ namespace: 'app', version: 2 })
const oldVersion = await storage.get('_version', 1)

if (oldVersion < 2) {
  // Run migration
  const oldData = await storage.get('oldKey', null)
  if (oldData) {
    await storage.set('newKey', transformData(oldData))
    await storage.remove('oldKey')
  }
  await storage.set('_version', 2)
}
```

---

## Security Considerations

1. **Data is stored client-side only** - Never contains auth tokens or sensitive PII
2. **Checksums validate integrity** - Import verifies data hasn't been tampered with
3. **No cloud sync** - All data stays on user's device
4. **Export is JSON** - Human-readable, can be inspected before import

---

## Troubleshooting

### Storage Not Persisting

```typescript
// Check if storage is available
if (!isBrowser()) {
  console.log('Running in SSR, using memory store')
}

// Check for private browsing
try {
  localStorage.setItem('test', 'test')
  localStorage.removeItem('test')
} catch {
  console.log('localStorage blocked (private browsing?)')
}
```

### Import Failing

```typescript
const result = await restoreFromFile(file)
if (!result.success) {
  console.error('Import errors:', result.errors)
  // Common issues:
  // - Invalid JSON format
  // - Checksum mismatch
  // - Missing required fields
}
```

---

*This documentation covers the storage and profile system for OpenStrand PKMS. For flashcard and study features, see the main implementation docs.*





