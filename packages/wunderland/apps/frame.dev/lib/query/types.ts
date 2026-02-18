/**
 * Query System Type Definitions
 * @module lib/query/types
 *
 * Types for the structured query language that enables searching
 * across strands, blocks, tags, and supertag fields.
 *
 * Supports:
 * - Text search with operators (AND, OR, NOT)
 * - Tag filtering (#tag, -#excluded)
 * - Supertag field queries (#task where:status=done)
 * - Block type filtering (type:heading, type:code)
 * - Metadata filtering (weave:, loom:, difficulty:)
 * - Date ranges (created:>2024-01-01)
 * - Sorting and pagination
 */

// ============================================================================
// AST NODE TYPES
// ============================================================================

/**
 * Query AST node types
 */
export type QueryNodeType =
  | 'root'           // Root query node
  | 'and'            // AND expression
  | 'or'             // OR expression
  | 'not'            // NOT expression
  | 'group'          // Parenthesized group
  | 'text'           // Free text search
  | 'tag'            // Tag filter
  | 'field'          // Field comparison
  | 'supertag'       // Supertag with field query
  | 'type'           // Block/content type filter
  | 'path'           // Path filter
  | 'date'           // Date comparison

/**
 * Comparison operators for field queries
 */
export type ComparisonOperator =
  | '='              // Equals
  | '!='             // Not equals
  | '>'              // Greater than
  | '<'              // Less than
  | '>='             // Greater than or equal
  | '<='             // Less than or equal
  | '~'              // Contains (fuzzy match)
  | '!~'             // Does not contain
  | '^'              // Starts with
  | '$'              // Ends with

/**
 * Field names for queries
 */
export type QueryField =
  // Content fields
  | 'title'
  | 'content'
  | 'summary'
  // Taxonomy fields
  | 'tag'
  | 'tags'
  | 'subject'
  | 'subjects'
  | 'topic'
  | 'topics'
  // Hierarchy fields
  | 'weave'
  | 'loom'
  | 'path'
  // Block fields
  | 'type'
  | 'block_type'
  | 'heading_level'
  | 'worthiness'
  // Metadata fields
  | 'difficulty'
  | 'status'
  | 'version'
  // Date fields
  | 'created'
  | 'created_at'
  | 'updated'
  | 'updated_at'
  // Supertag fields (dynamic)
  | string

/**
 * Base AST node
 */
export interface QueryNodeBase {
  type: QueryNodeType
}

/**
 * Root query node
 */
export interface RootQueryNode extends QueryNodeBase {
  type: 'root'
  children: QueryNode[]
  sort?: SortClause
  limit?: number
  offset?: number
}

/**
 * AND expression node
 */
export interface AndQueryNode extends QueryNodeBase {
  type: 'and'
  left: QueryNode
  right: QueryNode
}

/**
 * OR expression node
 */
export interface OrQueryNode extends QueryNodeBase {
  type: 'or'
  left: QueryNode
  right: QueryNode
}

/**
 * NOT expression node
 */
export interface NotQueryNode extends QueryNodeBase {
  type: 'not'
  child: QueryNode
}

/**
 * Grouped expression node
 */
export interface GroupQueryNode extends QueryNodeBase {
  type: 'group'
  child: QueryNode
}

/**
 * Text search node
 */
export interface TextQueryNode extends QueryNodeBase {
  type: 'text'
  value: string
  exact?: boolean // "exact phrase"
}

/**
 * Tag filter node
 */
export interface TagQueryNode extends QueryNodeBase {
  type: 'tag'
  tagName: string
  exclude?: boolean // -#tag
}

/**
 * Field comparison node
 */
export interface FieldQueryNode extends QueryNodeBase {
  type: 'field'
  field: QueryField
  operator: ComparisonOperator
  value: string | number | boolean | null
}

/**
 * Supertag query node
 */
export interface SupertagQueryNode extends QueryNodeBase {
  type: 'supertag'
  tagName: string
  fields?: Array<{
    name: string
    operator: ComparisonOperator
    value: unknown
  }>
}

/**
 * Block/content type filter
 */
export interface TypeQueryNode extends QueryNodeBase {
  type: 'type'
  targetType: 'strand' | 'block' | 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'table'
}

/**
 * Path filter node
 */
export interface PathQueryNode extends QueryNodeBase {
  type: 'path'
  pattern: string
  operator: 'in' | 'starts' | 'ends' | 'matches'
}

/**
 * Date comparison node
 */
export interface DateQueryNode extends QueryNodeBase {
  type: 'date'
  field: 'created' | 'updated'
  operator: ComparisonOperator
  value: string // ISO date string
}

/**
 * Union of all query nodes
 */
export type QueryNode =
  | RootQueryNode
  | AndQueryNode
  | OrQueryNode
  | NotQueryNode
  | GroupQueryNode
  | TextQueryNode
  | TagQueryNode
  | FieldQueryNode
  | SupertagQueryNode
  | TypeQueryNode
  | PathQueryNode
  | DateQueryNode

// ============================================================================
// SORT & PAGINATION
// ============================================================================

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Sort clause
 */
export interface SortClause {
  field: QueryField
  direction: SortDirection
}

// ============================================================================
// QUERY RESULTS
// ============================================================================

/**
 * Search result type
 */
export type ResultType = 'strand' | 'block'

/**
 * Strand search result
 */
export interface StrandSearchResult {
  type: 'strand'
  id: string
  path: string
  title: string
  summary?: string
  content: string
  weave?: string
  loom?: string
  tags: string[]
  subjects: string[]
  topics: string[]
  difficulty?: string
  wordCount: number
  createdAt: string
  updatedAt: string
  /** Relevance score (0-1) */
  score: number
  /** Matching highlights */
  highlights?: {
    title?: string[]
    content?: string[]
    summary?: string[]
  }
}

/**
 * Block search result
 */
export interface BlockSearchResult {
  type: 'block'
  id: string
  blockId: string
  strandPath: string
  strandTitle: string
  blockType: string
  content: string
  summary?: string
  headingLevel?: number
  tags: string[]
  worthinessScore?: number
  startLine: number
  endLine: number
  createdAt: string
  updatedAt: string
  /** Relevance score (0-1) */
  score: number
  /** Matching highlights */
  highlights?: {
    content?: string[]
  }
}

/**
 * Union of search results
 */
export type SearchResult = StrandSearchResult | BlockSearchResult

/**
 * Query execution result
 */
export interface QueryResult {
  /** Search results */
  results: SearchResult[]
  /** Total count (before pagination) */
  total: number
  /** Query execution time in ms */
  executionTime: number
  /** The executed query */
  query: RootQueryNode
  /** Whether results are from cache */
  cached?: boolean
  /** Facets for filtering */
  facets?: QueryFacets
}

// ============================================================================
// FACETS
// ============================================================================

/**
 * Facet count
 */
export interface FacetCount {
  value: string
  count: number
  label?: string
  color?: string
}

/**
 * Query facets for filtering
 */
export interface QueryFacets {
  weaves: FacetCount[]
  looms: FacetCount[]
  tags: FacetCount[]
  subjects: FacetCount[]
  topics: FacetCount[]
  blockTypes: FacetCount[]
  supertags: FacetCount[]
  difficulties: FacetCount[]
}

// ============================================================================
// SAVED QUERIES
// ============================================================================

/**
 * Saved query record
 */
export interface SavedQuery {
  id: string
  name: string
  description?: string
  queryJson: string // JSON stringified RootQueryNode
  isPinned: boolean
  folder?: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Query system configuration
 */
export interface QueryConfig {
  /** Enable query caching */
  enableCache: boolean
  /** Cache TTL in milliseconds */
  cacheTTL: number
  /** Default result limit */
  defaultLimit: number
  /** Maximum result limit */
  maxLimit: number
  /** Enable facet computation */
  enableFacets: boolean
  /** Enable highlighting */
  enableHighlights: boolean
  /** Highlight max length */
  highlightMaxLength: number
}

/**
 * Default configuration
 */
export const DEFAULT_QUERY_CONFIG: QueryConfig = {
  enableCache: true,
  cacheTTL: 60000, // 1 minute
  defaultLimit: 20,
  maxLimit: 100,
  enableFacets: true,
  enableHighlights: true,
  highlightMaxLength: 200,
}
