/**
 * Formula Engine Types
 * @module lib/formulas/types
 *
 * @description
 * Embark-inspired formula system for computed fields in supertags.
 * Formulas can reference other fields, mentions, and external data.
 */

import type { MentionableEntity } from '@/lib/mentions/types'

// ============================================================================
// FORMULA CONTEXT
// ============================================================================

/**
 * Context available to formula evaluation
 */
export interface FormulaContext {
  /** Current block's field values */
  fields: Record<string, unknown>
  
  /** Mentions in the current document */
  mentions: MentionableEntity[]
  
  /** Sibling blocks with their field values */
  siblings: Array<{
    blockId: string
    path: string
    fields: Record<string, unknown>
  }>
  
  /** Parent strand metadata */
  strand?: {
    path: string
    title: string
    tags: string[]
    metadata: Record<string, unknown>
  }
  
  /** Current date/time for date functions */
  now: Date
  
  /** User-defined variables */
  variables?: Record<string, unknown>
  
  /** Current strand path for context */
  currentStrandPath?: string
  
  /** Current block ID for context */
  currentBlockId?: string
  
  /** User settings */
  settings?: Record<string, unknown>
}

// ============================================================================
// FORMULA RESULT
// ============================================================================

/**
 * Result of formula evaluation
 */
export interface FormulaResult {
  /** Whether evaluation succeeded */
  success: boolean
  
  /** Computed value */
  value: unknown
  
  /** Value type for display */
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'null'
  
  /** Formatted display string */
  displayValue: string
  
  /** Error message if failed */
  error?: string
  
  /** Dependencies accessed during evaluation */
  dependencies?: string[]
  
  /** Evaluation time in ms */
  evaluationTimeMs?: number
}

// ============================================================================
// BUILT-IN FUNCTIONS
// ============================================================================

/**
 * Built-in function signature
 */
export type FormulaFunction = (
  args: unknown[],
  context: FormulaContext
) => unknown | Promise<unknown>

/**
 * Function category for organization
 */
export type FunctionCategory =
  | 'math'       // Mathematical operations
  | 'string'     // String manipulation
  | 'date'       // Date/time operations
  | 'logic'      // Logical operations
  | 'aggregate'  // Aggregation over collections
  | 'lookup'     // Data lookup and fetching
  | 'travel'     // Travel-specific (routes, weather)
  | 'reference'  // Reference resolution

/**
 * Function definition for built-in functions
 */
export interface FunctionDefinition {
  /** Function name (case-insensitive) */
  name: string
  
  /** Function category */
  category: FunctionCategory
  
  /** Description */
  description: string
  
  /** Example usage */
  example: string
  
  /** Parameter definitions */
  parameters: Array<{
    name: string
    type: string
    description: string
    required: boolean
    defaultValue?: unknown
  }>
  
  /** Return type description */
  returnType: string
  
  /** Whether this function is async */
  isAsync: boolean
  
  /** The implementation */
  implementation: FormulaFunction
}

// ============================================================================
// FORMULA EXPRESSION TYPES
// ============================================================================

/**
 * AST node types for parsed formulas
 */
export type FormulaNodeType =
  | 'literal'      // 42, "hello", true
  | 'identifier'   // fieldName
  | 'reference'    // @entity
  | 'property'     // route.distance
  | 'call'         // Function(args)
  | 'binary'       // a + b
  | 'unary'        // -a, !a
  | 'conditional'  // a ? b : c

/**
 * Base AST node
 */
export interface FormulaNode {
  type: FormulaNodeType
  start: number
  end: number
}

/**
 * Literal value node
 */
export interface LiteralNode extends FormulaNode {
  type: 'literal'
  value: string | number | boolean | null
  raw: string
}

/**
 * Identifier node (field reference)
 */
export interface IdentifierNode extends FormulaNode {
  type: 'identifier'
  name: string
}

/**
 * Entity reference node (@entity)
 */
export interface ReferenceNode extends FormulaNode {
  type: 'reference'
  entityId: string
}

/**
 * Property access node (a.b)
 */
export interface PropertyNode extends FormulaNode {
  type: 'property'
  object: ExpressionNode
  property: string
}

/**
 * Function call node
 */
export interface CallNode extends FormulaNode {
  type: 'call'
  callee: string
  arguments: ExpressionNode[]
}

/**
 * Binary operation node
 */
export interface BinaryNode extends FormulaNode {
  type: 'binary'
  operator: string
  left: ExpressionNode
  right: ExpressionNode
}

/**
 * Unary operation node
 */
export interface UnaryNode extends FormulaNode {
  type: 'unary'
  operator: string
  argument: ExpressionNode
}

/**
 * Conditional expression node
 */
export interface ConditionalNode extends FormulaNode {
  type: 'conditional'
  test: ExpressionNode
  consequent: ExpressionNode
  alternate: ExpressionNode
}

/**
 * Union of all expression node types
 */
export type ExpressionNode =
  | LiteralNode
  | IdentifierNode
  | ReferenceNode
  | PropertyNode
  | CallNode
  | BinaryNode
  | UnaryNode
  | ConditionalNode

// ============================================================================
// FORMULA VALIDATION
// ============================================================================

/**
 * Formula validation result
 */
export interface FormulaValidation {
  /** Whether the formula is valid */
  isValid: boolean
  
  /** Parse errors if any */
  errors: Array<{
    message: string
    position: number
    length: number
  }>
  
  /** Warnings (formula works but may have issues) */
  warnings: Array<{
    message: string
    position: number
  }>
  
  /** Referenced identifiers */
  references: string[]
  
  /** Called functions */
  functions: string[]
}

// ============================================================================
// FORMULA CACHE
// ============================================================================

/**
 * Cached formula result
 */
export interface CachedFormula {
  /** Formula expression */
  expression: string
  
  /** Block ID this formula belongs to */
  blockId: string
  
  /** Last computed result */
  result: FormulaResult
  
  /** When computed */
  computedAt: string
  
  /** Expiration (for time-sensitive formulas) */
  expiresAt?: string
  
  /** Dependencies that would invalidate cache */
  dependsOn: string[]
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Formula-specific error
 */
export class FormulaError extends Error {
  constructor(
    message: string,
    public code: FormulaErrorCode,
    public position?: number
  ) {
    super(message)
    this.name = 'FormulaError'
  }
}

/**
 * Type guard to check if a value is a FormulaError
 */
export function isFormulaError(value: unknown): value is FormulaError {
  return value instanceof FormulaError
}

/**
 * Error codes for formula errors
 */
export type FormulaErrorCode =
  | 'PARSE_ERROR'           // Syntax error in formula
  | 'UNKNOWN_FUNCTION'      // Function not found
  | 'INVALID_ARGUMENTS'     // Wrong number/type of arguments
  | 'UNKNOWN_REFERENCE'     // Field/entity not found
  | 'DIVISION_BY_ZERO'      // Mathematical error
  | 'TYPE_ERROR'            // Type mismatch
  | 'CIRCULAR_REFERENCE'    // Formula references itself
  | 'ASYNC_ERROR'           // Async operation failed
  | 'TIMEOUT'               // Evaluation took too long
  | 'RUNTIME_ERROR'         // General runtime error

// ============================================================================
// AST TYPES (for formula parsing)
// ============================================================================

/**
 * AST node types for the formula parser
 */
export type ASTNode =
  | { type: 'literal'; value: unknown; dataType?: 'number' | 'string' | 'boolean' | 'null' }
  | { type: 'identifier'; name: string }
  | { type: 'mention'; name: string }
  | { type: 'call'; name: string; arguments: ASTNode[] }
  | { type: 'binary'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; operator: string; operand: ASTNode }
  | { type: 'member'; object: ASTNode; property: string }

/**
 * Parsed formula with AST and metadata
 */
export interface ParsedFormula {
  /** Original expression string */
  expression: string
  /** Parsed abstract syntax tree */
  ast: ASTNode
  /** Fields and references the formula depends on */
  dependencies: string[]
}
