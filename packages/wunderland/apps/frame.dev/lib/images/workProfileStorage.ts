/**
 * Work Style Profile Storage
 * @module lib/images/workProfileStorage
 *
 * Persistent storage for PDF/EPUB work style profiles.
 * Uses IndexedDB for primary storage with localStorage fallback.
 */

import { Storage } from '../storage'
import type {
  WorkStyleProfile,
  ReferenceImage,
} from './workStyleProfile'
import {
  serializeWorkStyleProfile,
  deserializeWorkStyleProfile,
} from './workStyleProfile'

/**
 * Storage namespace for work profiles
 */
const WORK_PROFILES_NS = 'codex:work-profiles'

/**
 * Storage instance
 */
const storage = new Storage({
  namespace: WORK_PROFILES_NS,
  backend: 'sql',  // Use SQL/IndexedDB as primary
  version: 1,
})

/**
 * Save a work style profile
 */
export async function saveWorkProfile(profile: WorkStyleProfile): Promise<void> {
  const key = `profile:${profile.workId}`
  const serialized = serializeWorkStyleProfile(profile)
  await storage.set(key, serialized)
}

/**
 * Load a work style profile by ID
 */
export async function loadWorkProfile(workId: string): Promise<WorkStyleProfile | null> {
  const key = `profile:${workId}`
  const serialized = await storage.get<string | null>(key, null)

  if (!serialized) {
    return null
  }

  try {
    return deserializeWorkStyleProfile(serialized)
  } catch (error) {
    console.error('[WorkProfileStorage] Failed to deserialize profile:', error)
    return null
  }
}

/**
 * Delete a work style profile
 */
export async function deleteWorkProfile(workId: string): Promise<void> {
  const key = `profile:${workId}`
  await storage.remove(key)
}

/**
 * List all work profile IDs
 */
export async function listWorkProfileIds(): Promise<string[]> {
  const keys = await storage.keys()

  return keys
    .filter((key: string) => key.startsWith('profile:'))
    .map((key: string) => key.replace('profile:', ''))
}

/**
 * List all work profiles (full objects)
 */
export async function listAllWorkProfiles(): Promise<WorkStyleProfile[]> {
  const ids = await listWorkProfileIds()

  const profiles = await Promise.all(
    ids.map(id => loadWorkProfile(id))
  )

  return profiles.filter((p): p is WorkStyleProfile => p !== null)
}

/**
 * Search work profiles by title
 */
export async function searchWorkProfiles(query: string): Promise<WorkStyleProfile[]> {
  const allProfiles = await listAllWorkProfiles()
  const lowerQuery = query.toLowerCase()

  return allProfiles.filter(profile =>
    profile.workTitle.toLowerCase().includes(lowerQuery) ||
    profile.workId.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get profiles by content type
 */
export async function getProfilesByContentType(
  contentType: 'fiction' | 'non-fiction' | 'technical' | 'educational' | 'mixed'
): Promise<WorkStyleProfile[]> {
  const allProfiles = await listAllWorkProfiles()

  return allProfiles.filter(profile =>
    profile.analysis.contentType === contentType
  )
}

/**
 * Get profiles sorted by upload date (newest first)
 */
export async function getRecentWorkProfiles(limit: number = 10): Promise<WorkStyleProfile[]> {
  const allProfiles = await listAllWorkProfiles()

  return allProfiles
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .slice(0, limit)
}

/**
 * Update specific fields in a profile
 */
export async function updateWorkProfile(
  workId: string,
  updates: Partial<WorkStyleProfile>
): Promise<WorkStyleProfile | null> {
  const existing = await loadWorkProfile(workId)

  if (!existing) {
    return null
  }

  const updated: WorkStyleProfile = {
    ...existing,
    ...updates,
    lastUpdated: new Date(),
  }

  await saveWorkProfile(updated)
  return updated
}

/**
 * Check if a profile exists
 */
export async function workProfileExists(workId: string): Promise<boolean> {
  const profile = await loadWorkProfile(workId)
  return profile !== null
}

/**
 * Get storage statistics
 */
export async function getWorkProfileStats(): Promise<{
  totalProfiles: number
  totalIllustrations: number
  totalCharacters: number
  totalSettings: number
  byContentType: Record<string, number>
  storageSize: string
}> {
  const allProfiles = await listAllWorkProfiles()

  const byContentType: Record<string, number> = {}
  let totalIllustrations = 0
  let totalCharacters = 0
  let totalSettings = 0

  for (const profile of allProfiles) {
    // Count by content type
    const type = profile.analysis.contentType
    byContentType[type] = (byContentType[type] || 0) + 1

    // Aggregate stats
    totalIllustrations += profile.illustrationsGenerated
    totalCharacters += profile.characters.length
    totalSettings += profile.settings.length
  }

  // Estimate storage size
  const allKeys = await storage.keys()
  const profileKeys = allKeys.filter((k: string) => k.startsWith('profile:'))
  const estimatedSize = profileKeys.length * 50 // Rough estimate in KB

  return {
    totalProfiles: allProfiles.length,
    totalIllustrations,
    totalCharacters,
    totalSettings,
    byContentType,
    storageSize: `~${estimatedSize} KB`,
  }
}

/**
 * Export all work profiles to JSON
 */
export async function exportAllWorkProfiles(): Promise<string> {
  const allProfiles = await listAllWorkProfiles()

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profileCount: allProfiles.length,
    profiles: allProfiles,
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Import work profiles from JSON
 */
export async function importWorkProfiles(
  jsonData: string,
  options?: {
    overwrite?: boolean
  }
): Promise<{
  imported: number
  skipped: number
  errors: string[]
}> {
  const { overwrite = false } = options || {}

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  try {
    const data = JSON.parse(jsonData)

    if (!data.profiles || !Array.isArray(data.profiles)) {
      throw new Error('Invalid export format: missing profiles array')
    }

    for (const profileData of data.profiles) {
      try {
        const workId = profileData.workId

        // Check if exists
        if (!overwrite) {
          const exists = await workProfileExists(workId)
          if (exists) {
            skipped++
            continue
          }
        }

        // Deserialize and save
        const serialized = JSON.stringify(profileData)
        const profile = deserializeWorkStyleProfile(serialized)
        await saveWorkProfile(profile)

        imported++
      } catch (error) {
        errors.push(`Failed to import profile ${profileData.workId}: ${error}`)
      }
    }
  } catch (error) {
    errors.push(`Failed to parse import data: ${error}`)
  }

  return { imported, skipped, errors }
}

/**
 * Clear all work profiles (use with caution!)
 */
export async function clearAllWorkProfiles(): Promise<number> {
  const ids = await listWorkProfileIds()

  for (const id of ids) {
    await deleteWorkProfile(id)
  }

  return ids.length
}

/**
 * Save reference image data URL for offline access
 */
export async function saveReferenceImageData(
  workId: string,
  imageId: string,
  dataUrl: string
): Promise<void> {
  const key = `ref-image:${workId}:${imageId}`
  await storage.set(key, dataUrl)
}

/**
 * Load reference image data URL
 */
export async function loadReferenceImageData(
  workId: string,
  imageId: string
): Promise<string | null> {
  const key = `ref-image:${workId}:${imageId}`
  return await storage.get<string | null>(key, null)
}

/**
 * Get profile with embedded reference image data URLs
 */
export async function loadWorkProfileWithImages(workId: string): Promise<WorkStyleProfile | null> {
  const profile = await loadWorkProfile(workId)
  if (!profile) {
    return null
  }

  // Load data URLs for reference images
  const updatedRefImages = await Promise.all(
    profile.referenceImages.map(async (refImage) => {
      if (refImage.dataUrl) {
        return refImage
      }

      const dataUrl = await loadReferenceImageData(workId, refImage.id)
      return {
        ...refImage,
        dataUrl: dataUrl || undefined,
      }
    })
  )

  return {
    ...profile,
    referenceImages: updatedRefImages,
  }
}

/**
 * Save profile and all reference images
 */
export async function saveWorkProfileWithImages(profile: WorkStyleProfile): Promise<void> {
  // Save main profile
  await saveWorkProfile(profile)

  // Save reference image data URLs
  for (const refImage of profile.referenceImages) {
    if (refImage.dataUrl) {
      await saveReferenceImageData(profile.workId, refImage.id, refImage.dataUrl)
    }
  }
}
