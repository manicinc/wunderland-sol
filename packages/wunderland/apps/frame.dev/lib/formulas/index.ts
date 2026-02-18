/**
 * Formula Evaluation System
 * @module lib/formulas
 *
 * @description
 * Embark-inspired formula evaluation engine for computed supertag fields.
 * Provides spreadsheet-like computations within documents.
 *
 * @example
 * ```typescript
 * import { evaluateFormula, createFormulaContext } from '@/lib/formulas'
 *
 * const context = createFormulaContext({
 *   fields: { price: 100, quantity: 5 },
 *   mentions: [{ id: '1', type: 'place', label: 'Paris', properties: {} }]
 * })
 *
 * const result = await evaluateFormula('price * quantity', context)
 * // result.value === 500
 * ```
 */

export {
  // Main API
  evaluateFormula,
  parseFormula,
  createFormulaContext,
  getAvailableFunctions,
  suggestFormulas,

  // Types
  type FormulaContext,
  type FormulaResult,
  type ParsedFormula,
  type ASTNode,
  type FunctionDefinition,

  // Errors
  FormulaError,
  isFormulaError,
} from './formulaEngine'

export {
  // Built-in functions
  BUILTIN_FUNCTIONS,
  FUNCTION_MAP,
  getFunction,
  hasFunction,
  getFunctionsByCategory,
} from './builtinFunctions'

export type {
  // Additional types
  BinaryNode,
  UnaryNode,
  CallNode,
  LiteralNode,
  IdentifierNode,
  ReferenceNode,
  PropertyNode,
  ConditionalNode,
  ExpressionNode,
  FormulaNode,
  FormulaNodeType,
} from './types'




