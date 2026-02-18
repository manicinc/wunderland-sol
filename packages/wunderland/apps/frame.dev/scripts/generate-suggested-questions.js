#!/usr/bin/env node
/**
 * Generate suggested questions for Codex documents
 * 
 * HYBRID SYSTEM:
 * 1. Manual questions in YAML frontmatter take priority
 * 2. Auto-generated questions fill in for strands without manual ones
 * 
 * NOTE: This script mirrors the logic in lib/questions/generator.ts
 * The TypeScript module is used by:
 * - Server-side API (lib/api/routes/questions.ts)
 * - Client-side component (SuggestedQuestions.tsx)
 * 
 * This CommonJS script is used at build-time and kept in sync with the TS module.
 * 
 * Frontmatter schema:
 * ```yaml
 * ---
 * title: "My Strand"
 * suggestedQuestions:
 *   - question: "What is X?"
 *     difficulty: beginner
 *     tags: [concept, intro]
 *   - question: "How do I implement Y?"
 *     difficulty: intermediate
 * ---
 * ```
 * 
 * Auto-generation analyzes markdown content to determine:
 * - Content significance (word count, headings, code blocks)
 * - Topic complexity (technical terms, references)
 * - Difficulty level (sentence complexity, vocabulary)
 * 
 * Output: /assets/suggested-questions.json
 */

const fs = require('fs')
const path = require('path')

const CODEX_REPO_OWNER = process.env.NEXT_PUBLIC_CODEX_REPO_OWNER || 'framersai'
const CODEX_REPO_NAME = process.env.NEXT_PUBLIC_CODEX_REPO_NAME || 'codex'
const CODEX_REPO_BRANCH = process.env.NEXT_PUBLIC_CODEX_REPO_BRANCH || 'main'

/**
 * Parse YAML frontmatter from markdown content
 * Returns { frontmatter: object | null, content: string }
 */
function parseFrontmatter(markdown) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const match = markdown.match(frontmatterRegex)
  
  if (!match) {
    return { frontmatter: null, content: markdown }
  }
  
  const frontmatterStr = match[1]
  const content = markdown.slice(match[0].length)
  
  // Simple YAML parser for our use case
  try {
    const frontmatter = parseSimpleYaml(frontmatterStr)
    return { frontmatter, content }
  } catch (e) {
    console.warn('  ⚠️  Failed to parse frontmatter:', e.message)
    return { frontmatter: null, content: markdown }
  }
}

/**
 * Simple YAML parser for frontmatter
 * Handles: strings, arrays, objects, nested suggestedQuestions
 */
function parseSimpleYaml(yamlStr) {
  const result = {}
  const lines = yamlStr.split('\n')
  let currentKey = null
  let currentArray = null
  let currentArrayItem = null
  let inArray = false
  let arrayIndent = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    if (!trimmed || trimmed.startsWith('#')) continue
    
    // Check for array item start
    const arrayItemMatch = line.match(/^(\s*)- (.*)$/)
    if (arrayItemMatch && inArray) {
      // Save previous item if exists
      if (currentArrayItem !== null) {
        currentArray.push(currentArrayItem)
      }
      
      const itemContent = arrayItemMatch[2].trim()
      
      // Check if it's a key-value pair
      const kvMatch = itemContent.match(/^(\w+):\s*(.*)$/)
      if (kvMatch) {
        currentArrayItem = {}
        const value = kvMatch[2].trim()
        if (value) {
          // Handle inline arrays like [tag1, tag2]
          if (value.startsWith('[') && value.endsWith(']')) {
            currentArrayItem[kvMatch[1]] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
          } else {
            currentArrayItem[kvMatch[1]] = value.replace(/^["']|["']$/g, '')
          }
        }
      } else {
        // Simple string array item
        currentArrayItem = itemContent.replace(/^["']|["']$/g, '')
      }
      continue
    }
    
    // Check for nested key in array item
    const nestedKeyMatch = line.match(/^(\s+)(\w+):\s*(.*)$/)
    if (nestedKeyMatch && inArray && currentArrayItem !== null && typeof currentArrayItem === 'object') {
      const indent = nestedKeyMatch[1].length
      if (indent > arrayIndent) {
        const key = nestedKeyMatch[2]
        const value = nestedKeyMatch[3].trim()
        if (value) {
          // Handle inline arrays
          if (value.startsWith('[') && value.endsWith(']')) {
            currentArrayItem[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
          } else {
            currentArrayItem[key] = value.replace(/^["']|["']$/g, '')
          }
        }
        continue
      }
    }
    
    // Check for top-level key
    const keyMatch = trimmed.match(/^(\w+):\s*(.*)$/)
    if (keyMatch) {
      // Save current array if we were building one
      if (inArray && currentKey && currentArray) {
        if (currentArrayItem !== null) {
          currentArray.push(currentArrayItem)
        }
        result[currentKey] = currentArray
        inArray = false
        currentArray = null
        currentArrayItem = null
      }
      
      const key = keyMatch[1]
      const value = keyMatch[2].trim()
      
      if (!value) {
        // Could be start of array or nested object
        currentKey = key
        // Check next line to see if it's an array
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
          inArray = true
          currentArray = []
          currentArrayItem = null
          arrayIndent = lines[i + 1].match(/^(\s*)/)[1].length
        }
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        result[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
      } else {
        // Simple value
        result[key] = value.replace(/^["']|["']$/g, '')
      }
    }
  }
  
  // Save final array if we were building one
  if (inArray && currentKey && currentArray) {
    if (currentArrayItem !== null) {
      currentArray.push(currentArrayItem)
    }
    result[currentKey] = currentArray
  }
  
  return result
}

/**
 * Extract manual questions from frontmatter
 */
function extractManualQuestions(frontmatter) {
  if (!frontmatter || !frontmatter.suggestedQuestions) {
    return null
  }
  
  const questions = frontmatter.suggestedQuestions
  if (!Array.isArray(questions) || questions.length === 0) {
    return null
  }
  
  // Validate and normalize questions
  return questions
    .filter(q => q && (q.question || typeof q === 'string'))
    .map(q => {
      if (typeof q === 'string') {
        return { question: q, difficulty: 'intermediate', tags: [] }
      }
      return {
        question: q.question,
        difficulty: q.difficulty || 'intermediate',
        tags: Array.isArray(q.tags) ? q.tags : [],
      }
    })
}

/**
 * Analyze document to determine if it's worth generating questions for
 */
function analyzeDocument(content, docPath) {
  const words = content.trim().split(/\s+/).length
  const headings = (content.match(/^#{1,3}\s+.+$/gm) || []).length
  const codeBlocks = (content.match(/```/g) || []).length / 2
  const links = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length
  
  // Calculate significance score (0-100)
  let significance = 0
  significance += Math.min(words / 100, 30) // Length (max 30)
  significance += headings * 5 // Structure (5 pts per heading)
  significance += codeBlocks * 8 // Technical content (8 pts per code block)
  significance += links * 2 // References (2 pts per link)
  
  // Calculate difficulty (0-100)
  const avgWordLength = content.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / (words || 1)
  const technicalTerms = (content.match(/\b(API|SDK|CLI|HTTP|JSON|YAML|async|await|function|class|interface|type|const|let|var)\b/gi) || []).length
  
  let difficulty = 0
  difficulty += Math.min((avgWordLength - 4) * 10, 30) // Word complexity (max 30)
  difficulty += Math.min(technicalTerms / 5, 40) // Technical density (max 40)
  difficulty += Math.min(codeBlocks * 10, 30) // Code complexity (max 30)
  
  return {
    words,
    headings,
    codeBlocks,
    links,
    significance: Math.min(Math.round(significance), 100),
    difficulty: Math.min(Math.round(difficulty), 100),
  }
}

/**
 * Generate questions based on content analysis (auto-generation)
 */
function generateQuestions(content, docPath, analysis) {
  const questions = []
  
  // Only generate questions for significant content (score >= 20)
  if (analysis.significance < 20) {
    return questions
  }
  
  // Extract title from frontmatter or first heading
  const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/title:\s*["']?(.+?)["']?\s*$/m)
  const title = titleMatch ? titleMatch[1] : docPath.split('/').pop().replace(/\.md$/, '')
  
  // Extract key concepts (headings)
  const headings = [...content.matchAll(/^#{2,3}\s+(.+)$/gm)].map(m => m[1])
  
  // Generate 1-5 questions based on significance
  const questionCount = Math.min(
    Math.ceil(analysis.significance / 25),
    5
  )
  
  // Question templates based on difficulty and content type
  const templates = []
  
  if (analysis.difficulty < 40) {
    templates.push(
      `What is ${title}?`,
      `How does ${title} work?`,
      `When should I use ${title}?`
    )
  } else {
    templates.push(
      `How do I implement ${title}?`,
      `What are the key concepts in ${title}?`,
      `What is the difference between ${headings[0]} and ${headings[1]}?`
    )
  }
  
  if (analysis.codeBlocks > 0) {
    templates.push(
      `Show me an example of ${title}`,
      `How do I configure ${title}?`
    )
  }
  
  if (headings.length > 2) {
    templates.push(
      `Explain ${headings[0]}`,
      `What is ${headings[1]} used for?`
    )
  }
  
  // Randomly select questions (deterministic based on path hash)
  const hash = docPath.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
  const shuffled = templates.sort(() => ((hash * 9301 + 49297) % 233280) / 233280 - 0.5)
  
  return shuffled.slice(0, questionCount).map(q => ({
    question: q,
    difficulty: analysis.difficulty < 40 ? 'beginner' : analysis.difficulty < 70 ? 'intermediate' : 'advanced',
    tags: headings.slice(0, 3),
  }))
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 Generating suggested questions for Codex documents...')
  console.log('   Using HYBRID mode: manual frontmatter questions take priority\n')
  
  try {
    // Fetch codex-index.json to get all documents
    const indexUrl = `https://raw.githubusercontent.com/${CODEX_REPO_OWNER}/${CODEX_REPO_NAME}/${CODEX_REPO_BRANCH}/codex-index.json`
    const indexResponse = await fetch(indexUrl)
    
    if (!indexResponse.ok) {
      console.log('⚠️  codex-index.json not found (404). Skipping question generation.')
      console.log('   Run auto-indexer in the Codex repo first.')
      process.exit(0)
    }
    
    const indexData = await indexResponse.json()
    const suggestedQuestions = {}
    let manualCount = 0
    let autoCount = 0
    
    for (const doc of indexData) {
      if (!doc.path || !doc.path.endsWith('.md')) continue
      
      // Fetch document content
      const contentUrl = `https://raw.githubusercontent.com/${CODEX_REPO_OWNER}/${CODEX_REPO_NAME}/${CODEX_REPO_BRANCH}/${doc.path}`
      const contentResponse = await fetch(contentUrl)
      
      if (!contentResponse.ok) continue
      
      const rawContent = await contentResponse.text()
      const { frontmatter, content } = parseFrontmatter(rawContent)
      const analysis = analyzeDocument(content, doc.path)
      
      // Check for manual questions first
      const manualQuestions = extractManualQuestions(frontmatter)
      
      if (manualQuestions && manualQuestions.length > 0) {
        // Use manual questions from frontmatter
        suggestedQuestions[doc.path] = {
          source: 'manual',
          analysis,
          questions: manualQuestions,
        }
        manualCount++
        console.log(`✓ ${doc.path}: ${manualQuestions.length} manual question(s) [frontmatter]`)
      } else {
        // Fall back to auto-generation
        const autoQuestions = generateQuestions(content, doc.path, analysis)
        
        if (autoQuestions.length > 0) {
          suggestedQuestions[doc.path] = {
            source: 'auto',
            analysis,
            questions: autoQuestions,
          }
          autoCount++
          console.log(`✓ ${doc.path}: ${autoQuestions.length} auto question(s) (significance: ${analysis.significance})`)
        }
      }
    }
    
    // Write to assets/
    const assetsDir = path.join(process.cwd(), 'public', 'assets')
    fs.mkdirSync(assetsDir, { recursive: true })
    
    const outputPath = path.join(assetsDir, 'suggested-questions.json')
    fs.writeFileSync(
      outputPath,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        repo: `${CODEX_REPO_OWNER}/${CODEX_REPO_NAME}`,
        branch: CODEX_REPO_BRANCH,
        stats: {
          total: Object.keys(suggestedQuestions).length,
          manual: manualCount,
          auto: autoCount,
        },
        questions: suggestedQuestions,
      }, null, 2)
    )
    
    console.log(`\n✅ Generated ${Object.keys(suggestedQuestions).length} document question sets`)
    console.log(`   📝 Manual (frontmatter): ${manualCount}`)
    console.log(`   🤖 Auto-generated: ${autoCount}`)
    console.log(`📄 Output: ${outputPath}`)
    
  } catch (error) {
    console.error('❌ Error generating suggested questions:', error.message)
    console.log('   This is non-critical; Q&A will work without suggested questions.')
    process.exit(0)
  }
}

// Skip only if explicitly disabled (enabled by default)
if (process.env.SKIP_QUESTION_GENERATION === '1' || process.env.SKIP_QUESTION_GENERATION === 'true') {
  console.log('⏭️  Skipping question generation (SKIP_QUESTION_GENERATION=1)')
  process.exit(0)
}

main()
