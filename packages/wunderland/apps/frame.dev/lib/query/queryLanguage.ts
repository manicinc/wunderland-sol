/**
 * Query Language Parser
 * @module lib/query/queryLanguage
 *
 * Parses query strings into AST nodes for execution.
 *
 * Syntax examples:
 * - "react hooks"                     // Text search
 * - #typescript                        // Tag filter
 * - -#draft                            // Exclude tag
 * - #task status:done                  // Supertag with field
 * - type:code language:python          // Field queries
 * - weave:technology                   // Hierarchy filter
 * - created:>2024-01-01                // Date comparison
 * - "exact phrase" AND #important      // Boolean operators
 * - (react OR vue) AND #frontend       // Grouping
 * - worthiness:>0.7                    // Numeric comparison
 * - @sort:updated desc @limit:20       // Sort and pagination
 */

import type {
  QueryNode,
  RootQueryNode,
  TextQueryNode,
  TagQueryNode,
  FieldQueryNode,
  SupertagQueryNode,
  TypeQueryNode,
  DateQueryNode,
  AndQueryNode,
  OrQueryNode,
  NotQueryNode,
  GroupQueryNode,
  ComparisonOperator,
  SortClause,
  SortDirection,
} from './types'

// ============================================================================
// TOKEN TYPES
// ============================================================================

type TokenType =
  | 'TEXT'
  | 'QUOTED'
  | 'TAG'
  | 'FIELD'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LPAREN'
  | 'RPAREN'
  | 'SORT'
  | 'LIMIT'
  | 'OFFSET'
  | 'EOF'

interface Token {
  type: TokenType
  value: string
  position: number
}

// ============================================================================
// LEXER
// ============================================================================

/**
 * Tokenize query string
 */
function tokenize(query: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < query.length) {
    // Skip whitespace
    if (/\s/.test(query[i])) {
      i++
      continue
    }

    // Quoted string
    if (query[i] === '"') {
      const start = i
      i++ // Skip opening quote
      let value = ''
      while (i < query.length && query[i] !== '"') {
        value += query[i]
        i++
      }
      i++ // Skip closing quote
      tokens.push({ type: 'QUOTED', value, position: start })
      continue
    }

    // Parentheses
    if (query[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position: i })
      i++
      continue
    }
    if (query[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position: i })
      i++
      continue
    }

    // Tag (# or -#)
    if (query[i] === '#' || (query[i] === '-' && query[i + 1] === '#')) {
      const start = i
      const exclude = query[i] === '-'
      if (exclude) i++
      i++ // Skip #
      let value = ''
      while (i < query.length && /[\w-]/.test(query[i])) {
        value += query[i]
        i++
      }
      tokens.push({ type: 'TAG', value: (exclude ? '-' : '') + value, position: start })
      continue
    }

    // Control directives (@sort, @limit, @offset)
    if (query[i] === '@') {
      const start = i
      i++ // Skip @
      let directive = ''
      while (i < query.length && /[\w]/.test(query[i])) {
        directive += query[i]
        i++
      }
      // Skip : if present
      if (query[i] === ':') i++
      // Get value
      let value = ''
      while (i < query.length && !/\s/.test(query[i])) {
        value += query[i]
        i++
      }
      // For sort directive, also capture optional direction (asc/desc)
      if (directive === 'sort') {
        // Skip whitespace
        while (i < query.length && /\s/.test(query[i])) i++
        // Check for direction keyword
        const dirStart = i
        let possibleDir = ''
        while (i < query.length && /[a-zA-Z]/.test(query[i])) {
          possibleDir += query[i]
          i++
        }
        if (possibleDir.toLowerCase() === 'asc' || possibleDir.toLowerCase() === 'desc') {
          value += ' ' + possibleDir.toLowerCase()
        } else {
          // Reset position if not a direction keyword
          i = dirStart
        }
        tokens.push({ type: 'SORT', value, position: start })
      } else if (directive === 'limit') {
        tokens.push({ type: 'LIMIT', value, position: start })
      } else if (directive === 'offset') {
        tokens.push({ type: 'OFFSET', value, position: start })
      }
      continue
    }

    // Word (including field:value patterns)
    const start = i
    let word = ''
    while (i < query.length && !/[\s()"]/.test(query[i])) {
      word += query[i]
      i++
    }

    // Check for boolean operators
    const upper = word.toUpperCase()
    if (upper === 'AND') {
      tokens.push({ type: 'AND', value: word, position: start })
    } else if (upper === 'OR') {
      tokens.push({ type: 'OR', value: word, position: start })
    } else if (upper === 'NOT') {
      tokens.push({ type: 'NOT', value: word, position: start })
    } else if (word.includes(':')) {
      // Field:value pattern
      tokens.push({ type: 'FIELD', value: word, position: start })
    } else {
      tokens.push({ type: 'TEXT', value: word, position: start })
    }
  }

  tokens.push({ type: 'EOF', value: '', position: query.length })
  return tokens
}

// ============================================================================
// PARSER
// ============================================================================

class QueryParser {
  private tokens: Token[]
  private current: number = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): RootQueryNode {
    const children: QueryNode[] = []
    let sort: SortClause | undefined
    let limit: number | undefined
    let offset: number | undefined

    while (!this.isAtEnd()) {
      const token = this.peek()

      // Handle control directives
      if (token.type === 'SORT') {
        this.advance()
        const [field, dir] = token.value.split(/\s+/)
        sort = {
          field: field as any,
          direction: (dir?.toLowerCase() === 'desc' ? 'desc' : 'asc') as SortDirection,
        }
        continue
      }
      if (token.type === 'LIMIT') {
        this.advance()
        limit = parseInt(token.value, 10) || 20
        continue
      }
      if (token.type === 'OFFSET') {
        this.advance()
        offset = parseInt(token.value, 10) || 0
        continue
      }

      // Parse expression
      const expr = this.parseExpression()
      if (expr) {
        children.push(expr)
      }
    }

    return {
      type: 'root',
      children,
      sort,
      limit,
      offset,
    }
  }

  private parseExpression(): QueryNode | null {
    return this.parseOr()
  }

  private parseOr(): QueryNode | null {
    let left = this.parseAnd()

    while (this.match('OR')) {
      const right = this.parseAnd()
      if (left && right) {
        left = { type: 'or', left, right } as OrQueryNode
      }
    }

    return left
  }

  private parseAnd(): QueryNode | null {
    let left = this.parseNot()

    while (this.match('AND')) {
      const right = this.parseNot()
      if (left && right) {
        left = { type: 'and', left, right } as AndQueryNode
      }
    }

    return left
  }

  private parseNot(): QueryNode | null {
    if (this.match('NOT')) {
      const child = this.parsePrimary()
      if (child) {
        return { type: 'not', child } as NotQueryNode
      }
    }

    return this.parsePrimary()
  }

  private parsePrimary(): QueryNode | null {
    const token = this.peek()

    // Grouped expression
    if (this.match('LPAREN')) {
      const child = this.parseExpression()
      this.expect('RPAREN')
      if (child) {
        return { type: 'group', child } as GroupQueryNode
      }
      return null
    }

    // Tag
    if (token.type === 'TAG') {
      this.advance()
      const exclude = token.value.startsWith('-')
      const tagName = exclude ? token.value.slice(1) : token.value

      // Check for supertag field queries (e.g., #task status:done priority:high)
      const fields: Array<{ name: string; operator: ComparisonOperator; value: unknown }> = []
      while (this.peek().type === 'FIELD') {
        const fieldToken = this.advance()
        const parsed = this.parseFieldValue(fieldToken.value)
        if (parsed) {
          fields.push({
            name: parsed.field,
            operator: parsed.operator,
            value: parsed.value,
          })
        }
      }

      if (fields.length > 0) {
        return {
          type: 'supertag',
          tagName,
          fields,
        } as SupertagQueryNode
      }

      return {
        type: 'tag',
        tagName,
        exclude,
      } as TagQueryNode
    }

    // Field query
    if (token.type === 'FIELD') {
      this.advance()
      const parsed = this.parseFieldValue(token.value)
      if (!parsed) return null

      // Special handling for type field
      if (parsed.field === 'type') {
        return {
          type: 'type',
          targetType: parsed.value as any,
        } as TypeQueryNode
      }

      // Special handling for date fields
      if (['created', 'updated', 'created_at', 'updated_at'].includes(parsed.field)) {
        return {
          type: 'date',
          field: parsed.field.replace('_at', '') as 'created' | 'updated',
          operator: parsed.operator,
          value: parsed.value as string,
        } as DateQueryNode
      }

      return {
        type: 'field',
        field: parsed.field,
        operator: parsed.operator,
        value: parsed.value,
      } as FieldQueryNode
    }

    // Quoted text
    if (token.type === 'QUOTED') {
      this.advance()
      return {
        type: 'text',
        value: token.value,
        exact: true,
      } as TextQueryNode
    }

    // Plain text
    if (token.type === 'TEXT') {
      this.advance()
      return {
        type: 'text',
        value: token.value,
      } as TextQueryNode
    }

    return null
  }

  private parseFieldValue(fieldValue: string): {
    field: string
    operator: ComparisonOperator
    value: unknown
  } | null {
    // Parse field:operator:value or field:value patterns
    // Examples: status:done, priority:>=high, worthiness:>0.7

    // Extract operator
    const operatorMatch = fieldValue.match(/^([^:]+):([!><=~^$]+)?(.*)$/)
    if (!operatorMatch) return null

    const field = operatorMatch[1]
    let operator: ComparisonOperator = '='
    let value: unknown = operatorMatch[3] || operatorMatch[2]

    // Parse operator from prefix
    const opStr = operatorMatch[2] || ''
    if (opStr.startsWith('>=')) {
      operator = '>='
      value = operatorMatch[3]
    } else if (opStr.startsWith('<=')) {
      operator = '<='
      value = operatorMatch[3]
    } else if (opStr.startsWith('!=')) {
      operator = '!='
      value = operatorMatch[3]
    } else if (opStr.startsWith('!~')) {
      operator = '!~'
      value = operatorMatch[3]
    } else if (opStr === '>') {
      operator = '>'
      value = operatorMatch[3]
    } else if (opStr === '<') {
      operator = '<'
      value = operatorMatch[3]
    } else if (opStr === '~') {
      operator = '~'
      value = operatorMatch[3]
    } else if (opStr === '^') {
      operator = '^'
      value = operatorMatch[3]
    } else if (opStr === '$') {
      operator = '$'
      value = operatorMatch[3]
    }

    // Parse value type
    if (value === 'true') value = true
    else if (value === 'false') value = false
    else if (value === 'null') value = null
    else if (/^-?\d+(\.\d+)?$/.test(value as string)) value = parseFloat(value as string)

    return { field, operator, value }
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++
    return this.tokens[this.current - 1]
  }

  private match(type: TokenType): boolean {
    if (this.peek().type === type) {
      this.advance()
      return true
    }
    return false
  }

  private expect(type: TokenType): Token {
    if (this.peek().type !== type) {
      throw new Error(`Expected ${type} but got ${this.peek().type}`)
    }
    return this.advance()
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF'
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parse a query string into an AST
 */
export function parseQuery(query: string): RootQueryNode {
  const tokens = tokenize(query.trim())
  const parser = new QueryParser(tokens)
  return parser.parse()
}

/**
 * Serialize an AST back to a query string
 */
export function serializeQuery(node: QueryNode): string {
  switch (node.type) {
    case 'root': {
      const root = node as RootQueryNode
      let query = root.children.map(serializeQuery).join(' ')
      if (root.sort) {
        query += ` @sort:${root.sort.field} ${root.sort.direction}`
      }
      if (root.limit) {
        query += ` @limit:${root.limit}`
      }
      if (root.offset) {
        query += ` @offset:${root.offset}`
      }
      return query.trim()
    }
    case 'and': {
      const and = node as AndQueryNode
      return `${serializeQuery(and.left)} AND ${serializeQuery(and.right)}`
    }
    case 'or': {
      const or = node as OrQueryNode
      return `${serializeQuery(or.left)} OR ${serializeQuery(or.right)}`
    }
    case 'not': {
      const not = node as NotQueryNode
      return `NOT ${serializeQuery(not.child)}`
    }
    case 'group': {
      const group = node as GroupQueryNode
      return `(${serializeQuery(group.child)})`
    }
    case 'text': {
      const text = node as TextQueryNode
      return text.exact ? `"${text.value}"` : text.value
    }
    case 'tag': {
      const tag = node as TagQueryNode
      return `${tag.exclude ? '-' : ''}#${tag.tagName}`
    }
    case 'field': {
      const field = node as FieldQueryNode
      return `${field.field}:${field.operator === '=' ? '' : field.operator}${field.value}`
    }
    case 'supertag': {
      const supertag = node as SupertagQueryNode
      let query = `#${supertag.tagName}`
      if (supertag.fields) {
        for (const f of supertag.fields) {
          query += ` ${f.name}:${f.operator === '=' ? '' : f.operator}${f.value}`
        }
      }
      return query
    }
    case 'type': {
      const type = node as TypeQueryNode
      return `type:${type.targetType}`
    }
    case 'date': {
      const date = node as DateQueryNode
      return `${date.field}:${date.operator}${date.value}`
    }
    default:
      return ''
  }
}

/**
 * Validate a query string
 */
export function validateQuery(query: string): { valid: boolean; error?: string } {
  try {
    parseQuery(query)
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid query syntax',
    }
  }
}

/**
 * Extract tags from a query (for quick filtering UI)
 */
export function extractTags(node: QueryNode): string[] {
  const tags: string[] = []

  function walk(n: QueryNode) {
    switch (n.type) {
      case 'root':
        (n as RootQueryNode).children.forEach(walk)
        break
      case 'and':
        walk((n as AndQueryNode).left)
        walk((n as AndQueryNode).right)
        break
      case 'or':
        walk((n as OrQueryNode).left)
        walk((n as OrQueryNode).right)
        break
      case 'not':
        walk((n as NotQueryNode).child)
        break
      case 'group':
        walk((n as GroupQueryNode).child)
        break
      case 'tag':
        if (!(n as TagQueryNode).exclude) {
          tags.push((n as TagQueryNode).tagName)
        }
        break
      case 'supertag':
        tags.push((n as SupertagQueryNode).tagName)
        break
    }
  }

  walk(node)
  return [...new Set(tags)]
}

/**
 * Extract text terms from a query
 */
export function extractTextTerms(node: QueryNode): string[] {
  const terms: string[] = []

  function walk(n: QueryNode) {
    switch (n.type) {
      case 'root':
        (n as RootQueryNode).children.forEach(walk)
        break
      case 'and':
        walk((n as AndQueryNode).left)
        walk((n as AndQueryNode).right)
        break
      case 'or':
        walk((n as OrQueryNode).left)
        walk((n as OrQueryNode).right)
        break
      case 'not':
        walk((n as NotQueryNode).child)
        break
      case 'group':
        walk((n as GroupQueryNode).child)
        break
      case 'text':
        terms.push((n as TextQueryNode).value)
        break
    }
  }

  walk(node)
  return terms
}
