/**
 * Test Data Fixtures for E2E Tests
 * Contains mock data and helpers for testing
 *
 * @module e2e/fixtures/testData
 */

export const testStrands = {
  sample: {
    title: 'Introduction to React',
    slug: 'introduction-to-react',
    subjects: ['technology'],
    topics: ['react', 'frontend'],
    tags: ['hooks', 'components', 'jsx'],
    content: `# Introduction to React

React is a JavaScript library for building user interfaces.

## Key Concepts

- Components
- Props
- State
- Hooks

## Example

\`\`\`jsx
function App() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
\`\`\`
`,
  },
  withGlossary: {
    title: 'Machine Learning Basics',
    slug: 'machine-learning-basics',
    subjects: ['technology'],
    topics: ['machine-learning', 'ai'],
    tags: ['neural-networks', 'tensorflow', 'training'],
    glossaryTerms: [
      { term: 'Neural Network', definition: 'A computing system inspired by biological neural networks' },
      { term: 'TensorFlow', definition: 'An open-source machine learning framework' },
      { term: 'Training', definition: 'The process of teaching a model using data' },
    ],
  },
  taxonomy: {
    title: 'Advanced TypeScript',
    slug: 'advanced-typescript',
    subjects: ['programming'],
    topics: ['typescript', 'javascript'],
    tags: ['generics', 'type-guards', 'utility-types'],
  },
}

export const testSubjects = [
  'technology',
  'programming',
  'design',
  'business',
  'science',
]

export const testTopics = [
  'react',
  'typescript',
  'machine-learning',
  'css',
  'nodejs',
  'python',
  'testing',
]

export const testTags = [
  'hooks',
  'generics',
  'neural-networks',
  'flexbox',
  'async-await',
]

// Taxonomy hierarchy test cases
export const taxonomyTestCases = {
  // Term that should be rejected as duplicate
  duplicateAcronym: {
    existingSubject: 'artificial-intelligence',
    newTag: 'AI',
    expectedResult: 'duplicate',
    expectedMessage: /similar term.*artificial-intelligence/i,
  },

  // Term that should be rejected as already exists at higher level
  alreadySubject: {
    existingSubject: 'technology',
    newTag: 'technology',
    expectedResult: 'already-exists',
  },

  // Term that should pass validation
  validNewTag: {
    newTag: 'quantum-computing',
    expectedResult: 'valid',
  },

  // Similar term via Levenshtein
  similarSpelling: {
    existingTopic: 'typescript',
    newTag: 'typscript', // typo
    expectedResult: 'similar',
    expectedMessage: /similar.*typescript/i,
  },

  // Plural form should match singular
  pluralMatch: {
    existingTopic: 'framework',
    newTag: 'frameworks',
    expectedResult: 'duplicate',
  },
}

// Filter test cases
export const filterTestCases = {
  singleSubject: {
    filter: { subject: 'technology' },
    expectedMinCount: 1,
  },
  multipleTags: {
    filter: { tags: ['hooks', 'components'] },
    expectedMinCount: 0, // May be 0 if no strand has both
  },
  dateRange: {
    filter: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    },
    expectedMinCount: 0,
  },
}

// Glossary test cases
export const glossaryTestCases = {
  editTerm: {
    originalTerm: 'React',
    newTerm: 'React.js Framework',
    expectedSuccess: true,
  },
  deleteTerm: {
    term: 'Vue',
    expectedSuccess: true,
  },
  restoreTerm: {
    term: 'Vue',
    expectedSuccess: true,
  },
}

/**
 * Generate a unique strand title for testing
 */
export function generateUniqueTitle(prefix = 'Test Strand'): string {
  return `${prefix} ${Date.now()}`
}

/**
 * Generate random tags for testing
 */
export function generateRandomTags(count: number): string[] {
  const pool = [...testTags, 'test-tag-1', 'test-tag-2', 'test-tag-3', 'test-tag-4', 'test-tag-5']
  const shuffled = pool.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
