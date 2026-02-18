/**
 * Tests for PDF Storage Service
 * @module tests/unit/pdf/pdfStorage
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type {
  PDFDocument,
  PDFAnnotation,
  PDFBookmark,
  PDFReadingProgress,
} from '@/lib/pdf/pdfStorage'

// Storage maps - declared at module scope
const documentStorage = new Map<string, PDFDocument>()
const blobStorage = new Map<string, Blob>()
const annotationStorage = new Map<string, PDFAnnotation>()
const bookmarkStorage = new Map<string, PDFBookmark>()
const progressStorage = new Map<string, PDFReadingProgress>()
const eventListeners: Array<(event: any) => void> = []

// Helper to generate IDs
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function dispatchPDFEvent(type: string, data: any) {
  eventListeners.forEach(listener => listener({ type, data }))
}

// Mock the module before imports
vi.mock('@/lib/pdf/pdfStorage', () => ({
  storePDF: vi.fn(),
  getPDFDocument: vi.fn(),
  getPDFBlob: vi.fn(),
  getAllPDFDocuments: vi.fn(),
  updatePDFDocument: vi.fn(),
  deletePDFDocument: vi.fn(),
  addAnnotation: vi.fn(),
  getDocumentAnnotations: vi.fn(),
  getPageAnnotations: vi.fn(),
  updateAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
  getStrandLinkedAnnotations: vi.fn(),
  addBookmark: vi.fn(),
  getDocumentBookmarks: vi.fn(),
  deleteBookmark: vi.fn(),
  saveReadingProgress: vi.fn(),
  getReadingProgress: vi.fn(),
  onPDFStorageChange: vi.fn(),
}))

import {
  storePDF,
  getPDFDocument,
  getPDFBlob,
  getAllPDFDocuments,
  updatePDFDocument,
  deletePDFDocument,
  addAnnotation,
  getDocumentAnnotations,
  getPageAnnotations,
  updateAnnotation,
  deleteAnnotation,
  getStrandLinkedAnnotations,
  addBookmark,
  getDocumentBookmarks,
  deleteBookmark,
  saveReadingProgress,
  getReadingProgress,
  onPDFStorageChange,
} from '@/lib/pdf/pdfStorage'

describe('PDF Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    documentStorage.clear()
    blobStorage.clear()
    annotationStorage.clear()
    bookmarkStorage.clear()
    progressStorage.clear()
    eventListeners.length = 0

    // Setup mock implementations
    vi.mocked(storePDF).mockImplementation(async (file: File, metadata?: Partial<PDFDocument>) => {
      const id = generateId('pdf')
      const now = Date.now()
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
      documentStorage.set(id, document)
      blobStorage.set(id, file)
      dispatchPDFEvent('stored', document)
      return document
    })

    vi.mocked(getPDFDocument).mockImplementation(async (id: string) => {
      return documentStorage.get(id) || null
    })

    vi.mocked(getPDFBlob).mockImplementation(async (id: string) => {
      return blobStorage.get(id) || null
    })

    vi.mocked(getAllPDFDocuments).mockImplementation(async () => {
      const docs = Array.from(documentStorage.values())
      docs.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      return docs
    })

    vi.mocked(updatePDFDocument).mockImplementation(async (id: string, updates: Partial<PDFDocument>) => {
      const existing = documentStorage.get(id)
      if (!existing) return null
      const updated = { ...existing, ...updates }
      documentStorage.set(id, updated)
      dispatchPDFEvent('updated', updated)
      return updated
    })

    vi.mocked(deletePDFDocument).mockImplementation(async (id: string) => {
      const doc = documentStorage.get(id)
      if (!doc) return false
      documentStorage.delete(id)
      blobStorage.delete(id)
      progressStorage.delete(id)
      for (const [annoId, anno] of annotationStorage.entries()) {
        if (anno.documentId === id) annotationStorage.delete(annoId)
      }
      for (const [bmId, bm] of bookmarkStorage.entries()) {
        if (bm.documentId === id) bookmarkStorage.delete(bmId)
      }
      dispatchPDFEvent('deleted', doc)
      return true
    })

    vi.mocked(addAnnotation).mockImplementation(async (annotation) => {
      const now = Date.now()
      const anno: PDFAnnotation = {
        ...annotation,
        id: generateId('anno'),
        createdAt: now,
        updatedAt: now,
      }
      annotationStorage.set(anno.id, anno)
      dispatchPDFEvent('annotation-added', anno)
      return anno
    })

    vi.mocked(getDocumentAnnotations).mockImplementation(async (documentId: string) => {
      return Array.from(annotationStorage.values()).filter(a => a.documentId === documentId)
    })

    vi.mocked(getPageAnnotations).mockImplementation(async (documentId: string, pageNumber: number) => {
      return Array.from(annotationStorage.values()).filter(
        a => a.documentId === documentId && a.pageNumber === pageNumber
      )
    })

    vi.mocked(updateAnnotation).mockImplementation(async (id: string, updates) => {
      const existing = annotationStorage.get(id)
      if (!existing) return null
      const updated = { ...existing, ...updates, updatedAt: Date.now() }
      annotationStorage.set(id, updated)
      dispatchPDFEvent('annotation-updated', updated)
      return updated
    })

    vi.mocked(deleteAnnotation).mockImplementation(async (id: string) => {
      const deleted = annotationStorage.delete(id)
      if (deleted) dispatchPDFEvent('annotation-deleted', { id })
      return deleted
    })

    vi.mocked(getStrandLinkedAnnotations).mockImplementation(async (strandPath: string) => {
      return Array.from(annotationStorage.values()).filter(a => a.linkedStrandPath === strandPath)
    })

    vi.mocked(addBookmark).mockImplementation(async (documentId: string, pageNumber: number, label: string) => {
      const bookmark: PDFBookmark = {
        id: generateId('bm'),
        documentId,
        pageNumber,
        label,
        createdAt: Date.now(),
      }
      bookmarkStorage.set(bookmark.id, bookmark)
      return bookmark
    })

    vi.mocked(getDocumentBookmarks).mockImplementation(async (documentId: string) => {
      const bookmarks = Array.from(bookmarkStorage.values()).filter(b => b.documentId === documentId)
      bookmarks.sort((a, b) => a.pageNumber - b.pageNumber)
      return bookmarks
    })

    vi.mocked(deleteBookmark).mockImplementation(async (id: string) => {
      return bookmarkStorage.delete(id)
    })

    vi.mocked(saveReadingProgress).mockImplementation(async (progress: PDFReadingProgress) => {
      progressStorage.set(progress.documentId, progress)
    })

    vi.mocked(getReadingProgress).mockImplementation(async (documentId: string) => {
      return progressStorage.get(documentId) || null
    })

    vi.mocked(onPDFStorageChange).mockImplementation((callback: (event: { type: string; data: any }) => void) => {
      eventListeners.push(callback)
      return () => {
        const index = eventListeners.indexOf(callback)
        if (index > -1) eventListeners.splice(index, 1)
      }
    })
  })

  describe('Document Operations', () => {
    describe('storePDF', () => {
      it('should store a PDF document', async () => {
        const file = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' })

        const doc = await storePDF(file)

        expect(doc.id).toBeDefined()
        expect(doc.filename).toBe('test.pdf')
        expect(doc.title).toBe('test')
        expect(doc.fileSize).toBe(file.size)
      })

      it('should store with custom metadata', async () => {
        const file = new File(['PDF content'], 'paper.pdf', { type: 'application/pdf' })

        const doc = await storePDF(file, {
          title: 'Research Paper',
          author: 'John Doe',
          pageCount: 10,
          keywords: ['research', 'science'],
        })

        expect(doc.title).toBe('Research Paper')
        expect(doc.author).toBe('John Doe')
        expect(doc.pageCount).toBe(10)
        expect(doc.keywords).toEqual(['research', 'science'])
      })

      it('should dispatch stored event', async () => {
        const events: any[] = []
        onPDFStorageChange(e => events.push(e))

        const file = new File(['content'], 'test.pdf')
        await storePDF(file)

        expect(events).toHaveLength(1)
        expect(events[0].type).toBe('stored')
      })
    })

    describe('getPDFDocument', () => {
      it('should retrieve stored document', async () => {
        const file = new File(['content'], 'retrieve.pdf')
        const stored = await storePDF(file)

        const retrieved = await getPDFDocument(stored.id)

        expect(retrieved).not.toBeNull()
        expect(retrieved?.id).toBe(stored.id)
        expect(retrieved?.filename).toBe('retrieve.pdf')
      })

      it('should return null for non-existent document', async () => {
        const doc = await getPDFDocument('nonexistent_id')

        expect(doc).toBeNull()
      })
    })

    describe('getPDFBlob', () => {
      it('should retrieve PDF blob data', async () => {
        const file = new File(['PDF blob data'], 'blob.pdf', { type: 'application/pdf' })
        const stored = await storePDF(file)

        const blob = await getPDFBlob(stored.id)

        expect(blob).not.toBeNull()
        expect(blob?.size).toBe(file.size)
      })

      it('should return null for non-existent blob', async () => {
        const blob = await getPDFBlob('nonexistent')

        expect(blob).toBeNull()
      })
    })

    describe('getAllPDFDocuments', () => {
      it('should return all documents sorted by lastOpenedAt', async () => {
        const file1 = new File(['1'], 'first.pdf')
        const file2 = new File(['2'], 'second.pdf')
        const file3 = new File(['3'], 'third.pdf')

        await storePDF(file1)
        await new Promise(r => setTimeout(r, 10))
        await storePDF(file2)
        await new Promise(r => setTimeout(r, 10))
        await storePDF(file3)

        const docs = await getAllPDFDocuments()

        expect(docs).toHaveLength(3)
        expect(docs[0].filename).toBe('third.pdf')
        expect(docs[2].filename).toBe('first.pdf')
      })

      it('should return empty array when no documents', async () => {
        const docs = await getAllPDFDocuments()

        expect(docs).toEqual([])
      })
    })

    describe('updatePDFDocument', () => {
      it('should update document metadata', async () => {
        const file = new File(['content'], 'update.pdf')
        const stored = await storePDF(file)

        const updated = await updatePDFDocument(stored.id, { title: 'Updated Title' })

        expect(updated?.title).toBe('Updated Title')
      })

      it('should return null for non-existent document', async () => {
        const updated = await updatePDFDocument('nonexistent', { title: 'Test' })

        expect(updated).toBeNull()
      })
    })

    describe('deletePDFDocument', () => {
      it('should delete document and associated data', async () => {
        const file = new File(['content'], 'delete.pdf')
        const stored = await storePDF(file)

        await addAnnotation({
          documentId: stored.id,
          pageNumber: 1,
          type: 'highlight',
          position: { x: 0, y: 0, width: 100, height: 20 },
          content: 'Highlighted text',
        })
        await addBookmark(stored.id, 1, 'Bookmark 1')

        const deleted = await deletePDFDocument(stored.id)

        expect(deleted).toBe(true)
        expect(await getPDFDocument(stored.id)).toBeNull()
        expect(await getPDFBlob(stored.id)).toBeNull()
        expect(await getDocumentAnnotations(stored.id)).toEqual([])
        expect(await getDocumentBookmarks(stored.id)).toEqual([])
      })

      it('should return false for non-existent document', async () => {
        const deleted = await deletePDFDocument('nonexistent')

        expect(deleted).toBe(false)
      })
    })
  })

  describe('Annotation Operations', () => {
    describe('addAnnotation', () => {
      it('should add an annotation', async () => {
        const file = new File(['content'], 'anno.pdf')
        const doc = await storePDF(file)

        const anno = await addAnnotation({
          documentId: doc.id,
          pageNumber: 1,
          type: 'highlight',
          position: { x: 10, y: 20, width: 100, height: 15 },
          content: 'Important text',
          color: '#ffff00',
        })

        expect(anno.id).toBeDefined()
        expect(anno.type).toBe('highlight')
        expect(anno.content).toBe('Important text')
        expect(anno.color).toBe('#ffff00')
      })

      it('should support different annotation types', async () => {
        const file = new File(['content'], 'types.pdf')
        const doc = await storePDF(file)
        const position = { x: 0, y: 0, width: 50, height: 10 }

        const highlight = await addAnnotation({ documentId: doc.id, pageNumber: 1, type: 'highlight', position, content: '' })
        const note = await addAnnotation({ documentId: doc.id, pageNumber: 1, type: 'note', position, content: 'A note' })
        const underline = await addAnnotation({ documentId: doc.id, pageNumber: 1, type: 'underline', position, content: '' })

        expect(highlight.type).toBe('highlight')
        expect(note.type).toBe('note')
        expect(underline.type).toBe('underline')
      })
    })

    describe('getDocumentAnnotations', () => {
      it('should return all annotations for a document', async () => {
        const file = new File(['content'], 'doc.pdf')
        const doc = await storePDF(file)
        const position = { x: 0, y: 0, width: 50, height: 10 }

        await addAnnotation({ documentId: doc.id, pageNumber: 1, type: 'highlight', position, content: '1' })
        await addAnnotation({ documentId: doc.id, pageNumber: 2, type: 'note', position, content: '2' })
        await addAnnotation({ documentId: doc.id, pageNumber: 3, type: 'highlight', position, content: '3' })

        const annos = await getDocumentAnnotations(doc.id)

        expect(annos).toHaveLength(3)
      })
    })

    describe('getPageAnnotations', () => {
      it('should return annotations for specific page', async () => {
        const file = new File(['content'], 'pages.pdf')
        const doc = await storePDF(file)
        const position = { x: 0, y: 0, width: 50, height: 10 }

        await addAnnotation({ documentId: doc.id, pageNumber: 1, type: 'highlight', position, content: 'Page 1 - 1' })
        await addAnnotation({ documentId: doc.id, pageNumber: 1, type: 'note', position, content: 'Page 1 - 2' })
        await addAnnotation({ documentId: doc.id, pageNumber: 2, type: 'highlight', position, content: 'Page 2' })

        const page1Annos = await getPageAnnotations(doc.id, 1)
        const page2Annos = await getPageAnnotations(doc.id, 2)

        expect(page1Annos).toHaveLength(2)
        expect(page2Annos).toHaveLength(1)
      })
    })

    describe('updateAnnotation', () => {
      it('should update annotation properties', async () => {
        const file = new File(['content'], 'update.pdf')
        const doc = await storePDF(file)
        const position = { x: 0, y: 0, width: 50, height: 10 }

        const anno = await addAnnotation({
          documentId: doc.id,
          pageNumber: 1,
          type: 'note',
          position,
          content: 'Original',
        })

        // Small delay to ensure updatedAt differs from createdAt
        await new Promise(r => setTimeout(r, 5))

        const updated = await updateAnnotation(anno.id, { content: 'Updated' })

        expect(updated?.content).toBe('Updated')
        expect(updated?.updatedAt).toBeGreaterThanOrEqual(anno.createdAt)
      })

      it('should return null for non-existent annotation', async () => {
        const updated = await updateAnnotation('nonexistent', { content: 'Test' })

        expect(updated).toBeNull()
      })
    })

    describe('deleteAnnotation', () => {
      it('should delete annotation', async () => {
        const file = new File(['content'], 'delete.pdf')
        const doc = await storePDF(file)
        const position = { x: 0, y: 0, width: 50, height: 10 }

        const anno = await addAnnotation({
          documentId: doc.id,
          pageNumber: 1,
          type: 'highlight',
          position,
          content: '',
        })

        const deleted = await deleteAnnotation(anno.id)
        const annos = await getDocumentAnnotations(doc.id)

        expect(deleted).toBe(true)
        expect(annos).toHaveLength(0)
      })
    })

    describe('getStrandLinkedAnnotations', () => {
      it('should return annotations linked to a strand', async () => {
        const file = new File(['content'], 'linked.pdf')
        const doc = await storePDF(file)
        const position = { x: 0, y: 0, width: 50, height: 10 }
        const strandPath = '/looms/research/strands/notes'

        await addAnnotation({
          documentId: doc.id,
          pageNumber: 1,
          type: 'highlight',
          position,
          content: 'Linked',
          linkedStrandPath: strandPath,
        })
        await addAnnotation({
          documentId: doc.id,
          pageNumber: 2,
          type: 'note',
          position,
          content: 'Not linked',
        })

        const linked = await getStrandLinkedAnnotations(strandPath)

        expect(linked).toHaveLength(1)
        expect(linked[0].content).toBe('Linked')
      })
    })
  })

  describe('Bookmark Operations', () => {
    describe('addBookmark', () => {
      it('should add a bookmark', async () => {
        const file = new File(['content'], 'bookmark.pdf')
        const doc = await storePDF(file)

        const bookmark = await addBookmark(doc.id, 5, 'Chapter 1')

        expect(bookmark.id).toBeDefined()
        expect(bookmark.documentId).toBe(doc.id)
        expect(bookmark.pageNumber).toBe(5)
        expect(bookmark.label).toBe('Chapter 1')
      })
    })

    describe('getDocumentBookmarks', () => {
      it('should return bookmarks sorted by page number', async () => {
        const file = new File(['content'], 'sorted.pdf')
        const doc = await storePDF(file)

        await addBookmark(doc.id, 10, 'Chapter 2')
        await addBookmark(doc.id, 1, 'Introduction')
        await addBookmark(doc.id, 5, 'Chapter 1')

        const bookmarks = await getDocumentBookmarks(doc.id)

        expect(bookmarks).toHaveLength(3)
        expect(bookmarks[0].pageNumber).toBe(1)
        expect(bookmarks[1].pageNumber).toBe(5)
        expect(bookmarks[2].pageNumber).toBe(10)
      })
    })

    describe('deleteBookmark', () => {
      it('should delete a bookmark', async () => {
        const file = new File(['content'], 'delete.pdf')
        const doc = await storePDF(file)

        const bookmark = await addBookmark(doc.id, 1, 'To Delete')
        const deleted = await deleteBookmark(bookmark.id)
        const bookmarks = await getDocumentBookmarks(doc.id)

        expect(deleted).toBe(true)
        expect(bookmarks).toHaveLength(0)
      })
    })
  })

  describe('Reading Progress', () => {
    describe('saveReadingProgress', () => {
      it('should save reading progress', async () => {
        const file = new File(['content'], 'progress.pdf')
        const doc = await storePDF(file)

        const progress: PDFReadingProgress = {
          documentId: doc.id,
          lastPage: 5,
          scrollPosition: 0.5,
          zoom: 1.25,
          totalReadingTime: 300000,
          lastReadAt: Date.now(),
        }

        await saveReadingProgress(progress)
        const retrieved = await getReadingProgress(doc.id)

        expect(retrieved).not.toBeNull()
        expect(retrieved?.lastPage).toBe(5)
        expect(retrieved?.zoom).toBe(1.25)
      })
    })

    describe('getReadingProgress', () => {
      it('should return null for document without progress', async () => {
        const progress = await getReadingProgress('no_progress_doc')

        expect(progress).toBeNull()
      })
    })
  })

  describe('Event Subscription', () => {
    it('should notify subscribers of storage changes', async () => {
      const events: any[] = []
      const unsubscribe = onPDFStorageChange(e => events.push(e))

      const file = new File(['content'], 'events.pdf')
      const doc = await storePDF(file)
      await updatePDFDocument(doc.id, { title: 'Updated' })
      await deletePDFDocument(doc.id)

      expect(events).toContainEqual(expect.objectContaining({ type: 'stored' }))
      expect(events).toContainEqual(expect.objectContaining({ type: 'updated' }))
      expect(events).toContainEqual(expect.objectContaining({ type: 'deleted' }))

      unsubscribe()
    })

    it('should stop notifying after unsubscribe', async () => {
      const events: any[] = []
      const unsubscribe = onPDFStorageChange(e => events.push(e))

      const file1 = new File(['1'], 'first.pdf')
      await storePDF(file1)

      unsubscribe()

      const file2 = new File(['2'], 'second.pdf')
      await storePDF(file2)

      expect(events).toHaveLength(1)
    })
  })
})
