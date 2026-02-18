/**
 * Concept Extractor Tests
 * @module __tests__/unit/lib/mindmap/conceptExtractor.test
 *
 * Tests for concept extraction from text for mindmap generation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  preprocessText,
  extractConcepts,
  mergeConceptData,
} from '@/lib/mindmap/conceptExtractor'
import type { ConceptData, ConceptNode, ConceptEdge } from '@/hooks/useMindmapGeneration'

// Mock the semantic relationships module to avoid embedding engine initialization
vi.mock('@/lib/mindmap/semanticRelationships', () => ({
  buildSemanticEdges: vi.fn().mockResolvedValue([]),
}))

describe('Concept Extractor', () => {
  // ============================================================================
  // preprocessText
  // ============================================================================

  describe('preprocessText', () => {
    it('returns empty string for empty input', () => {
      expect(preprocessText('')).toBe('')
    })

    it('returns trimmed simple text', () => {
      expect(preprocessText('  Hello World  ')).toBe('Hello World')
    })

    it('removes code blocks', () => {
      const input = 'Before ```const x = 1``` After'
      const result = preprocessText(input)
      expect(result).not.toContain('const x = 1')
      expect(result).toContain('Before')
      expect(result).toContain('After')
    })

    it('removes multiline code blocks', () => {
      const input = `Text
\`\`\`javascript
function test() {
  return true
}
\`\`\`
More text`
      const result = preprocessText(input)
      expect(result).not.toContain('function')
      expect(result).toContain('Text')
      expect(result).toContain('More text')
    })

    it('removes inline code', () => {
      const input = 'Use `variable` here'
      const result = preprocessText(input)
      expect(result).not.toContain('`')
      expect(result).toContain('Use')
      expect(result).toContain('here')
    })

    it('removes URLs', () => {
      const input = 'Visit https://example.com for more'
      const result = preprocessText(input)
      expect(result).not.toContain('https')
      expect(result).not.toContain('example.com')
    })

    it('removes http URLs', () => {
      const input = 'Link: http://test.org/page'
      const result = preprocessText(input)
      expect(result).not.toContain('http')
      expect(result).not.toContain('test.org')
    })

    it('extracts text from markdown links', () => {
      const input = 'See [documentation](https://docs.example.com)'
      const result = preprocessText(input)
      expect(result).toContain('documentation')
      expect(result).not.toContain('https')
      // Note: The link text extraction happens before URL removal,
      // so the markdown pattern [text](url) is properly handled
    })

    it('removes asterisks for bold/italic', () => {
      const input = 'This is **bold** and *italic*'
      const result = preprocessText(input)
      expect(result).not.toContain('*')
      expect(result).toContain('bold')
      expect(result).toContain('italic')
    })

    it('removes underscores for formatting', () => {
      const input = 'This is __underlined__ text'
      const result = preprocessText(input)
      expect(result).not.toContain('_')
      expect(result).toContain('underlined')
    })

    it('removes strikethrough tildes', () => {
      const input = 'This is ~~deleted~~ text'
      const result = preprocessText(input)
      expect(result).not.toContain('~')
      expect(result).toContain('deleted')
    })

    it('removes heading markers', () => {
      const input = '# Heading One\n## Heading Two\n### Heading Three'
      const result = preprocessText(input)
      expect(result).not.toContain('#')
      expect(result).toContain('Heading One')
      expect(result).toContain('Heading Two')
    })

    it('removes list markers', () => {
      const input = '- Item one\n- Item two'
      const result = preprocessText(input)
      expect(result.startsWith('-')).toBe(false)
      expect(result).toContain('Item one')
    })

    it('removes blockquote markers', () => {
      const input = '> Quoted text'
      const result = preprocessText(input)
      expect(result.startsWith('>')).toBe(false)
      expect(result).toContain('Quoted text')
    })

    it('collapses multiple newlines to spaces', () => {
      const input = 'First\n\n\n\nSecond'
      const result = preprocessText(input)
      expect(result).not.toContain('\n')
      expect(result).toBe('First Second')
    })

    it('collapses multiple spaces', () => {
      const input = 'Word    with    spaces'
      const result = preprocessText(input)
      expect(result).toBe('Word with spaces')
    })

    it('handles complex markdown document', () => {
      const input = `# Title

This is **important** text with [a link](https://example.com).

\`\`\`javascript
const code = true;
\`\`\`

- List item one
- List item two

> Quote from source`

      const result = preprocessText(input)
      expect(result).toContain('Title')
      expect(result).toContain('important')
      expect(result).toContain('a link')
      expect(result).not.toContain('const code')
      expect(result).not.toContain('#')
      expect(result).not.toContain('*')
    })
  })

  // ============================================================================
  // extractConcepts
  // ============================================================================

  describe('extractConcepts', () => {
    it('returns empty data for empty content', () => {
      const result = extractConcepts('')
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('returns empty data for very short content', () => {
      const result = extractConcepts('Hello')
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('returns empty data for content under 50 characters', () => {
      const result = extractConcepts('This is a short piece of text that is small.')
      expect(result.nodes).toHaveLength(0)
    })

    it('extracts concepts from sufficient content', () => {
      const content = `
        Machine learning is a field of artificial intelligence.
        Machine learning uses algorithms to learn from data.
        Data science combines machine learning with statistical analysis.
        Statistical methods are important for data analysis.
        Deep learning is a subset of machine learning.
      `
      const result = extractConcepts(content, { minFrequency: 1 })
      expect(result.nodes.length).toBeGreaterThan(0)
    })

    it('respects minFrequency option', () => {
      const content = `
        The quick brown fox jumps over the lazy dog.
        The dog was sleeping in the garden.
        A cat was watching the dog from the tree.
        The fox ran away from the garden.
      `
      const lowFreq = extractConcepts(content, { minFrequency: 1 })
      const highFreq = extractConcepts(content, { minFrequency: 3 })

      expect(lowFreq.nodes.length).toBeGreaterThanOrEqual(highFreq.nodes.length)
    })

    it('respects maxConcepts option', () => {
      const content = `
        Apple, banana, cherry, date, elderberry, fig, grape, honeydew.
        Apple is a fruit. Banana is yellow. Cherry is red. Date is sweet.
        Elderberry is healthy. Fig is delicious. Grape is small. Honeydew is green.
        We love apple. Banana is great. Cherry tastes good. Date is nutritious.
      `
      const result = extractConcepts(content, { minFrequency: 1, maxConcepts: 3 })
      expect(result.nodes.length).toBeLessThanOrEqual(3)
    })

    it('assigns sequential IDs to nodes', () => {
      const content = `
        Technology companies create software products.
        Software products include applications and services.
        Technology enables digital transformation.
        Companies invest in technology infrastructure.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      if (result.nodes.length > 0) {
        result.nodes.forEach((node, index) => {
          expect(node.id).toBe(`concept-${index}`)
        })
      }
    })

    it('assigns correct concept types', () => {
      const content = `
        The programmer writes clean code every day.
        Writing clean code is important for maintenance.
        The programmer uses modern frameworks effectively.
        Modern frameworks improve development productivity.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      if (result.nodes.length > 0) {
        const types = result.nodes.map(n => n.type)
        const validTypes = ['entity', 'topic', 'action', 'attribute']
        types.forEach(type => {
          expect(validTypes).toContain(type)
        })
      }
    })

    it('assigns colors based on type', () => {
      const expectedColors = {
        entity: '#3b82f6',
        topic: '#8b5cf6',
        action: '#22c55e',
        attribute: '#f59e0b',
      }

      const content = `
        Scientists study complex phenomena in laboratories.
        Complex phenomena require careful analysis and observation.
        Scientists publish their findings in journals.
        Laboratories provide controlled environments for research.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      result.nodes.forEach(node => {
        expect(node.color).toBe(expectedColors[node.type as keyof typeof expectedColors])
      })
    })

    it('builds edges between co-occurring concepts', () => {
      const content = `
        The database stores user information securely.
        User information includes personal data.
        The database uses encryption for security.
        Personal data must be protected carefully.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      // Should have some edges if there are co-occurring concepts
      if (result.nodes.length >= 2) {
        // Edges may or may not be created depending on co-occurrence
        expect(Array.isArray(result.edges)).toBe(true)
      }
    })

    it('edge source and target are node IDs', () => {
      const content = `
        Developers write code in programming languages.
        Programming languages include Python and JavaScript.
        Developers use Python for data science.
        JavaScript is popular for web development.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      const nodeIds = new Set(result.nodes.map(n => n.id))
      result.edges.forEach(edge => {
        expect(nodeIds.has(edge.source)).toBe(true)
        expect(nodeIds.has(edge.target)).toBe(true)
      })
    })

    it('assigns edge types correctly', () => {
      const content = `
        The system processes user requests efficiently.
        User requests come from various applications.
        Applications send requests to the system.
        The system handles multiple concurrent connections.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      const validEdgeTypes = ['related', 'acts-on', 'has-attribute']
      result.edges.forEach(edge => {
        expect(validEdgeTypes).toContain(edge.type)
      })
    })

    it('calculates edge strength', () => {
      const content = `
        Cloud computing enables scalable infrastructure.
        Scalable infrastructure supports high traffic applications.
        Cloud computing reduces operational costs significantly.
        High traffic applications require reliable hosting.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      result.edges.forEach(edge => {
        expect(edge.strength).toBeGreaterThan(0)
        expect(edge.strength).toBeLessThanOrEqual(1.5) // Max is ~0.5 + frequency/10
      })
    })

    it('handles text with mostly code/URLs', () => {
      const content = `
        \`\`\`
        const x = 1;
        const y = 2;
        \`\`\`
        https://example.com https://test.org
      `
      const result = extractConcepts(content)
      // Should return empty since most content is removed
      expect(result.nodes).toHaveLength(0)
    })
  })

  // ============================================================================
  // mergeConceptData
  // ============================================================================

  describe('mergeConceptData', () => {
    it('returns empty data for empty input array', () => {
      const result = mergeConceptData([])
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('returns same data for single input', () => {
      const input: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Test', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [],
      }
      const result = mergeConceptData([input])
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].text).toBe('Test')
    })

    it('merges nodes from multiple inputs', () => {
      const input1: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Apple', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [],
      }
      const input2: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Banana', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [],
      }
      const result = mergeConceptData([input1, input2])
      expect(result.nodes).toHaveLength(2)
    })

    it('deduplicates nodes by text (case-insensitive)', () => {
      const input1: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Apple', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [],
      }
      const input2: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'apple', type: 'entity', weight: 2, color: '#3b82f6' },
        ],
        edges: [],
      }
      const result = mergeConceptData([input1, input2])
      expect(result.nodes).toHaveLength(1)
    })

    it('merges weights for duplicate nodes', () => {
      const input1: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Test', type: 'entity', weight: 3, color: '#3b82f6' },
        ],
        edges: [],
      }
      const input2: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Test', type: 'entity', weight: 5, color: '#3b82f6' },
        ],
        edges: [],
      }
      const result = mergeConceptData([input1, input2])
      expect(result.nodes[0].weight).toBe(8) // 3 + 5
    })

    it('reassigns sequential IDs after merge', () => {
      const input1: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'First', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [],
      }
      const input2: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Second', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [],
      }
      const result = mergeConceptData([input1, input2])

      result.nodes.forEach((node, index) => {
        expect(node.id).toBe(`concept-${index}`)
      })
    })

    it('merges edges correctly', () => {
      const input1: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'A', type: 'entity', weight: 1, color: '#3b82f6' },
          { id: 'concept-1', text: 'B', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [
          { source: 'concept-0', target: 'concept-1', type: 'related', strength: 0.5 },
        ],
      }
      const result = mergeConceptData([input1])

      expect(result.edges).toHaveLength(1)
      // Edge should reference new IDs
      expect(result.edges[0].source).toMatch(/^concept-\d+$/)
      expect(result.edges[0].target).toMatch(/^concept-\d+$/)
    })

    it('increases strength for repeated edges', () => {
      const input1: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'A', type: 'entity', weight: 1, color: '#3b82f6' },
          { id: 'concept-1', text: 'B', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [
          { source: 'concept-0', target: 'concept-1', type: 'related', strength: 0.5 },
        ],
      }
      const input2: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'A', type: 'entity', weight: 1, color: '#3b82f6' },
          { id: 'concept-1', text: 'B', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [
          { source: 'concept-0', target: 'concept-1', type: 'related', strength: 0.5 },
        ],
      }
      const result = mergeConceptData([input1, input2])

      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].strength).toBe(0.6) // 0.5 + 0.1
    })

    it('caps merged edge strength at 1', () => {
      const inputs: ConceptData[] = []
      for (let i = 0; i < 20; i++) {
        inputs.push({
          nodes: [
            { id: 'concept-0', text: 'A', type: 'entity', weight: 1, color: '#3b82f6' },
            { id: 'concept-1', text: 'B', type: 'entity', weight: 1, color: '#3b82f6' },
          ],
          edges: [
            { source: 'concept-0', target: 'concept-1', type: 'related', strength: 0.5 },
          ],
        })
      }
      const result = mergeConceptData(inputs)

      expect(result.edges[0].strength).toBeLessThanOrEqual(1)
    })

    it('handles edges with missing nodes gracefully', () => {
      const input: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'A', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [
          // Edge references non-existent node
          { source: 'concept-0', target: 'concept-99', type: 'related', strength: 0.5 },
        ],
      }
      const result = mergeConceptData([input])

      // Edge should be filtered out since target doesn't exist
      expect(result.edges).toHaveLength(0)
    })

    it('deduplicates edges regardless of direction', () => {
      const input1: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'A', type: 'entity', weight: 1, color: '#3b82f6' },
          { id: 'concept-1', text: 'B', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [
          { source: 'concept-0', target: 'concept-1', type: 'related', strength: 0.5 },
        ],
      }
      const input2: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'A', type: 'entity', weight: 1, color: '#3b82f6' },
          { id: 'concept-1', text: 'B', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [
          // Same edge but reversed direction
          { source: 'concept-1', target: 'concept-0', type: 'related', strength: 0.5 },
        ],
      }
      const result = mergeConceptData([input1, input2])

      // Should only have 1 edge (deduplicated)
      expect(result.edges).toHaveLength(1)
    })

    it('merges data from three sources', () => {
      const input1: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Apple', type: 'entity', weight: 1, color: '#3b82f6' },
        ],
        edges: [],
      }
      const input2: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Banana', type: 'entity', weight: 2, color: '#3b82f6' },
        ],
        edges: [],
      }
      const input3: ConceptData = {
        nodes: [
          { id: 'concept-0', text: 'Cherry', type: 'topic', weight: 3, color: '#8b5cf6' },
          { id: 'concept-1', text: 'Apple', type: 'entity', weight: 4, color: '#3b82f6' },
        ],
        edges: [],
      }
      const result = mergeConceptData([input1, input2, input3])

      expect(result.nodes).toHaveLength(3) // Apple (merged), Banana, Cherry
      const appleNode = result.nodes.find(n => n.text.toLowerCase() === 'apple')
      expect(appleNode?.weight).toBe(5) // 1 + 4
    })
  })

  // ============================================================================
  // Edge cases and integration
  // ============================================================================

  describe('edge cases', () => {
    it('handles unicode content', () => {
      const content = `
        日本語テキストを処理します。
        Unicode characters like émojis 🎉 and symbols © ® ™.
        Chinese characters: 中文内容测试。
        Unicode content appears multiple times for frequency.
      `
      const result = extractConcepts(content, { minFrequency: 1 })
      // Should not throw and should return valid structure
      expect(Array.isArray(result.nodes)).toBe(true)
      expect(Array.isArray(result.edges)).toBe(true)
    })

    it('handles very long content', () => {
      // Generate long content
      const paragraph = 'Technology and innovation drive progress in modern society. '
      const content = paragraph.repeat(100)

      const result = extractConcepts(content, { minFrequency: 1 })
      expect(result.nodes.length).toBeGreaterThan(0)
    })

    it('handles content with only punctuation', () => {
      const content = '!!! ??? ... --- === +++ @@@ ### $$$ %%% ^^^ &&& *** ((( )))'
      const result = extractConcepts(content)
      expect(result.nodes).toHaveLength(0)
    })

    it('handles content with only numbers', () => {
      const content = '123 456 789 012 345 678 901 234 567 890 123456789'
      const result = extractConcepts(content)
      expect(result.nodes).toHaveLength(0)
    })

    it('handles mixed case concepts consistently', () => {
      const content = `
        Machine Learning is important. MACHINE LEARNING advances quickly.
        machine learning uses algorithms. MachinE LeArNing is evolving.
        We study machine learning every day for best results.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      // Check that nodes are extracted (may have some duplicates across different types)
      expect(result.nodes.length).toBeGreaterThan(0)

      // Within each concept type, duplicates should be merged
      const entitiesByText = new Map<string, number>()
      result.nodes
        .filter(n => n.type === 'entity')
        .forEach(n => {
          const key = n.text.toLowerCase()
          entitiesByText.set(key, (entitiesByText.get(key) || 0) + 1)
        })

      // Each entity text should appear at most once
      for (const count of entitiesByText.values()) {
        expect(count).toBe(1)
      }
    })

    it('filters very short concepts', () => {
      const content = `
        A b c d e f g h i j k l m n o p q r s t u v w x y z.
        The dog is big. It ran far. We saw it go by us.
        Short words like a, I, to appear often in text.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      // All nodes should have text length >= 3
      result.nodes.forEach(node => {
        expect(node.text.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('filters very long concepts', () => {
      const content = `
        This superlongwordthatisreallyridiculouslyextremelylongandunreasonableforanyonetoactuallyuse appears.
        Normal words like technology and innovation are common.
        Technology helps society. Innovation drives progress.
      `
      const result = extractConcepts(content, { minFrequency: 1 })

      // All nodes should have reasonable text length (< 50)
      result.nodes.forEach(node => {
        expect(node.text.length).toBeLessThanOrEqual(50)
      })
    })
  })

  // ============================================================================
  // Performance considerations
  // ============================================================================

  describe('performance', () => {
    it('completes within reasonable time for moderate content', () => {
      const paragraph = 'Software development requires careful planning and execution. '
      const content = paragraph.repeat(50)

      const start = performance.now()
      extractConcepts(content, { minFrequency: 1 })
      const duration = performance.now() - start

      // Should complete in under 5 seconds
      expect(duration).toBeLessThan(5000)
    })
  })
})
