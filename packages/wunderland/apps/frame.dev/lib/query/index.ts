/**
 * Query System Module
 * @module lib/query
 *
 * Structured query language for searching across strands, blocks,
 * tags, and supertag fields.
 *
 * Features:
 * - Text search with boolean operators
 * - Tag and supertag filtering
 * - Field comparisons with multiple operators
 * - Date range queries
 * - Faceted results
 * - Query caching
 * - Saved queries
 */

export * from './types'
export * from './queryLanguage'
export * from './queryToSQL'
export * from './queryEngine'
