/**
 * Categorization System
 * @module lib/categorization
 *
 * Browser-based offline categorization system for organizing inbox strands.
 * Enhanced with Embark-style context-aware categorization that considers:
 * - Document hierarchy (weaves, looms, strands)
 * - Relationships to existing documents
 * - Semantic analysis (NLP entities, concepts, content type)
 */

// Types
export * from './types'

// Algorithm (base keyword-based)
export * from './algorithm'

// Context-Aware Algorithm (enhanced with hierarchy, relationships, semantics)
export * from './contextAwareCategorization'

// Database
export * from './schema'

// GitHub Sync
export * from './githubSync'

// Initialization
export * from './init'
