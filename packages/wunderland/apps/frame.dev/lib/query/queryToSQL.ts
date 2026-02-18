/**
 * Query to SQL Converter
 * @module lib/query/queryToSQL
 *
 * Converts query AST nodes to SQL for execution against SQLite.
 * Generates optimized queries with proper indexing.
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
} from './types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Generated SQL query with parameters
 */
export interface GeneratedSQL {
  /** The SQL query string */
  sql: string
  /** Parameter values for prepared statement */
  params: unknown[]
  /** Whether this is a block query (vs strand query) */
  isBlockQuery: boolean
  /** COUNT query for total results */
  countSql?: string
}

// ============================================================================
// SQL GENERATION
// ============================================================================

/**
 * Convert query AST to SQL
 */
export function queryToSQL(root: RootQueryNode): GeneratedSQL {
  const params: unknown[] = []
  let isBlockQuery = false

  // Detect if this is a block-level query
  function detectBlockQuery(node: QueryNode): boolean {
    switch (node.type) {
      case 'root':
        return (node as RootQueryNode).children.some(detectBlockQuery)
      case 'and':
        return detectBlockQuery((node as AndQueryNode).left) || detectBlockQuery((node as AndQueryNode).right)
      case 'or':
        return detectBlockQuery((node as OrQueryNode).left) || detectBlockQuery((node as OrQueryNode).right)
      case 'not':
        return detectBlockQuery((node as NotQueryNode).child)
      case 'group':
        return detectBlockQuery((node as GroupQueryNode).child)
      case 'type':
        const targetType = (node as TypeQueryNode).targetType
        return ['block', 'heading', 'paragraph', 'code', 'list', 'blockquote', 'table'].includes(targetType)
      case 'field':
        const field = (node as FieldQueryNode).field
        return ['block_type', 'heading_level', 'worthiness', 'start_line', 'end_line'].includes(field)
      case 'supertag':
        return true // Supertags are block-level
      default:
        return false
    }
  }

  isBlockQuery = detectBlockQuery(root)

  // Build WHERE clause
  function buildWhere(node: QueryNode): string {
    switch (node.type) {
      case 'root': {
        const clauses = (node as RootQueryNode).children
          .map(buildWhere)
          .filter(c => c.length > 0)
        return clauses.length > 0 ? clauses.join(' AND ') : '1=1'
      }

      case 'and': {
        const and = node as AndQueryNode
        return `(${buildWhere(and.left)} AND ${buildWhere(and.right)})`
      }

      case 'or': {
        const or = node as OrQueryNode
        return `(${buildWhere(or.left)} OR ${buildWhere(or.right)})`
      }

      case 'not': {
        const not = node as NotQueryNode
        return `NOT (${buildWhere(not.child)})`
      }

      case 'group': {
        const group = node as GroupQueryNode
        return `(${buildWhere(group.child)})`
      }

      case 'text': {
        const text = node as TextQueryNode
        if (text.exact) {
          if (isBlockQuery) {
            params.push(`%${text.value}%`)
            return `sb.raw_content LIKE ?`
          }
          params.push(`%${text.value}%`, `%${text.value}%`)
          return `(s.title LIKE ? OR s.content LIKE ?)`
        }
        // Full-text search using LIKE for each word
        const words = text.value.split(/\s+/).filter(w => w.length > 0)
        const clauses = words.map(word => {
          if (isBlockQuery) {
            params.push(`%${word}%`)
            return `sb.raw_content LIKE ?`
          }
          params.push(`%${word}%`, `%${word}%`)
          return `(s.title LIKE ? OR s.content LIKE ?)`
        })
        return clauses.length > 0 ? `(${clauses.join(' AND ')})` : '1=1'
      }

      case 'tag': {
        const tag = node as TagQueryNode
        const column = isBlockQuery ? 'sb.tags' : 's.tags'
        params.push(`%"${tag.tagName}"%`)
        if (tag.exclude) {
          return `(${column} NOT LIKE ? OR ${column} IS NULL)`
        }
        return `${column} LIKE ?`
      }

      case 'field': {
        const field = node as FieldQueryNode
        return buildFieldComparison(field, isBlockQuery, params)
      }

      case 'supertag': {
        const supertag = node as SupertagQueryNode
        // Join with supertag_field_values
        let clause = `EXISTS (
          SELECT 1 FROM supertag_field_values sfv
          JOIN supertag_schemas ss ON ss.id = sfv.supertag_id
          WHERE sfv.block_id = sb.id
          AND ss.tag_name = ?
        )`
        params.push(supertag.tagName)

        // Add field conditions
        if (supertag.fields && supertag.fields.length > 0) {
          const fieldClauses = supertag.fields.map(f => {
            const op = getOperatorSQL(f.operator)
            const valueParam = f.operator === '~' || f.operator === '!~'
              ? `%${f.value}%`
              : JSON.stringify(f.value)
            params.push(f.name, valueParam)
            if (f.operator === '~') {
              return `(sfv.field_name = ? AND sfv.field_value LIKE ?)`
            }
            if (f.operator === '!~') {
              return `(sfv.field_name = ? AND sfv.field_value NOT LIKE ?)`
            }
            return `(sfv.field_name = ? AND sfv.field_value ${op} ?)`
          })
          clause = `EXISTS (
            SELECT 1 FROM supertag_field_values sfv
            JOIN supertag_schemas ss ON ss.id = sfv.supertag_id
            WHERE sfv.block_id = sb.id
            AND ss.tag_name = ?
            AND (${fieldClauses.join(' AND ')})
          )`
        }

        return clause
      }

      case 'type': {
        const typeNode = node as TypeQueryNode
        if (typeNode.targetType === 'strand') {
          return '1=1' // All strands match
        }
        if (typeNode.targetType === 'block') {
          return '1=1' // All blocks match
        }
        // Specific block type
        params.push(typeNode.targetType)
        return `sb.block_type = ?`
      }

      case 'date': {
        const date = node as DateQueryNode
        const column = isBlockQuery
          ? (date.field === 'created' ? 'sb.created_at' : 'sb.updated_at')
          : (date.field === 'created' ? 's.created_at' : 's.updated_at')
        const op = getOperatorSQL(date.operator)
        params.push(date.value)
        return `${column} ${op} ?`
      }

      default:
        return '1=1'
    }
  }

  // Build the base query
  const whereClause = buildWhere(root)

  let sql: string
  let countSql: string

  if (isBlockQuery) {
    // Block-level query
    sql = `
      SELECT
        sb.id,
        sb.block_id,
        sb.strand_path,
        sb.block_type,
        sb.raw_content as content,
        sb.extractive_summary as summary,
        sb.heading_level,
        sb.tags,
        sb.worthiness_score,
        sb.start_line,
        sb.end_line,
        sb.created_at,
        sb.updated_at,
        s.title as strand_title
      FROM strand_blocks sb
      JOIN strands s ON s.id = sb.strand_id
      WHERE ${whereClause}
    `
    countSql = `
      SELECT COUNT(*) as total
      FROM strand_blocks sb
      JOIN strands s ON s.id = sb.strand_id
      WHERE ${whereClause}
    `
  } else {
    // Strand-level query
    sql = `
      SELECT
        s.id,
        s.path,
        s.title,
        s.summary,
        s.content,
        s.word_count,
        s.subjects,
        s.topics,
        s.tags,
        s.difficulty,
        s.created_at,
        s.updated_at,
        w.slug as weave,
        l.slug as loom
      FROM strands s
      LEFT JOIN weaves w ON w.id = s.weave_id
      LEFT JOIN looms l ON l.id = s.loom_id
      WHERE ${whereClause}
    `
    countSql = `
      SELECT COUNT(*) as total
      FROM strands s
      LEFT JOIN weaves w ON w.id = s.weave_id
      LEFT JOIN looms l ON l.id = s.loom_id
      WHERE ${whereClause}
    `
  }

  // Add sorting
  if (root.sort) {
    const sortField = getSortColumn(root.sort.field, isBlockQuery)
    sql += ` ORDER BY ${sortField} ${root.sort.direction.toUpperCase()}`
  } else {
    // Default sort by relevance (updated_at for now)
    sql += isBlockQuery
      ? ' ORDER BY sb.updated_at DESC'
      : ' ORDER BY s.updated_at DESC'
  }

  // Add pagination
  const limit = root.limit || 20
  const offset = root.offset || 0
  sql += ` LIMIT ? OFFSET ?`
  params.push(limit, offset)

  return {
    sql: sql.trim(),
    params,
    isBlockQuery,
    countSql: countSql.trim(),
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build SQL for field comparison
 */
function buildFieldComparison(
  field: FieldQueryNode,
  isBlockQuery: boolean,
  params: unknown[]
): string {
  const op = getOperatorSQL(field.operator)

  // Map field names to columns
  const columnMap: Record<string, { strand: string; block: string }> = {
    title: { strand: 's.title', block: 's.title' },
    content: { strand: 's.content', block: 'sb.raw_content' },
    summary: { strand: 's.summary', block: 'sb.extractive_summary' },
    weave: { strand: 'w.slug', block: 'w.slug' },
    loom: { strand: 'l.slug', block: 'l.slug' },
    path: { strand: 's.path', block: 'sb.strand_path' },
    difficulty: { strand: 's.difficulty', block: 's.difficulty' },
    status: { strand: 's.status', block: 's.status' },
    word_count: { strand: 's.word_count', block: 's.word_count' },
    block_type: { strand: "'strand'", block: 'sb.block_type' },
    heading_level: { strand: '0', block: 'sb.heading_level' },
    worthiness: { strand: '0', block: 'sb.worthiness_score' },
  }

  const mapping = columnMap[field.field]
  if (!mapping) {
    // Unknown field, try as-is
    const column = isBlockQuery ? `sb.${field.field}` : `s.${field.field}`
    if (field.operator === '~') {
      params.push(`%${field.value}%`)
      return `${column} LIKE ?`
    }
    if (field.operator === '!~') {
      params.push(`%${field.value}%`)
      return `${column} NOT LIKE ?`
    }
    params.push(field.value)
    return `${column} ${op} ?`
  }

  const column = isBlockQuery ? mapping.block : mapping.strand

  // Handle different operators
  if (field.operator === '~') {
    params.push(`%${field.value}%`)
    return `${column} LIKE ?`
  }
  if (field.operator === '!~') {
    params.push(`%${field.value}%`)
    return `${column} NOT LIKE ?`
  }
  if (field.operator === '^') {
    params.push(`${field.value}%`)
    return `${column} LIKE ?`
  }
  if (field.operator === '$') {
    params.push(`%${field.value}`)
    return `${column} LIKE ?`
  }

  params.push(field.value)
  return `${column} ${op} ?`
}

/**
 * Get SQL operator from comparison operator
 */
function getOperatorSQL(op: ComparisonOperator): string {
  switch (op) {
    case '=': return '='
    case '!=': return '!='
    case '>': return '>'
    case '<': return '<'
    case '>=': return '>='
    case '<=': return '<='
    case '~': return 'LIKE'
    case '!~': return 'NOT LIKE'
    case '^': return 'LIKE'
    case '$': return 'LIKE'
    default: return '='
  }
}

/**
 * Get sort column name
 */
function getSortColumn(field: string, isBlockQuery: boolean): string {
  const sortMap: Record<string, { strand: string; block: string }> = {
    title: { strand: 's.title', block: 's.title' },
    created: { strand: 's.created_at', block: 'sb.created_at' },
    created_at: { strand: 's.created_at', block: 'sb.created_at' },
    updated: { strand: 's.updated_at', block: 'sb.updated_at' },
    updated_at: { strand: 's.updated_at', block: 'sb.updated_at' },
    worthiness: { strand: 's.word_count', block: 'sb.worthiness_score' },
    word_count: { strand: 's.word_count', block: 's.word_count' },
    path: { strand: 's.path', block: 'sb.strand_path' },
  }

  const mapping = sortMap[field]
  if (mapping) {
    return isBlockQuery ? mapping.block : mapping.strand
  }

  return isBlockQuery ? 'sb.updated_at' : 's.updated_at'
}
