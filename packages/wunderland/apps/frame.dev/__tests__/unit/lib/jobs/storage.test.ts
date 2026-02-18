/**
 * Job Storage System Tests
 * @module __tests__/unit/lib/jobs/storage.test
 *
 * Tests for IndexedDB job persistence and batch operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { JobRecord, JobStatus, GeneratedImageRecord } from '@/lib/jobs/storage'

// Mock idb
vi.mock('idb', () => ({
  openDB: vi.fn(() => null),
}))

describe('Job Storage', () => {
  beforeEach(() => {
    vi.resetModules()
    // Reset global store
    const globalAny = globalThis as unknown as { __codexJobsStore?: unknown }
    delete globalAny.__codexJobsStore
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // JobRecord type
  // ============================================================================

  describe('JobRecord type', () => {
    it('can create valid job record', () => {
      const job: JobRecord = {
        id: 'job-123',
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Test Book',
        totalItems: 10,
        completedItems: 0,
        currentBatch: 1,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.5,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(job.id).toBe('job-123')
      expect(job.status).toBe('pending')
      expect(job.projectTitle).toBe('Test Book')
    })

    it('supports optional style memory', () => {
      const job: JobRecord = {
        id: 'job-456',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Style Test',
        totalItems: 5,
        completedItems: 2,
        currentBatch: 1,
        batchSize: 5,
        provider: 'replicate',
        styleId: 'watercolor',
        styleMemory: JSON.stringify({ characters: [] }),
        estimatedCost: 2.0,
        actualCost: 0.8,
        imageIds: ['img-1', 'img-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(job.styleId).toBe('watercolor')
      expect(job.styleMemory).toBeDefined()
    })

    it('supports all status values', () => {
      const statuses: JobStatus[] = ['pending', 'running', 'paused', 'batch-complete', 'completed', 'cancelled', 'failed']

      statuses.forEach((status) => {
        const job: JobRecord = {
          id: 'test',
          type: 'illustration-generation',
          status,
          projectTitle: 'Test',
          totalItems: 1,
          completedItems: 0,
          currentBatch: 1,
          batchSize: 1,
          provider: 'openai',
          estimatedCost: 0,
          actualCost: 0,
          imageIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        expect(job.status).toBe(status)
      })
    })

    it('supports metadata options', () => {
      const job: JobRecord = {
        id: 'job-789',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'HD Book',
        totalItems: 10,
        completedItems: 0,
        currentBatch: 1,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 5.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          quality: 'hd',
          size: '1792x1024',
          costLimit: 10,
          smartSkip: true,
          skipThreshold: 0.5,
        },
      }

      expect(job.metadata?.quality).toBe('hd')
      expect(job.metadata?.smartSkip).toBe(true)
    })
  })

  // ============================================================================
  // GeneratedImageRecord type
  // ============================================================================

  describe('GeneratedImageRecord type', () => {
    it('can create valid image record', () => {
      const image: GeneratedImageRecord = {
        id: 'img-123',
        jobId: 'job-456',
        url: 'https://example.com/image.png',
        prompt: 'A magical forest',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 0,
        createdAt: new Date(),
      }

      expect(image.id).toBe('img-123')
      expect(image.prompt).toBe('A magical forest')
      expect(image.pageIndex).toBe(0)
    })

    it('supports optional fields', () => {
      const image: GeneratedImageRecord = {
        id: 'img-456',
        jobId: 'job-789',
        url: 'https://example.com/image.png',
        dataUrl: 'data:image/png;base64,abc123',
        prompt: 'A castle',
        enhancedPrompt: 'A medieval castle in watercolor style',
        provider: 'replicate',
        model: 'flux-dev',
        pageIndex: 5,
        chunkId: 'chunk-3',
        seed: 42,
        cost: 0.04,
        createdAt: new Date(),
        characterNames: ['King Arthur', 'Merlin'],
        settingName: 'Camelot',
      }

      expect(image.dataUrl).toBeDefined()
      expect(image.enhancedPrompt).toContain('watercolor')
      expect(image.seed).toBe(42)
      expect(image.characterNames).toContain('King Arthur')
    })
  })

  // ============================================================================
  // isStorageAvailable
  // ============================================================================

  describe('isStorageAvailable', () => {
    it('returns true', async () => {
      const { isStorageAvailable } = await import('@/lib/jobs/storage')
      expect(isStorageAvailable()).toBe(true)
    })
  })

  // ============================================================================
  // createJob
  // ============================================================================

  describe('createJob', () => {
    it('creates a job with auto-generated fields', async () => {
      const { createJob } = await import('@/lib/jobs/storage')

      const job = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Test Book',
        totalItems: 10,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 2.0,
      })

      expect(job.id).toMatch(/^job-/)
      expect(job.completedItems).toBe(0)
      expect(job.currentBatch).toBe(1)
      expect(job.actualCost).toBe(0)
      expect(job.imageIds).toEqual([])
      expect(job.createdAt).toBeDefined()
      expect(job.updatedAt).toBeDefined()
    })

    it('preserves provided values', async () => {
      const { createJob } = await import('@/lib/jobs/storage')

      const job = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'My Novel',
        totalItems: 20,
        batchSize: 10,
        provider: 'replicate',
        styleId: 'anime',
        estimatedCost: 5.0,
      })

      expect(job.projectTitle).toBe('My Novel')
      expect(job.totalItems).toBe(20)
      expect(job.provider).toBe('replicate')
      expect(job.styleId).toBe('anime')
    })
  })

  // ============================================================================
  // getJob
  // ============================================================================

  describe('getJob', () => {
    it('returns undefined for non-existent job', async () => {
      const { getJob } = await import('@/lib/jobs/storage')

      const job = await getJob('non-existent-id')
      expect(job).toBeUndefined()
    })

    it('returns created job', async () => {
      const { createJob, getJob } = await import('@/lib/jobs/storage')

      const created = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Get Test',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      const retrieved = await getJob(created.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.projectTitle).toBe('Get Test')
    })
  })

  // ============================================================================
  // updateJob
  // ============================================================================

  describe('updateJob', () => {
    it('returns undefined for non-existent job', async () => {
      const { updateJob } = await import('@/lib/jobs/storage')

      const result = await updateJob('non-existent-id', { status: 'running' })
      expect(result).toBeUndefined()
    })

    it('updates job fields', async () => {
      const { createJob, updateJob, getJob } = await import('@/lib/jobs/storage')

      const created = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Update Test',
        totalItems: 10,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 2.0,
      })

      await updateJob(created.id, {
        status: 'running',
        completedItems: 3,
        actualCost: 0.6,
      })

      const updated = await getJob(created.id)
      expect(updated?.status).toBe('running')
      expect(updated?.completedItems).toBe(3)
      expect(updated?.actualCost).toBe(0.6)
    })

    it('updates timestamp', async () => {
      const { createJob, updateJob } = await import('@/lib/jobs/storage')

      const created = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Timestamp Test',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      const originalUpdatedAt = created.updatedAt

      // Wait a tiny bit
      await new Promise((r) => setTimeout(r, 10))

      const updated = await updateJob(created.id, { status: 'running' })
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  // ============================================================================
  // deleteJob
  // ============================================================================

  describe('deleteJob', () => {
    it('deletes existing job', async () => {
      const { createJob, deleteJob, getJob } = await import('@/lib/jobs/storage')

      const created = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Delete Test',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      await deleteJob(created.id)

      const retrieved = await getJob(created.id)
      expect(retrieved).toBeUndefined()
    })

    it('does not throw for non-existent job', async () => {
      const { deleteJob } = await import('@/lib/jobs/storage')

      await expect(deleteJob('non-existent-id')).resolves.not.toThrow()
    })
  })

  // ============================================================================
  // getJobs
  // ============================================================================

  describe('getJobs', () => {
    it('returns empty array when no jobs', async () => {
      const { getJobs } = await import('@/lib/jobs/storage')

      const jobs = await getJobs()
      expect(jobs).toEqual([])
    })

    it('returns all created jobs', async () => {
      const { createJob, getJobs } = await import('@/lib/jobs/storage')

      await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Job 1',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      await createJob({
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Job 2',
        totalItems: 10,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 2.0,
      })

      const jobs = await getJobs()
      expect(jobs.length).toBe(2)
    })

    it('filters by status', async () => {
      const { createJob, getJobs, updateJob } = await import('@/lib/jobs/storage')

      const job1 = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Job 1',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Job 2',
        totalItems: 10,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 2.0,
      })

      await updateJob(job1.id, { status: 'running' })

      const pendingJobs = await getJobs('pending')
      expect(pendingJobs.length).toBe(1)
      expect(pendingJobs[0].projectTitle).toBe('Job 2')

      const runningJobs = await getJobs('running')
      expect(runningJobs.length).toBe(1)
      expect(runningJobs[0].projectTitle).toBe('Job 1')
    })
  })

  // ============================================================================
  // getRecentJobs
  // ============================================================================

  describe('getRecentJobs', () => {
    it('returns empty array when no jobs', async () => {
      const { getRecentJobs } = await import('@/lib/jobs/storage')

      const jobs = await getRecentJobs()
      expect(jobs).toEqual([])
    })

    it('returns jobs in reverse chronological order', async () => {
      const { createJob, getRecentJobs } = await import('@/lib/jobs/storage')

      await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'First',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      await new Promise((r) => setTimeout(r, 10))

      await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Second',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      const jobs = await getRecentJobs()
      expect(jobs[0].projectTitle).toBe('Second')
      expect(jobs[1].projectTitle).toBe('First')
    })

    it('respects limit parameter', async () => {
      const { createJob, getRecentJobs } = await import('@/lib/jobs/storage')

      for (let i = 0; i < 5; i++) {
        await createJob({
          type: 'illustration-generation',
          status: 'pending',
          projectTitle: `Job ${i}`,
          totalItems: 5,
          batchSize: 5,
          provider: 'openai',
          estimatedCost: 1.0,
        })
      }

      const jobs = await getRecentJobs(2)
      expect(jobs.length).toBe(2)
    })
  })

  // ============================================================================
  // saveImage / getImage
  // ============================================================================

  describe('saveImage and getImage', () => {
    it('saves and retrieves image', async () => {
      const { saveImage, getImage } = await import('@/lib/jobs/storage')

      const image: GeneratedImageRecord = {
        id: 'img-test-1',
        jobId: 'job-test-1',
        url: 'https://example.com/test.png',
        prompt: 'A test image',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 0,
        createdAt: new Date(),
      }

      await saveImage(image)

      const retrieved = await getImage('img-test-1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.prompt).toBe('A test image')
    })

    it('returns undefined for non-existent image', async () => {
      const { getImage } = await import('@/lib/jobs/storage')

      const image = await getImage('non-existent-id')
      expect(image).toBeUndefined()
    })
  })

  // ============================================================================
  // getJobImages
  // ============================================================================

  describe('getJobImages', () => {
    it('returns empty array when no images', async () => {
      const { getJobImages } = await import('@/lib/jobs/storage')

      const images = await getJobImages('job-123')
      expect(images).toEqual([])
    })

    it('returns images for specific job', async () => {
      const { saveImage, getJobImages } = await import('@/lib/jobs/storage')

      await saveImage({
        id: 'img-1',
        jobId: 'job-1',
        url: 'url1',
        prompt: 'prompt1',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 0,
        createdAt: new Date(),
      })

      await saveImage({
        id: 'img-2',
        jobId: 'job-1',
        url: 'url2',
        prompt: 'prompt2',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 1,
        createdAt: new Date(),
      })

      await saveImage({
        id: 'img-3',
        jobId: 'job-2',
        url: 'url3',
        prompt: 'prompt3',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 0,
        createdAt: new Date(),
      })

      const job1Images = await getJobImages('job-1')
      expect(job1Images.length).toBe(2)

      const job2Images = await getJobImages('job-2')
      expect(job2Images.length).toBe(1)
    })

    it('returns images sorted by page index', async () => {
      const { saveImage, getJobImages } = await import('@/lib/jobs/storage')

      await saveImage({
        id: 'img-3',
        jobId: 'sorted-job',
        url: 'url3',
        prompt: 'prompt3',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 2,
        createdAt: new Date(),
      })

      await saveImage({
        id: 'img-1',
        jobId: 'sorted-job',
        url: 'url1',
        prompt: 'prompt1',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 0,
        createdAt: new Date(),
      })

      await saveImage({
        id: 'img-2',
        jobId: 'sorted-job',
        url: 'url2',
        prompt: 'prompt2',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 1,
        createdAt: new Date(),
      })

      const images = await getJobImages('sorted-job')
      expect(images[0].pageIndex).toBe(0)
      expect(images[1].pageIndex).toBe(1)
      expect(images[2].pageIndex).toBe(2)
    })
  })

  // ============================================================================
  // deleteImage
  // ============================================================================

  describe('deleteImage', () => {
    it('deletes existing image', async () => {
      const { saveImage, deleteImage, getImage } = await import('@/lib/jobs/storage')

      await saveImage({
        id: 'img-del',
        jobId: 'job-del',
        url: 'url',
        prompt: 'prompt',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 0,
        createdAt: new Date(),
      })

      await deleteImage('img-del')

      const image = await getImage('img-del')
      expect(image).toBeUndefined()
    })
  })

  // ============================================================================
  // getNextBatch
  // ============================================================================

  describe('getNextBatch', () => {
    it('returns first batch for new job', async () => {
      const { getNextBatch } = await import('@/lib/jobs/storage')

      const job: JobRecord = {
        id: 'job-1',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Test',
        totalItems: 10,
        completedItems: 0,
        currentBatch: 1,
        batchSize: 3,
        provider: 'openai',
        estimatedCost: 1.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const items = [
        { id: '1', content: 'content 1' },
        { id: '2', content: 'content 2' },
        { id: '3', content: 'content 3' },
        { id: '4', content: 'content 4' },
        { id: '5', content: 'content 5' },
      ]

      const batch = getNextBatch(job, items)
      expect(batch.length).toBe(3)
      expect(batch[0].id).toBe('1')
      expect(batch[0].index).toBe(0)
    })

    it('returns next batch after completion', async () => {
      const { getNextBatch } = await import('@/lib/jobs/storage')

      const job: JobRecord = {
        id: 'job-1',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Test',
        totalItems: 10,
        completedItems: 3,
        currentBatch: 2,
        batchSize: 3,
        provider: 'openai',
        estimatedCost: 1.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const items = [
        { id: '1', content: 'content 1' },
        { id: '2', content: 'content 2' },
        { id: '3', content: 'content 3' },
        { id: '4', content: 'content 4' },
        { id: '5', content: 'content 5' },
      ]

      const batch = getNextBatch(job, items)
      expect(batch.length).toBe(2)
      expect(batch[0].id).toBe('4')
      expect(batch[0].index).toBe(3)
    })

    it('returns partial batch at end', async () => {
      const { getNextBatch } = await import('@/lib/jobs/storage')

      const job: JobRecord = {
        id: 'job-1',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Test',
        totalItems: 5,
        completedItems: 4,
        currentBatch: 2,
        batchSize: 3,
        provider: 'openai',
        estimatedCost: 1.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const items = [
        { id: '1', content: 'content 1' },
        { id: '2', content: 'content 2' },
        { id: '3', content: 'content 3' },
        { id: '4', content: 'content 4' },
        { id: '5', content: 'content 5' },
      ]

      const batch = getNextBatch(job, items)
      expect(batch.length).toBe(1)
      expect(batch[0].id).toBe('5')
    })
  })

  // ============================================================================
  // isBatchComplete
  // ============================================================================

  describe('isBatchComplete', () => {
    it('returns false when batch not complete', async () => {
      const { isBatchComplete } = await import('@/lib/jobs/storage')

      const job: JobRecord = {
        id: 'job-1',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Test',
        totalItems: 10,
        completedItems: 2,
        currentBatch: 1,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isBatchComplete(job)).toBe(false)
    })

    it('returns true when batch is complete', async () => {
      const { isBatchComplete } = await import('@/lib/jobs/storage')

      const job: JobRecord = {
        id: 'job-1',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Test',
        totalItems: 10,
        completedItems: 5,
        currentBatch: 1,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isBatchComplete(job)).toBe(true)
    })

    it('returns true when past batch end', async () => {
      const { isBatchComplete } = await import('@/lib/jobs/storage')

      const job: JobRecord = {
        id: 'job-1',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Test',
        totalItems: 10,
        completedItems: 7,
        currentBatch: 1,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isBatchComplete(job)).toBe(true)
    })
  })

  // ============================================================================
  // isJobComplete
  // ============================================================================

  describe('isJobComplete', () => {
    it('returns false when not all items complete', async () => {
      const { isJobComplete } = await import('@/lib/jobs/storage')

      const job: JobRecord = {
        id: 'job-1',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Test',
        totalItems: 10,
        completedItems: 5,
        currentBatch: 1,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isJobComplete(job)).toBe(false)
    })

    it('returns true when all items complete', async () => {
      const { isJobComplete } = await import('@/lib/jobs/storage')

      const job: JobRecord = {
        id: 'job-1',
        type: 'illustration-generation',
        status: 'running',
        projectTitle: 'Test',
        totalItems: 10,
        completedItems: 10,
        currentBatch: 2,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
        actualCost: 0,
        imageIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isJobComplete(job)).toBe(true)
    })
  })

  // ============================================================================
  // getStorageStats
  // ============================================================================

  describe('getStorageStats', () => {
    it('returns zero counts when empty', async () => {
      const { getStorageStats } = await import('@/lib/jobs/storage')

      const stats = await getStorageStats()
      expect(stats.jobCount).toBe(0)
      expect(stats.imageCount).toBe(0)
      expect(stats.pendingJobs).toBe(0)
      expect(stats.runningJobs).toBe(0)
      expect(stats.completedJobs).toBe(0)
    })

    it('counts jobs correctly', async () => {
      const { createJob, updateJob, getStorageStats } = await import('@/lib/jobs/storage')

      const job1 = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Job 1',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Job 2',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      await updateJob(job1.id, { status: 'running' })

      const stats = await getStorageStats()
      expect(stats.jobCount).toBe(2)
      expect(stats.pendingJobs).toBe(1)
      expect(stats.runningJobs).toBe(1)
    })

    it('counts images correctly', async () => {
      const { saveImage, getStorageStats } = await import('@/lib/jobs/storage')

      await saveImage({
        id: 'img-1',
        jobId: 'job-1',
        url: 'url1',
        prompt: 'prompt1',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 0,
        createdAt: new Date(),
      })

      await saveImage({
        id: 'img-2',
        jobId: 'job-1',
        url: 'url2',
        prompt: 'prompt2',
        provider: 'openai',
        model: 'dall-e-3',
        pageIndex: 1,
        createdAt: new Date(),
      })

      const stats = await getStorageStats()
      expect(stats.imageCount).toBe(2)
    })
  })

  // ============================================================================
  // cleanupOldJobs
  // ============================================================================

  describe('cleanupOldJobs', () => {
    it('returns 0 when no jobs to clean', async () => {
      const { cleanupOldJobs } = await import('@/lib/jobs/storage')

      const count = await cleanupOldJobs()
      expect(count).toBe(0)
    })

    it('does not delete recent completed jobs', async () => {
      const { createJob, updateJob, cleanupOldJobs, getJobs } = await import('@/lib/jobs/storage')

      const job = await createJob({
        type: 'illustration-generation',
        status: 'pending',
        projectTitle: 'Recent Job',
        totalItems: 5,
        batchSize: 5,
        provider: 'openai',
        estimatedCost: 1.0,
      })

      await updateJob(job.id, { status: 'completed' })

      const count = await cleanupOldJobs(30)
      expect(count).toBe(0)

      const jobs = await getJobs()
      expect(jobs.length).toBe(1)
    })
  })
})
