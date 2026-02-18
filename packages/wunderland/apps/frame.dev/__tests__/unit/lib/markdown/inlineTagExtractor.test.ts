/**
 * Unit tests for inlineTagExtractor.ts
 * Tests inline #hashtag extraction from markdown content
 */

import {
    extractInlineTags,
    extractInlineTagNames,
    extractInlineTagsPerBlock,
    hasInlineTags,
} from '@/lib/markdown/inlineTagExtractor'

describe('inlineTagExtractor', () => {
    describe('extractInlineTags', () => {
        it('extracts simple hashtags', () => {
            const content = 'Learn #react and #typescript today'
            const tags = extractInlineTags(content)

            expect(tags).toHaveLength(2)
            expect(tags[0]).toMatchObject({ tag: 'react', confidence: 1.0, source: 'inline' })
            expect(tags[1]).toMatchObject({ tag: 'typescript', confidence: 1.0, source: 'inline' })
        })

        it('normalizes tags to lowercase', () => {
            const content = 'Using #React and #TypeScript'
            const tags = extractInlineTags(content)

            expect(tags.map(t => t.tag)).toEqual(['react', 'typescript'])
        })

        it('handles kebab-case tags', () => {
            const content = 'Build with #clean-code and #best-practices'
            const tags = extractInlineTags(content)

            expect(tags.map(t => t.tag)).toEqual(['clean-code', 'best-practices'])
        })

        it('handles hierarchical tags with slashes', () => {
            const content = 'Learn #web/javascript and #backend/nodejs'
            const tags = extractInlineTags(content)

            expect(tags.map(t => t.tag)).toEqual(['web/javascript', 'backend/nodejs'])
        })

        it('handles underscore tags', () => {
            const content = 'Use #state_management patterns'
            const tags = extractInlineTags(content)

            expect(tags.map(t => t.tag)).toEqual(['state_management'])
        })

        it('ignores tags starting with numbers', () => {
            const content = 'This is #123 not a valid tag but #v2 is'
            const tags = extractInlineTags(content)

            // #123 should be ignored, #v2 should be captured
            expect(tags.map(t => t.tag)).toEqual(['v2'])
        })

        it('ignores markdown heading patterns (h1-h6)', () => {
            const content = 'Section #h1 and #h2 and #h6 but #hello is valid'
            const tags = extractInlineTags(content)

            expect(tags.map(t => t.tag)).toEqual(['hello'])
        })

        it('extracts tags from markdown headings content', () => {
            const content = '## Custom Hooks #advanced\n\nSome content here'
            const tags = extractInlineTags(content)

            expect(tags.map(t => t.tag)).toEqual(['advanced'])
        })

        it('deduplicates repeated tags', () => {
            const content = 'Learn #react today. More about #react tomorrow. #React again.'
            const tags = extractInlineTags(content)

            // Only one 'react' tag
            expect(tags.map(t => t.tag)).toEqual(['react'])
        })

        it('tracks line numbers correctly', () => {
            const content = 'Line 1 #tag1\nLine 2\nLine 3 #tag2'
            const tags = extractInlineTags(content)

            expect(tags[0]).toMatchObject({ tag: 'tag1', lineNumber: 1 })
            expect(tags[1]).toMatchObject({ tag: 'tag2', lineNumber: 3 })
        })

        it('returns empty array for empty content', () => {
            expect(extractInlineTags('')).toEqual([])
            expect(extractInlineTags(null as unknown as string)).toEqual([])
            expect(extractInlineTags(undefined as unknown as string)).toEqual([])
        })

        it('handles multiple tags on same line', () => {
            const content = 'Learn #react #hooks #frontend in one article'
            const tags = extractInlineTags(content)

            expect(tags).toHaveLength(3)
            tags.forEach(t => expect(t.lineNumber).toBe(1))
        })

        it('handles tags at end of line', () => {
            const content = 'Important topic #critical'
            const tags = extractInlineTags(content)

            expect(tags.map(t => t.tag)).toEqual(['critical'])
        })

        it('handles tags at start of line', () => {
            const content = '#important this is tagged'
            const tags = extractInlineTags(content)

            expect(tags.map(t => t.tag)).toEqual(['important'])
        })
    })

    describe('extractInlineTagNames', () => {
        it('returns just tag names without metadata', () => {
            const content = 'Learn #react and #typescript'
            const tagNames = extractInlineTagNames(content)

            expect(tagNames).toEqual(['react', 'typescript'])
        })
    })

    describe('extractInlineTagsPerBlock', () => {
        it('groups tags by block ID', () => {
            const content = 'Block 1 #tag1\n\nBlock 2 #tag2\n\nBlock 3 #tag3'
            const blocks = [
                { id: 'block-1', startLine: 1, endLine: 1 },
                { id: 'block-2', startLine: 3, endLine: 3 },
                { id: 'block-3', startLine: 5, endLine: 5 },
            ]

            const result = extractInlineTagsPerBlock(content, blocks)

            expect(result.get('block-1')?.map(t => t.tag)).toEqual(['tag1'])
            expect(result.get('block-2')?.map(t => t.tag)).toEqual(['tag2'])
            expect(result.get('block-3')?.map(t => t.tag)).toEqual(['tag3'])
        })

        it('assigns blockId to each tag', () => {
            const content = 'Content with #test tag'
            const blocks = [{ id: 'my-block', startLine: 1, endLine: 1 }]

            const result = extractInlineTagsPerBlock(content, blocks)
            const tags = result.get('my-block')

            expect(tags?.[0]).toMatchObject({ tag: 'test', blockId: 'my-block' })
        })

        it('handles tags spanning multiple lines in a block', () => {
            const content = 'Line 1 #tag1\nLine 2\nLine 3 #tag2'
            const blocks = [{ id: 'block-1', startLine: 1, endLine: 3 }]

            const result = extractInlineTagsPerBlock(content, blocks)
            const tags = result.get('block-1')

            expect(tags?.map(t => t.tag)).toEqual(['tag1', 'tag2'])
        })
    })

    describe('hasInlineTags', () => {
        it('returns true for content with tags', () => {
            expect(hasInlineTags('Has #tag here')).toBe(true)
        })

        it('returns false for content without tags', () => {
            expect(hasInlineTags('No tags here')).toBe(false)
        })

        it('returns false for empty content', () => {
            expect(hasInlineTags('')).toBe(false)
            expect(hasInlineTags(null as unknown as string)).toBe(false)
        })

        it('returns false for invalid tag patterns', () => {
            // #123 is not a valid tag (starts with number)
            expect(hasInlineTags('Just #123 here')).toBe(false)
        })
    })
})
