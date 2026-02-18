import type { BM25SearchOptions, CodexSearchDoc, CodexSearchIndex, CodexSearchResult } from './types'

const DEFAULT_K1 = 1.5
const DEFAULT_B = 0.75

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'been',
  'be',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'should',
  'could',
  'may',
  'might',
  'must',
  'can',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'what',
  'which',
  'who',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  's',
  't',
  'just',
  'don',
  'now',
  'use',
  'using',
  'used',
])

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term))

export class BM25Engine {
  private readonly docs: CodexSearchDoc[]
  private readonly postings: Map<string, Array<[number, number]>>
  private readonly totalDocs: number
  private readonly avgDocLength: number
  private readonly k1: number
  private readonly b: number

  constructor(index: CodexSearchIndex, k1: number = DEFAULT_K1, b: number = DEFAULT_B) {
    this.docs = index.docs
    this.postings = new Map(Object.entries(index.vocabulary))
    this.totalDocs = index.stats.totalDocs
    this.avgDocLength = index.stats.avgDocLength || 1
    this.k1 = k1
    this.b = b
  }

  search(query: string, options: BM25SearchOptions = {}): CodexSearchResult[] {
    const terms = tokenize(query)
    if (terms.length === 0) return []

    const scores = new Map<number, number>()

    terms.forEach((term) => {
      const postingList = this.postings.get(term)
      if (!postingList) return

      const df = postingList.length
      const idf = Math.log(1 + (this.totalDocs - df + 0.5) / (df + 0.5))

      postingList.forEach(([docId, tf]) => {
        const doc = this.docs[docId]
        if (!doc) return
        const docLength = doc.docLength || 1
        const numerator = tf * (this.k1 + 1)
        const denominator = tf + this.k1 * (1 - this.b + (this.b * docLength) / this.avgDocLength)
        const contribution = idf * (numerator / denominator)
        scores.set(docId, (scores.get(docId) || 0) + contribution)
      })
    })

    if (scores.size === 0) return []

    const limit = options.limit ?? 20
    const results: CodexSearchResult[] = Array.from(scores.entries())
      .map(([docId, score]) => {
        const doc = this.docs[docId]
        return {
          docId,
          path: doc.path,
          title: doc.title,
          summary: doc.summary,
          weave: doc.weave,
          loom: doc.loom,
          tags: doc.tags,
          skills: doc.skills,
          subjects: doc.subjects,
          topics: doc.topics,
          bm25Score: score,
          combinedScore: score,
        }
      })
      .sort((a, b) => b.bm25Score - a.bm25Score)
      .slice(0, limit)

    return results
  }
}


