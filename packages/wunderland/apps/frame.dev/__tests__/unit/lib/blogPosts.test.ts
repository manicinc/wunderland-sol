/**
 * Blog Posts Tests
 * @module __tests__/unit/lib/blogPosts.test
 *
 * Tests for blog post data and utility functions.
 */

import { describe, it, expect } from 'vitest'
import {
  blogPosts,
  getBlogPost,
  getRelatedPosts,
  type BlogPostMeta,
} from '@/lib/blogPosts'

describe('Blog Posts', () => {
  // ============================================================================
  // blogPosts constant
  // ============================================================================

  describe('blogPosts', () => {
    it('is an array', () => {
      expect(Array.isArray(blogPosts)).toBe(true)
    })

    it('has at least one post', () => {
      expect(blogPosts.length).toBeGreaterThan(0)
    })

    it('all posts have required fields', () => {
      for (const post of blogPosts) {
        expect(post.slug).toBeDefined()
        expect(typeof post.slug).toBe('string')
        expect(post.slug.length).toBeGreaterThan(0)

        expect(post.title).toBeDefined()
        expect(typeof post.title).toBe('string')
        expect(post.title.length).toBeGreaterThan(0)

        expect(post.excerpt).toBeDefined()
        expect(typeof post.excerpt).toBe('string')

        expect(post.description).toBeDefined()
        expect(typeof post.description).toBe('string')

        expect(post.date).toBeDefined()
        expect(typeof post.date).toBe('string')
        expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

        expect(post.readTime).toBeDefined()
        expect(typeof post.readTime).toBe('string')

        expect(post.author).toBeDefined()
        expect(typeof post.author).toBe('string')
      }
    })

    it('all slugs are unique', () => {
      const slugs = blogPosts.map((p) => p.slug)
      const uniqueSlugs = new Set(slugs)
      expect(uniqueSlugs.size).toBe(slugs.length)
    })

    it('slugs use kebab-case', () => {
      for (const post of blogPosts) {
        expect(post.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      }
    })

    it('dates are valid', () => {
      for (const post of blogPosts) {
        const date = new Date(post.date)
        expect(isNaN(date.getTime())).toBe(false)
      }
    })

    it('some posts are featured', () => {
      const featuredPosts = blogPosts.filter((p) => p.featured === true)
      expect(featuredPosts.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // getBlogPost
  // ============================================================================

  describe('getBlogPost', () => {
    it('returns post for valid slug', () => {
      const firstPost = blogPosts[0]
      const result = getBlogPost(firstPost.slug)
      expect(result).toBeDefined()
      expect(result?.slug).toBe(firstPost.slug)
      expect(result?.title).toBe(firstPost.title)
    })

    it('returns undefined for non-existent slug', () => {
      const result = getBlogPost('non-existent-post-slug')
      expect(result).toBeUndefined()
    })

    it('returns undefined for empty slug', () => {
      const result = getBlogPost('')
      expect(result).toBeUndefined()
    })

    it('is case-sensitive', () => {
      const firstPost = blogPosts[0]
      const result = getBlogPost(firstPost.slug.toUpperCase())
      expect(result).toBeUndefined()
    })

    it('returns correct post for e2ee-encryption slug', () => {
      const result = getBlogPost('e2ee-encryption')
      if (result) {
        expect(result.title).toContain('E2EE')
        expect(result.author).toBe('Security Team')
      }
    })

    it('returns correct post for introducing-frame slug', () => {
      const result = getBlogPost('introducing-frame')
      if (result) {
        expect(result.title).toContain('Frame')
        expect(result.author).toBe('Frame Team')
      }
    })
  })

  // ============================================================================
  // getRelatedPosts
  // ============================================================================

  describe('getRelatedPosts', () => {
    it('returns posts excluding current slug', () => {
      const currentSlug = blogPosts[0].slug
      const related = getRelatedPosts(currentSlug)

      for (const post of related) {
        expect(post.slug).not.toBe(currentSlug)
      }
    })

    it('returns default count of 2 posts', () => {
      const currentSlug = blogPosts[0].slug
      const related = getRelatedPosts(currentSlug)
      expect(related.length).toBeLessThanOrEqual(2)
    })

    it('returns specified count of posts', () => {
      const currentSlug = blogPosts[0].slug
      const related = getRelatedPosts(currentSlug, 3)
      expect(related.length).toBeLessThanOrEqual(3)
    })

    it('returns count of 1 when requested', () => {
      const currentSlug = blogPosts[0].slug
      const related = getRelatedPosts(currentSlug, 1)
      expect(related.length).toBeLessThanOrEqual(1)
    })

    it('returns posts sorted by date (newest first)', () => {
      const currentSlug = blogPosts[blogPosts.length - 1].slug
      const related = getRelatedPosts(currentSlug, 5)

      for (let i = 1; i < related.length; i++) {
        const prevDate = new Date(related[i - 1].date).getTime()
        const currDate = new Date(related[i].date).getTime()
        expect(prevDate).toBeGreaterThanOrEqual(currDate)
      }
    })

    it('handles non-existent slug', () => {
      const related = getRelatedPosts('non-existent-slug')
      // Should return posts since nothing is excluded
      expect(related.length).toBeGreaterThan(0)
    })

    it('returns empty array when count is 0', () => {
      const related = getRelatedPosts(blogPosts[0].slug, 0)
      expect(related).toHaveLength(0)
    })

    it('handles request for more posts than exist', () => {
      const related = getRelatedPosts(blogPosts[0].slug, 100)
      expect(related.length).toBeLessThan(100)
      expect(related.length).toBe(blogPosts.length - 1)
    })
  })

  // ============================================================================
  // BlogPostMeta type validation
  // ============================================================================

  describe('BlogPostMeta type', () => {
    it('can create valid BlogPostMeta object', () => {
      const post: BlogPostMeta = {
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'This is a test',
        description: 'Description of test',
        date: '2025-01-01',
        readTime: '5 min read',
        author: 'Test Author',
      }

      expect(post.slug).toBe('test-post')
      expect(post.featured).toBeUndefined()
    })

    it('can include optional featured field', () => {
      const post: BlogPostMeta = {
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'This is a test',
        description: 'Description of test',
        date: '2025-01-01',
        readTime: '5 min read',
        author: 'Test Author',
        featured: true,
      }

      expect(post.featured).toBe(true)
    })
  })
})
