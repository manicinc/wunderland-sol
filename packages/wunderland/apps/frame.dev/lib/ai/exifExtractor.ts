/**
 * EXIF Metadata Extraction Module
 * @module lib/ai/exifExtractor
 *
 * Extract EXIF metadata from images using the exifr library
 * Lazy-loads the library (~45KB gzipped) only when needed
 */

import type { ImageMetadata, ImageSourceType } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   LAZY LOADING
═══════════════════════════════════════════════════════════════════════════ */

let exifrModule: typeof import('exifr') | null = null

/**
 * Lazy-load the exifr library
 * Only loads once per session, then cached
 */
async function loadExifr() {
  if (exifrModule) return exifrModule

  try {
    exifrModule = await import('exifr')
    return exifrModule
  } catch (error) {
    console.warn('[EXIFExtractor] Failed to load exifr library:', error)
    throw new Error('EXIF extraction library not available')
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE TYPE DETECTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Detect source type from EXIF software field
 */
function detectSourceTypeFromExif(software?: string): ImageSourceType | null {
  if (!software) return null

  const softwareLower = software.toLowerCase()

  // Screenshot tools
  if (
    softwareLower.includes('screenshot') ||
    softwareLower.includes('snagit') ||
    softwareLower.includes('greenshot') ||
    softwareLower.includes('lightshot') ||
    softwareLower.includes('sharex') ||
    softwareLower.includes('flameshot') ||
    softwareLower.includes('spectacle') ||
    softwareLower.includes('screencapture') ||
    softwareLower.includes('snipping') ||
    softwareLower.includes('screengrab')
  ) {
    return 'screenshot'
  }

  // Camera/phone software
  if (
    softwareLower.includes('camera') ||
    softwareLower.includes('photos') ||
    software.match(/\d+\.\d+\.\d+/) // iOS version pattern
  ) {
    return 'camera'
  }

  return null
}

/**
 * Detect source type from camera make/model
 */
function detectSourceTypeFromCamera(make?: string, model?: string): ImageSourceType | null {
  if (!make && !model) return null

  const makeLower = make?.toLowerCase() || ''
  const modelLower = model?.toLowerCase() || ''

  // Phone manufacturers
  const phoneManufacturers = ['apple', 'samsung', 'google', 'huawei', 'xiaomi', 'oneplus', 'pixel']
  const isPhone = phoneManufacturers.some((m) => makeLower.includes(m))

  if (isPhone || modelLower.includes('iphone') || modelLower.includes('pixel')) {
    return 'camera'
  }

  // DSLR/Mirrorless manufacturers
  const cameraManufacturers = ['canon', 'nikon', 'sony', 'fujifilm', 'olympus', 'panasonic']
  const isCamera = cameraManufacturers.some((m) => makeLower.includes(m))

  if (isCamera) {
    return 'camera'
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXTRACTION FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract EXIF metadata from an image blob
 *
 * @param blob - Image blob
 * @param filename - Optional filename for additional context
 * @returns Image metadata with EXIF data
 */
export async function extractExifMetadata(
  blob: Blob,
  filename?: string
): Promise<ImageMetadata> {
  try {
    // Load image to get dimensions
    const img = await createImageBitmap(blob)
    const dimensions = {
      width: img.width,
      height: img.height,
    }

    // Base metadata (always available)
    const metadata: ImageMetadata = {
      dimensions,
      fileSize: blob.size,
      mimeType: blob.type,
    }

    // Try to extract EXIF data
    try {
      const exifr = await loadExifr()
      const exifData = await exifr.parse(blob, {
        // Specify which tags to extract for performance
        pick: [
          'Make',
          'Model',
          'Software',
          'DateTime',
          'DateTimeOriginal',
          'DateTimeDigitized',
          'GPSLatitude',
          'GPSLongitude',
          'GPSAltitude',
          'Orientation',
          'ISO',
          'ExposureTime',
          'FNumber',
        ],
      })

      if (exifData) {
        metadata.exif = {
          make: exifData.Make,
          model: exifData.Model,
          software: exifData.Software,
          dateTime:
            exifData.DateTimeOriginal || exifData.DateTimeDigitized || exifData.DateTime,
          orientation: exifData.Orientation,
          iso: exifData.ISO,
          exposureTime: exifData.ExposureTime,
          fNumber: exifData.FNumber,
        }

        // GPS coordinates (if available)
        if (exifData.GPSLatitude && exifData.GPSLongitude) {
          metadata.exif.gps = {
            latitude: exifData.GPSLatitude,
            longitude: exifData.GPSLongitude,
            altitude: exifData.GPSAltitude,
          }
        }
      }
    } catch (exifError) {
      // EXIF extraction failed, but that's okay
      // Many images (especially screenshots) don't have EXIF data
      console.debug('[EXIFExtractor] No EXIF data found or extraction failed:', exifError)
    }

    return metadata
  } catch (error) {
    console.error('[EXIFExtractor] Failed to extract metadata:', error)
    throw new Error('Failed to extract image metadata')
  }
}

/**
 * Quick source type detection from EXIF
 * Doesn't extract full metadata, just determines source type
 *
 * @param blob - Image blob
 * @param filename - Optional filename for hints
 * @returns Detected source type or 'unknown'
 */
export async function quickSourceDetection(
  blob: Blob,
  filename?: string
): Promise<ImageSourceType> {
  try {
    // Check filename for hints
    if (filename) {
      const filenameLower = filename.toLowerCase()
      if (
        filenameLower.includes('screenshot') ||
        filenameLower.includes('screen shot') ||
        filenameLower.startsWith('screen ') ||
        filenameLower.startsWith('shot ')
      ) {
        return 'screenshot'
      }

      if (
        filenameLower.startsWith('img_') ||
        filenameLower.startsWith('dsc') ||
        filenameLower.startsWith('photo')
      ) {
        return 'camera'
      }
    }

    // Try EXIF detection
    try {
      const exifr = await loadExifr()
      const exifData = await exifr.parse(blob, {
        pick: ['Make', 'Model', 'Software'],
      })

      if (exifData) {
        // Check software field first (most reliable)
        const sourceFromSoftware = detectSourceTypeFromExif(exifData.Software)
        if (sourceFromSoftware) return sourceFromSoftware

        // Check camera make/model
        const sourceFromCamera = detectSourceTypeFromCamera(exifData.Make, exifData.Model)
        if (sourceFromCamera) return sourceFromCamera
      }
    } catch {
      // EXIF extraction failed, continue to fallback
    }

    // Fallback: Assume upload if no other info
    return 'upload'
  } catch (error) {
    console.warn('[EXIFExtractor] Quick detection failed:', error)
    return 'unknown'
  }
}

/**
 * Check if EXIF extraction is available
 * (i.e., browser supports required APIs)
 */
export function isExifExtractionAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof createImageBitmap !== 'undefined' &&
    typeof Blob !== 'undefined'
  )
}
