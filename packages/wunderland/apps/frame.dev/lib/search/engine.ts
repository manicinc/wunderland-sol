import { loadCodexSearchIndex, decodeEmbeddings } from './loaders'
import { BM25Engine } from './bm25'
import { SemanticReranker } from './semantic'
import type { CodexSearchResult, HybridSearchOptions } from './types'

export class CodexSearchEngine {
  private bm25: BM25Engine | null = null
  private semantic: SemanticReranker | null = null
  private initializing: Promise<void> | null = null
  private semanticAvailable = false

  private async ensureReady() {
    if (this.bm25) return
    if (this.initializing) {
      await this.initializing
      return
    }

    this.initializing = (async () => {
      const data = await loadCodexSearchIndex()
      if (!data) {
        this.bm25 = null
        this.semantic = null
        this.semanticAvailable = false
        return
      }

      this.bm25 = new BM25Engine(data)
      const embeddings = decodeEmbeddings(data.embeddings, data.docs.length)
      this.semantic = new SemanticReranker(data.docs, embeddings, data.embeddings.size)
      this.semanticAvailable = Boolean(this.semantic?.isAvailable)
    })()

    await this.initializing
    this.initializing = null
  }

  async search(query: string, options: HybridSearchOptions = {}): Promise<CodexSearchResult[]> {
    await this.ensureReady()
    if (!this.bm25) {
      throw new Error('Codex search index unavailable')
    }

    const lexical = this.bm25.search(query, { limit: options.limit })
    if (!options.semantic || !this.semantic?.isAvailable) {
      return lexical
    }

    return this.semantic.rerank(query, lexical, {
      limit: options.limit,
      fallbackToAllDocs: true,
    })
  }

  canUseSemantic(): boolean {
    return this.semanticAvailable
  }
}

let engineInstance: CodexSearchEngine | null = null

export const getSearchEngine = (): CodexSearchEngine => {
  if (!engineInstance) {
    engineInstance = new CodexSearchEngine()
  }
  return engineInstance
}


