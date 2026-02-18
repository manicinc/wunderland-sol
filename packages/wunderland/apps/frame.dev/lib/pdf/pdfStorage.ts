/**
 * PDF Storage Service
 * @module lib/pdf/pdfStorage
 *
 * IndexedDB storage for PDFs, annotations, and bookmarks.
 * Supports storing PDF metadata, blobs, and cross-linking to strands.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PDFDocument {
  /** Unique identifier */
  id: string
  /** Original filename */
  filename: string
  /** Display title (from metadata or filename) */
  title: string
  /** Number of pages */
  pageCount: number
  /** File size in bytes */
  fileSize: number
  /** Author from metadata */
  author?: string
  /** Subject from metadata */
  subject?: string
  /** Keywords from metadata */
  keywords?: string[]
  /** Creation date */
  createdAt: number
  /** Last opened timestamp */
  lastOpenedAt: number
  /** Source URL if downloaded */
  sourceUrl?: string
  /** Research session ID if linked */
  researchSessionId?: string
  /** Thumbnail data URL (first page) */
  thumbnailDataUrl?: string
}

export interface PDFBlob {
  /** Document ID (matches PDFDocument.id) */
  id: string
  /** The actual PDF file data */
  blob: Blob
}

export interface PDFAnnotation {
  /** Unique identifier */
  id: string
  /** Document ID */
  documentId: string
  /** Page number (1-indexed) */
  pageNumber: number
  /** Annotation type */
  type: 'highlight' | 'note' | 'underline' | 'strikethrough' | 'freeform'
  /** Position on page (normalized 0-1) */
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  /** Annotation content (text for notes, selected text for highlights) */
  content: string
  /** Color for visual annotations */
  color?: string
  /** Linked strand path */
  linkedStrandPath?: string
  /** Linked strand loom ID */
  linkedLoomId?: string
  /** Created timestamp */
  createdAt: number
  /** Updated timestamp */
  updatedAt: number
}

export interface PDFBookmark {
  /** Unique identifier */
  id: string
  /** Document ID */
  documentId: string
  /** Page number */
  pageNumber: number
  /** Bookmark label */
  label: string
  /** Created timestamp */
  createdAt: number
}

export interface PDFReadingProgress {
  /** Document ID */
  documentId: string
  /** Last read page */
  lastPage: number
  /** Scroll position on last page (0-1) */
  scrollPosition: number
  /** Zoom level */
  zoom: number
  /** Total reading time in milliseconds */
  totalReadingTime: number
  /** Last read timestamp */
  lastReadAt: number
}

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

const DB_NAME = 'quarry-pdf-storage'
const DB_VERSION = 1

const STORES = {
  DOCUMENTS: 'documents',
  BLOBS: 'blobs',
  ANNOTATIONS: 'annotations',
  BOOKMARKS: 'bookmarks',
  PROGRESS: 'progress',
} as const

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Get or initialize the PDF storage database
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Documents store
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' })
        docStore.createIndex('filename', 'filename', { unique: false })
        docStore.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false })
        docStore.createIndex('sourceUrl', 'sourceUrl', { unique: false })
      }

      // Blobs store (separate for performance)
      if (!db.objectStoreNames.contains(STORES.BLOBS)) {
        db.createObjectStore(STORES.BLOBS, { keyPath: 'id' })
      }

      // Annotations store
      if (!db.objectStoreNames.contains(STORES.ANNOTATIONS)) {
        const annoStore = db.createObjectStore(STORES.ANNOTATIONS, { keyPath: 'id' })
        annoStore.createIndex('documentId', 'documentId', { unique: false })
        annoStore.createIndex('pageNumber', ['documentId', 'pageNumber'], { unique: false })
        annoStore.createIndex('linkedStrandPath', 'linkedStrandPath', { unique: false })
      }

      // Bookmarks store
      if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
        const bmStore = db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'id' })
        bmStore.createIndex('documentId', 'documentId', { unique: false })
      }

      // Reading progress store
      if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
        db.createObjectStore(STORES.PROGRESS, { keyPath: 'documentId' })
      }
    }
  })

  return dbPromise
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

/**
 * Store a new PDF document
 */
export async function storePDF(
  file: File,
  metadata?: Partial<PDFDocument>
): Promise<PDFDocument> {
  const db = await getDB()
  const id = generateId('pdf')
  const now = Date.now()

  // Create document record
  const document: PDFDocument = {
    id,
    filename: file.name,
    title: metadata?.title || file.name.replace(/\.pdf$/i, ''),
    pageCount: metadata?.pageCount || 0,
    fileSize: file.size,
    author: metadata?.author,
    subject: metadata?.subject,
    keywords: metadata?.keywords,
    createdAt: now,
    lastOpenedAt: now,
    sourceUrl: metadata?.sourceUrl,
    researchSessionId: metadata?.researchSessionId,
    thumbnailDataUrl: metadata?.thumbnailDataUrl,
  }

  // Store document and blob in transaction
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.DOCUMENTS, STORES.BLOBS], 'readwrite')

    // Store document metadata
    tx.objectStore(STORES.DOCUMENTS).add(document)

    // Store blob
    tx.objectStore(STORES.BLOBS).add({ id, blob: file })

    tx.oncomplete = () => {
      dispatchPDFEvent('stored', document)
      resolve(document)
    }
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get PDF document metadata
 */
export async function getPDFDocument(id: string): Promise<PDFDocument | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.DOCUMENTS, 'readonly')
      .objectStore(STORES.DOCUMENTS)
      .get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get PDF blob data
 */
export async function getPDFBlob(id: string): Promise<Blob | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.BLOBS, 'readonly')
      .objectStore(STORES.BLOBS)
      .get(id)

    request.onsuccess = () => resolve(request.result?.blob || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all PDF documents
 */
export async function getAllPDFDocuments(): Promise<PDFDocument[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.DOCUMENTS, 'readonly')
      .objectStore(STORES.DOCUMENTS)
      .getAll()

    request.onsuccess = () => {
      const docs = request.result || []
      // Sort by last opened
      docs.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      resolve(docs)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Update PDF document metadata
 */
export async function updatePDFDocument(
  id: string,
  updates: Partial<Omit<PDFDocument, 'id' | 'createdAt'>>
): Promise<PDFDocument | null> {
  const db = await getDB()
  const existing = await getPDFDocument(id)
  if (!existing) return null

  const updated: PDFDocument = {
    ...existing,
    ...updates,
  }

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.DOCUMENTS, 'readwrite')
      .objectStore(STORES.DOCUMENTS)
      .put(updated)

    request.onsuccess = () => {
      dispatchPDFEvent('updated', updated)
      resolve(updated)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete a PDF document and all associated data
 */
export async function deletePDFDocument(id: string): Promise<boolean> {
  const db = await getDB()
  const doc = await getPDFDocument(id)
  if (!doc) return false

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.DOCUMENTS, STORES.BLOBS, STORES.ANNOTATIONS, STORES.BOOKMARKS, STORES.PROGRESS],
      'readwrite'
    )

    tx.objectStore(STORES.DOCUMENTS).delete(id)
    tx.objectStore(STORES.BLOBS).delete(id)
    tx.objectStore(STORES.PROGRESS).delete(id)

    // Delete annotations
    const annoIndex = tx.objectStore(STORES.ANNOTATIONS).index('documentId')
    annoIndex.openCursor(id).onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    // Delete bookmarks
    const bmIndex = tx.objectStore(STORES.BOOKMARKS).index('documentId')
    bmIndex.openCursor(id).onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    tx.oncomplete = () => {
      dispatchPDFEvent('deleted', doc)
      resolve(true)
    }
    tx.onerror = () => reject(tx.error)
  })
}

// ============================================================================
// ANNOTATION OPERATIONS
// ============================================================================

/**
 * Add an annotation
 */
export async function addAnnotation(
  annotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PDFAnnotation> {
  const db = await getDB()
  const now = Date.now()

  const anno: PDFAnnotation = {
    ...annotation,
    id: generateId('anno'),
    createdAt: now,
    updatedAt: now,
  }

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.ANNOTATIONS, 'readwrite')
      .objectStore(STORES.ANNOTATIONS)
      .add(anno)

    request.onsuccess = () => {
      dispatchPDFEvent('annotation-added', anno)
      resolve(anno)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get annotations for a document
 */
export async function getDocumentAnnotations(documentId: string): Promise<PDFAnnotation[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.ANNOTATIONS, 'readonly')
      .objectStore(STORES.ANNOTATIONS)
      .index('documentId')
      .getAll(documentId)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get annotations for a specific page
 */
export async function getPageAnnotations(documentId: string, pageNumber: number): Promise<PDFAnnotation[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.ANNOTATIONS, 'readonly')
      .objectStore(STORES.ANNOTATIONS)
      .index('pageNumber')
      .getAll([documentId, pageNumber])

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Update an annotation
 */
export async function updateAnnotation(
  id: string,
  updates: Partial<Omit<PDFAnnotation, 'id' | 'documentId' | 'createdAt'>>
): Promise<PDFAnnotation | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ANNOTATIONS, 'readwrite')
    const store = tx.objectStore(STORES.ANNOTATIONS)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const existing = getReq.result as PDFAnnotation | undefined
      if (!existing) {
        resolve(null)
        return
      }

      const updated: PDFAnnotation = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      }

      store.put(updated).onsuccess = () => {
        dispatchPDFEvent('annotation-updated', updated)
        resolve(updated)
      }
    }

    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Delete an annotation
 */
export async function deleteAnnotation(id: string): Promise<boolean> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.ANNOTATIONS, 'readwrite')
      .objectStore(STORES.ANNOTATIONS)
      .delete(id)

    request.onsuccess = () => {
      dispatchPDFEvent('annotation-deleted', { id })
      resolve(true)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get annotations linked to a strand
 */
export async function getStrandLinkedAnnotations(strandPath: string): Promise<PDFAnnotation[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.ANNOTATIONS, 'readonly')
      .objectStore(STORES.ANNOTATIONS)
      .index('linkedStrandPath')
      .getAll(strandPath)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// BOOKMARK OPERATIONS
// ============================================================================

/**
 * Add a bookmark
 */
export async function addBookmark(
  documentId: string,
  pageNumber: number,
  label: string
): Promise<PDFBookmark> {
  const db = await getDB()

  const bookmark: PDFBookmark = {
    id: generateId('bm'),
    documentId,
    pageNumber,
    label,
    createdAt: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.BOOKMARKS, 'readwrite')
      .objectStore(STORES.BOOKMARKS)
      .add(bookmark)

    request.onsuccess = () => resolve(bookmark)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get bookmarks for a document
 */
export async function getDocumentBookmarks(documentId: string): Promise<PDFBookmark[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.BOOKMARKS, 'readonly')
      .objectStore(STORES.BOOKMARKS)
      .index('documentId')
      .getAll(documentId)

    request.onsuccess = () => {
      const bookmarks = request.result || []
      bookmarks.sort((a, b) => a.pageNumber - b.pageNumber)
      resolve(bookmarks)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete a bookmark
 */
export async function deleteBookmark(id: string): Promise<boolean> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.BOOKMARKS, 'readwrite')
      .objectStore(STORES.BOOKMARKS)
      .delete(id)

    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// READING PROGRESS
// ============================================================================

/**
 * Save reading progress
 */
export async function saveReadingProgress(progress: PDFReadingProgress): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.PROGRESS, 'readwrite')
      .objectStore(STORES.PROGRESS)
      .put(progress)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get reading progress
 */
export async function getReadingProgress(documentId: string): Promise<PDFReadingProgress | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.PROGRESS, 'readonly')
      .objectStore(STORES.PROGRESS)
      .get(documentId)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// EVENTS
// ============================================================================

type PDFEventType = 'stored' | 'updated' | 'deleted' | 'annotation-added' | 'annotation-updated' | 'annotation-deleted'

function dispatchPDFEvent(type: PDFEventType, data: any): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('pdf-storage-changed', {
      detail: { type, data },
    })
  )
}

/**
 * Subscribe to PDF storage changes
 */
export function onPDFStorageChange(
  callback: (event: { type: PDFEventType; data: any }) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = (e: CustomEvent) => callback(e.detail)
  window.addEventListener('pdf-storage-changed' as any, handler as EventListener)

  return () => {
    window.removeEventListener('pdf-storage-changed' as any, handler as EventListener)
  }
}
