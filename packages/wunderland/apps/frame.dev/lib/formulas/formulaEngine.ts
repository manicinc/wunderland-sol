/**
 * Formula Evaluation Engine
 * @module lib/formulas/formulaEngine
 *
 * @description
 * Embark-inspired formula evaluation engine that parses and evaluates
 * expressions within supertag formula fields. Supports:
 * - Built-in functions (math, string, date, aggregate, travel)
 * - Field references using dot notation
 * - Mention resolution
 * - Basic arithmetic operations
 */

import type {
  FormulaContext,
  FormulaResult,
  ParsedFormula,
  ASTNode,
  FunctionDefinition,
} from './types'
import { FormulaError, isFormulaError } from './types'
import { getFunction, hasFunction, BUILTIN_FUNCTIONS } from './builtinFunctions'
import { resolveMention } from '@/lib/mentions/mentionResolver'
import { MentionableEntity } from '@/lib/mentions/types'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine the value type for a computed value
 */
function getValueType(value: unknown): FormulaResult['valueType'] {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'null'
}

/**
 * Format a value for display
 */
function formatDisplayValue(value: unknown, valueType: FormulaResult['valueType']): string {
  if (value === null || value === undefined) return ''
  switch (valueType) {
    case 'string':
      return String(value)
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'date':
      return value instanceof Date ? value.toLocaleDateString() : String(value)
    case 'array':
      return Array.isArray(value) ? value.join(', ') : String(value)
    case 'object':
      return JSON.stringify(value)
    default:
      return String(value)
  }
}

// ============================================================================
// TOKENIZER
// ============================================================================

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'DOT'
  | 'AT'
  | 'COMPARISON'
  | 'EOF'

interface Token {
  type: TokenType
  value: string
  position: number
}

const OPERATORS = new Set(['+', '-', '*', '/', '%'])
const COMPARISONS = new Set(['=', '==', '!=', '<>', '<', '>', '<=', '>='])

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let pos = 0

  while (pos < input.length) {
    const char = input[pos]

    // Skip whitespace
    if (/\s/.test(char)) {
      pos++
      continue
    }

    // Numbers
    if (/\d/.test(char)) {
      let num = ''
      const startPos = pos
      while (pos < input.length && /[\d.]/.test(input[pos])) {
        num += input[pos++]
      }
      tokens.push({ type: 'NUMBER', value: num, position: startPos })
      continue
    }

    // Strings (single or double quotes)
    if (char === '"' || char === "'") {
      const quote = char
      let str = ''
      const startPos = pos
      pos++ // Skip opening quote
      while (pos < input.length && input[pos] !== quote) {
        if (input[pos] === '\\' && pos + 1 < input.length) {
          pos++ // Skip escape character
        }
        str += input[pos++]
      }
      pos++ // Skip closing quote
      tokens.push({ type: 'STRING', value: str, position: startPos })
      continue
    }

    // Identifiers (function names, field names)
    if (/[a-zA-Z_]/.test(char)) {
      let ident = ''
      const startPos = pos
      while (pos < input.length && /[a-zA-Z0-9_]/.test(input[pos])) {
        ident += input[pos++]
      }
      tokens.push({ type: 'IDENTIFIER', value: ident, position: startPos })
      continue
    }

    // Comparison operators (must check before single-char operators)
    const twoChar = input.slice(pos, pos + 2)
    if (COMPARISONS.has(twoChar)) {
      tokens.push({ type: 'COMPARISON', value: twoChar, position: pos })
      pos += 2
      continue
    }

    // Single-char comparisons
    if (COMPARISONS.has(char)) {
      tokens.push({ type: 'COMPARISON', value: char, position: pos })
      pos++
      continue
    }

    // Operators
    if (OPERATORS.has(char)) {
      tokens.push({ type: 'OPERATOR', value: char, position: pos })
      pos++
      continue
    }

    // Punctuation
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char, position: pos++ })
      continue
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char, position: pos++ })
      continue
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: char, position: pos++ })
      continue
    }
    if (char === '.') {
      tokens.push({ type: 'DOT', value: char, position: pos++ })
      continue
    }
    if (char === '@') {
      tokens.push({ type: 'AT', value: char, position: pos++ })
      continue
    }

    // Unknown character - skip it
    pos++
  }

  tokens.push({ type: 'EOF', value: '', position: pos })
  return tokens
}

// ============================================================================
// PARSER
// ============================================================================

class Parser {
  private tokens: Token[]
  private current: number = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private advance(): Token {
    return this.tokens[this.current++]
  }

  private match(...types: TokenType[]): boolean {
    return types.includes(this.peek().type)
  }

  private expect(type: TokenType, message?: string): Token {
    if (this.peek().type !== type) {
      throw new FormulaError(
        message || `Expected ${type}, got ${this.peek().type}`,
        'PARSE_ERROR',
        this.peek().position
      )
    }
    return this.advance()
  }

  parse(): ASTNode {
    const expr = this.parseExpression()
    if (this.peek().type !== 'EOF') {
      throw new FormulaError(
        `Unexpected token: ${this.peek().value}`,
        'PARSE_ERROR',
        this.peek().position
      )
    }
    return expr
  }

  private parseExpression(): ASTNode {
    return this.parseComparison()
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive()

    while (this.match('COMPARISON')) {
      const operator = this.advance().value
      const right = this.parseAdditive()
      left = {
        type: 'binary',
        operator,
        left,
        right,
      }
    }

    return left
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative()

    while (this.match('OPERATOR') && ['+', '-'].includes(this.peek().value)) {
      const operator = this.advance().value
      const right = this.parseMultiplicative()
      left = {
        type: 'binary',
        operator,
        left,
        right,
      }
    }

    return left
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary()

    while (this.match('OPERATOR') && ['*', '/', '%'].includes(this.peek().value)) {
      const operator = this.advance().value
      const right = this.parseUnary()
      left = {
        type: 'binary',
        operator,
        left,
        right,
      }
    }

    return left
  }

  private parseUnary(): ASTNode {
    if (this.match('OPERATOR') && this.peek().value === '-') {
      this.advance()
      const operand = this.parseUnary()
      return {
        type: 'unary',
        operator: '-',
        operand,
      }
    }
    return this.parseMemberAccess()
  }

  private parseMemberAccess(): ASTNode {
    let expr = this.parsePrimary()

    while (this.match('DOT')) {
      this.advance() // consume '.'
      const property = this.expect('IDENTIFIER', 'Expected property name after .').value
      expr = {
        type: 'member',
        object: expr,
        property,
      }
    }

    return expr
  }

  private parsePrimary(): ASTNode {
    const token = this.peek()

    // Number literal
    if (token.type === 'NUMBER') {
      this.advance()
      return {
        type: 'literal',
        value: parseFloat(token.value),
        dataType: 'number',
      }
    }

    // String literal
    if (token.type === 'STRING') {
      this.advance()
      return {
        type: 'literal',
        value: token.value,
        dataType: 'string',
      }
    }

    // Mention reference (@name)
    if (token.type === 'AT') {
      this.advance()
      const name = this.expect('IDENTIFIER', 'Expected identifier after @').value
      return {
        type: 'mention',
        name,
      }
    }

    // Identifier (function call or field reference)
    if (token.type === 'IDENTIFIER') {
      const name = this.advance().value

      // Check for function call
      if (this.match('LPAREN')) {
        this.advance() // consume '('
        const args: ASTNode[] = []

        if (!this.match('RPAREN')) {
          args.push(this.parseExpression())
          while (this.match('COMMA')) {
            this.advance() // consume ','
            args.push(this.parseExpression())
          }
        }

        this.expect('RPAREN', 'Expected ) after function arguments')
        return {
          type: 'call',
          name,
          arguments: args,
        }
      }

      // Field reference
      return {
        type: 'identifier',
        name,
      }
    }

    // Parenthesized expression
    if (token.type === 'LPAREN') {
      this.advance()
      const expr = this.parseExpression()
      this.expect('RPAREN', 'Expected )')
      return expr
    }

    throw new FormulaError(
      `Unexpected token: ${token.type}`,
      'PARSE_ERROR',
      token.position
    )
  }
}

// ============================================================================
// EVALUATOR
// ============================================================================

async function evaluateNode(node: ASTNode, context: FormulaContext): Promise<unknown> {
  switch (node.type) {
    case 'literal':
      return node.value

    case 'identifier':
      // First check if it's a field in the context
      if (node.name in context.fields) {
        return context.fields[node.name]
      }
      // Could be a string literal for function args
      return node.name

    case 'mention': {
      // Try to find in context mentions first
      const mention = context.mentions.find(
        (m) => m.label.toLowerCase() === node.name.toLowerCase()
      )
      if (mention) {
        return mention
      }
      // Try to resolve dynamically (no type hint available in formula context)
      const resolved = await resolveMention(node.name)
      if (resolved && resolved.entity) {
        return resolved.entity
      }
      return node.name // Return as string if not found
    }

    case 'call': {
      const fnDef = getFunction(node.name)
      if (!fnDef) {
        throw new FormulaError(
          `Unknown function: ${node.name}`,
          'UNKNOWN_FUNCTION'
        )
      }

      // Evaluate arguments
      const args: unknown[] = []
      for (const arg of node.arguments) {
        args.push(await evaluateNode(arg, context))
      }

      // Call the function
      if (fnDef.isAsync) {
        return await (fnDef.implementation as (args: unknown[], ctx: FormulaContext) => Promise<unknown>)(args, context)
      } else {
        return (fnDef.implementation as (args: unknown[], ctx: FormulaContext) => unknown)(args, context)
      }
    }

    case 'binary': {
      const left = await evaluateNode(node.left, context)
      const right = await evaluateNode(node.right, context)

      switch (node.operator) {
        // Arithmetic
        case '+':
          if (typeof left === 'string' || typeof right === 'string') {
            return String(left) + String(right)
          }
          return (left as number) + (right as number)
        case '-':
          return (left as number) - (right as number)
        case '*':
          return (left as number) * (right as number)
        case '/':
          if (right === 0) throw new FormulaError('Division by zero', 'DIVISION_BY_ZERO')
          return (left as number) / (right as number)
        case '%':
          return (left as number) % (right as number)

        // Comparison
        case '=':
        case '==':
          return left === right
        case '!=':
        case '<>':
          return left !== right
        case '<':
          return (left as number) < (right as number)
        case '>':
          return (left as number) > (right as number)
        case '<=':
          return (left as number) <= (right as number)
        case '>=':
          return (left as number) >= (right as number)

        default:
          throw new FormulaError(`Unknown operator: ${node.operator}`, 'PARSE_ERROR')
      }
    }

    case 'unary': {
      const operand = await evaluateNode(node.operand, context)
      if (node.operator === '-') {
        return -(operand as number)
      }
      throw new FormulaError(`Unknown unary operator: ${node.operator}`, 'PARSE_ERROR')
    }

    case 'member': {
      const obj = await evaluateNode(node.object, context)
      if (obj === null || obj === undefined) {
        return undefined
      }
      if (typeof obj === 'object') {
        const record = obj as Record<string, unknown>
        // Check properties first (for MentionableEntity)
        if ('properties' in record && typeof record.properties === 'object' && record.properties !== null) {
          const props = record.properties as Record<string, unknown>
          if (node.property in props) {
            return props[node.property]
          }
        }
        // Then check direct properties
        return record[node.property]
      }
      return undefined
    }

    default:
      throw new FormulaError(`Unknown AST node type`, 'PARSE_ERROR')
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parse a formula string into an AST
 */
export function parseFormula(expression: string): ParsedFormula {
  try {
    const tokens = tokenize(expression)
    const parser = new Parser(tokens)
    const ast = parser.parse()

    // Extract dependencies
    const dependencies: string[] = []
    const extractDeps = (node: ASTNode) => {
      if (node.type === 'identifier') {
        dependencies.push(node.name)
      } else if (node.type === 'mention') {
        dependencies.push(`@${node.name}`)
      } else if (node.type === 'call') {
        node.arguments.forEach(extractDeps)
      } else if (node.type === 'binary') {
        extractDeps(node.left)
        extractDeps(node.right)
      } else if (node.type === 'unary') {
        extractDeps(node.operand)
      } else if (node.type === 'member') {
        extractDeps(node.object)
      }
    }
    extractDeps(ast)

    return {
      expression,
      ast,
      dependencies: [...new Set(dependencies)],
    }
  } catch (error) {
    if (isFormulaError(error)) {
      throw error
    }
    throw new FormulaError(
      `Failed to parse formula: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PARSE_ERROR'
    )
  }
}

/**
 * Evaluate a formula with the given context
 */
export async function evaluateFormula(
  expression: string,
  context: FormulaContext
): Promise<FormulaResult> {
  const startTime = Date.now()

  try {
    const parsed = parseFormula(expression)
    const value = await evaluateNode(parsed.ast, context)
    const valueType = getValueType(value)

    return {
      success: true,
      value,
      valueType,
      displayValue: formatDisplayValue(value, valueType),
      dependencies: parsed.dependencies,
      evaluationTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage = error instanceof FormulaError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Unknown error'

    return {
      success: false,
      value: null,
      valueType: 'null',
      displayValue: `#ERROR: ${errorMessage}`,
      error: errorMessage,
      dependencies: [],
      evaluationTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Create a default formula context
 */
export function createFormulaContext(
  overrides: Partial<FormulaContext> = {}
): FormulaContext {
  return {
    mentions: [],
    fields: {},
    siblings: [],
    settings: {},
    currentStrandPath: '',
    currentBlockId: '',
    now: new Date(),
    ...overrides,
  }
}

/**
 * Get all available functions for autocomplete
 */
export function getAvailableFunctions(): FunctionDefinition[] {
  return BUILTIN_FUNCTIONS
}

/**
 * Suggest formulas based on current context
 */
export function suggestFormulas(context: FormulaContext): string[] {
  const suggestions: string[] = []

  // Suggest date functions
  suggestions.push('Now()', 'Today()')

  // If there are mentions, suggest functions that use them
  const places = context.mentions.filter(m => m.type === 'place')
  if (places.length >= 2) {
    suggestions.push(`Route(@${places[0].label}, @${places[1].label})`)
    suggestions.push(`Distance(@${places[0].label}, @${places[1].label})`)
  }

  const dates = context.mentions.filter(m => m.type === 'date')
  if (dates.length > 0 && places.length > 0) {
    suggestions.push(`Weather(@${places[0].label}, @${dates[0].label})`)
  }

  // If there are numeric fields, suggest aggregations
  const numericFields = Object.entries(context.fields)
    .filter(([, v]) => typeof v === 'number')
    .map(([k]) => k)

  if (numericFields.length > 0) {
    suggestions.push(`Sum(${numericFields.map(f => f).join(', ')})`)
    suggestions.push(`Average(${numericFields.map(f => f).join(', ')})`)
  }

  // If there are siblings, suggest aggregate functions
  if (context.siblings.length > 0) {
    suggestions.push('Count(siblings)')
    suggestions.push('SumField(siblings, "fieldName")')
  }

  return suggestions
}

// Re-export types
export type { FormulaContext, FormulaResult, ParsedFormula, ASTNode, FunctionDefinition }
export { FormulaError, isFormulaError } from './types'


