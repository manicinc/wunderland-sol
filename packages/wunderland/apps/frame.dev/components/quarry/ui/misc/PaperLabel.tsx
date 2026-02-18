/**
 * Paper Label - Analog Knowledge Card
 * 
 * Renders a strand's metadata in multiple exportable formats for pen & paper modeling.
 * Includes ASCII art, PDF-ready layouts, and tabulated relationship matrices.
 * 
 * @module codex/ui/PaperLabel
 */

'use client'

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { 
  Copy, Check, Printer, Tag, Layers, Hash, FileText, ChevronDown, FileJson, 
  FileCode, Download, Grid3X3, Network, BookOpen, ArrowRight, ArrowLeft,
  RefreshCw, Maximize2, Table2, Image as ImageIcon, FileDown
} from 'lucide-react'
import type { StrandMetadata, GitHubFile } from '../../types'

// Dynamic imports for export libraries (only loaded when needed)
const loadHtml2Canvas = () => import('html2canvas').then(m => m.default)
const loadJsPDF = () => import('jspdf').then(m => m.jsPDF)

interface PaperLabelProps {
  metadata: StrandMetadata
  currentFile: GitHubFile | null
  currentPath: string
  allFiles?: GitHubFile[]
  onCopy?: () => void
  copied?: boolean
}

type ModelView = 'card' | 'matrix' | 'network' | 'full'

/**
 * Generates a human-readable location string from a file path
 */
function formatLocation(path: string): string {
  if (!path) return ''
  
  const parts = path
    .replace(/^weaves\//, '')
    .replace(/\.md$/, '')
    .split('/')
    .filter(Boolean)
  
  return parts
    .map(part => 
      part
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' › ')
}

/**
 * Formats relationships for display - handles multiple formats
 */
function formatRelationships(relationships?: StrandMetadata['relationships']): {
  prerequisites: string[]
  references: string[]
  children: string[]
  related: string[]
} {
  const result = { prerequisites: [], references: [], children: [], related: [] } as {
    prerequisites: string[]
    references: string[]
    children: string[]
    related: string[]
  }
  
  if (!relationships) return result
  
  // Handle array format
  if (Array.isArray(relationships)) {
    relationships.forEach((rel: { type?: string; target?: string }) => {
      const target = rel.target || ''
      if (!target) return
      switch (rel.type) {
        case 'prerequisite':
        case 'requires':
        case 'depends-on':
          result.prerequisites.push(target)
          break
        case 'child':
        case 'contains':
          result.children.push(target)
          break
        case 'related':
        case 'sibling':
          result.related.push(target)
          break
        default:
          result.references.push(target)
      }
    })
    return result
  }
  
  // Handle object format
  if (typeof relationships === 'object') {
    result.prerequisites = Array.isArray(relationships.prerequisites) ? relationships.prerequisites : []
    result.references = Array.isArray(relationships.references) ? relationships.references : []
    result.children = Array.isArray((relationships as Record<string, unknown>).children) 
      ? (relationships as Record<string, unknown>).children as string[] : []
    result.related = Array.isArray((relationships as Record<string, unknown>).related) 
      ? (relationships as Record<string, unknown>).related as string[] : []
  }
  
  return result
}

/**
 * Generate a short hash for identification
 */
function shortHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).slice(0, 6).toUpperCase()
}

export default function PaperLabel({
  metadata,
  currentFile,
  currentPath,
  allFiles = [],
  onCopy,
  copied,
}: PaperLabelProps) {
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const [modelView, setModelView] = useState<ModelView>('card')
  const [showInstructions, setShowInstructions] = useState(true)
  const [isExporting, setIsExporting] = useState<'png' | 'pdf' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const exportCardRef = useRef<HTMLDivElement>(null)
  
  const location = useMemo(() => formatLocation(currentPath), [currentPath])
  const relationships = useMemo(() => formatRelationships(metadata.relationships), [metadata.relationships])
  const strandHash = useMemo(() => shortHash(currentPath || metadata.title || 'strand'), [currentPath, metadata.title])
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCopyDropdownOpen(false)
      }
    }
    if (copyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [copyDropdownOpen])
  
  const tags = useMemo(() => {
    if (!metadata.tags) return []
    return Array.isArray(metadata.tags) 
      ? metadata.tags 
      : String(metadata.tags).split(',').map(t => t.trim()).filter(Boolean)
  }, [metadata.tags])
  
  const subjects = metadata.taxonomy?.subjects || []
  const topics = metadata.taxonomy?.topics || []
  
  const allRelationships = [
    ...relationships.prerequisites,
    ...relationships.references,
    ...relationships.children,
    ...relationships.related,
  ]
  
  const hasRelationships = allRelationships.length > 0
  const hasTaxonomy = subjects.length > 0 || topics.length > 0 || tags.length > 0

  // Get related strands from allFiles
  const relatedStrands = useMemo(() => {
    if (!allFiles.length) return []
    return allFiles
      .filter(f => allRelationships.some(rel => 
        f.path?.includes(rel) || f.name?.includes(rel)
      ))
      .slice(0, 10)
  }, [allFiles, allRelationships])

  const title = metadata.title || currentFile?.name?.replace('.md', '') || 'Untitled'
  const difficulty = typeof metadata.difficulty === 'string' 
    ? metadata.difficulty 
    : (metadata.difficulty as { overall?: string })?.overall || ''

  // ============================================
  // ASCII Card Generator (Single Card)
  // ============================================
  const generateAsciiCard = useCallback(() => {
    const w = 60
    const hr = '─'.repeat(w - 2)
    const lines: string[] = []
    
    const pad = (s: string, len: number = w - 4) => {
      const str = s.slice(0, len)
      return str + ' '.repeat(Math.max(0, len - str.length))
    }
    
    const wrap = (text: string, maxLen: number = w - 6): string[] => {
      const words = text.split(' ')
      const result: string[] = []
      let line = ''
      for (const word of words) {
        if ((line + ' ' + word).trim().length > maxLen) {
          if (line) result.push(line.trim())
          line = word
        } else {
          line = (line + ' ' + word).trim()
        }
      }
      if (line) result.push(line.trim())
      return result
    }
    
    // Header
    lines.push('╔' + '═'.repeat(w - 2) + '╗')
    lines.push('║' + ' '.repeat(w - 2) + '║')
    lines.push('║  ' + pad(`◉ ${title}`, w - 4) + '║')
    lines.push('║  ' + pad(`  [${strandHash}]`, w - 4) + '║')
    lines.push('╠' + hr + '╣')
    
    // Location
    if (location) {
      lines.push('║  ' + pad(`📍 ${location}`) + '║')
      lines.push('║' + ' '.repeat(w - 2) + '║')
    }
    
    // Identity row
    const identityParts = [
      metadata.id ? `ID:${metadata.id.slice(0, 8)}` : '',
      metadata.version ? `v${metadata.version}` : '',
      difficulty ? `★${difficulty}` : '',
    ].filter(Boolean)
    if (identityParts.length) {
      lines.push('║  ' + pad(identityParts.join(' │ ')) + '║')
      lines.push('║' + ' '.repeat(w - 2) + '║')
    }
    
    // Summary
    if (metadata.summary) {
      lines.push('╟' + '─'.repeat(w - 2) + '╢')
      lines.push('║  ' + pad('SUMMARY') + '║')
      const summaryLines = wrap(metadata.summary)
      summaryLines.forEach(sl => {
        lines.push('║  ' + pad(`  ${sl}`) + '║')
      })
      lines.push('║' + ' '.repeat(w - 2) + '║')
    }
    
    // Classification
    if (hasTaxonomy) {
      lines.push('╟' + '─'.repeat(w - 2) + '╢')
      lines.push('║  ' + pad('CLASSIFICATION') + '║')
      if (subjects.length) lines.push('║  ' + pad(`  ◆ Subjects: ${subjects.join(', ')}`) + '║')
      if (topics.length) lines.push('║  ' + pad(`  ◇ Topics: ${topics.join(', ')}`) + '║')
      if (tags.length) lines.push('║  ' + pad(`  ○ Tags: ${tags.join(', ')}`) + '║')
      lines.push('║' + ' '.repeat(w - 2) + '║')
    }
    
    // Relationships
    if (hasRelationships) {
      lines.push('╟' + '─'.repeat(w - 2) + '╢')
      lines.push('║  ' + pad('CONNECTIONS') + '║')
      if (relationships.prerequisites.length) {
        lines.push('║  ' + pad(`  ← REQUIRES: ${relationships.prerequisites.join(', ')}`) + '║')
      }
      if (relationships.references.length) {
        lines.push('║  ' + pad(`  ↔ REFERENCES: ${relationships.references.join(', ')}`) + '║')
      }
      if (relationships.children.length) {
        lines.push('║  ' + pad(`  → CONTAINS: ${relationships.children.join(', ')}`) + '║')
      }
      if (relationships.related.length) {
        lines.push('║  ' + pad(`  ◇ RELATED: ${relationships.related.join(', ')}`) + '║')
      }
      lines.push('║' + ' '.repeat(w - 2) + '║')
    }
    
    // Footer
    lines.push('╠' + hr + '╣')
    lines.push('║  ' + pad(`OpenStrand Schema • Quarry Codex`) + '║')
    lines.push('╚' + '═'.repeat(w - 2) + '╝')
    
    return lines.join('\n')
  }, [title, strandHash, location, metadata, hasTaxonomy, hasRelationships, subjects, topics, tags, relationships, difficulty])

  // ============================================
  // Relationship Matrix Generator
  // ============================================
  const generateRelationshipMatrix = useCallback(() => {
    const lines: string[] = []
    const allNodes = [title, ...allRelationships].slice(0, 8)
    const colW = 12
    
    lines.push('┌' + '─'.repeat(70) + '┐')
    lines.push('│  RELATIONSHIP MATRIX                                                │')
    lines.push('│  Current Node: ' + title.slice(0, 50).padEnd(52) + '│')
    lines.push('├' + '─'.repeat(70) + '┤')
    lines.push('│' + ' '.repeat(70) + '│')
    
    // Legend
    lines.push('│  LEGEND:  ← Requires  → Contains  ↔ References  ◇ Related          │')
    lines.push('│' + ' '.repeat(70) + '│')
    
    // Matrix header
    const headerRow = '│  ' + 'FROM \\ TO'.padEnd(colW) + '│' + 
      allNodes.map(n => n.slice(0, colW - 2).padEnd(colW - 1) + '│').join('') 
    if (headerRow.length <= 72) {
      lines.push(headerRow.padEnd(71) + '│')
    }
    lines.push('│  ' + '─'.repeat(colW) + '┼' + ('─'.repeat(colW - 1) + '┼').repeat(allNodes.length - 1) + '─'.repeat(colW - 1) + '│')
    
    // Matrix rows
    allNodes.forEach((node, i) => {
      let row = '│  ' + node.slice(0, colW - 2).padEnd(colW) + '│'
      allNodes.forEach((target, j) => {
        if (i === j) {
          row += '   ●   │'
        } else if (i === 0) {
          // Current node's relationships to others
          if (relationships.prerequisites.includes(target)) row += '   ←   │'
          else if (relationships.children.includes(target)) row += '   →   │'
          else if (relationships.references.includes(target)) row += '   ↔   │'
          else if (relationships.related.includes(target)) row += '   ◇   │'
          else row += '   ·   │'
        } else if (j === 0) {
          // Others' relationships to current
          if (relationships.prerequisites.includes(node)) row += '   →   │'
          else if (relationships.children.includes(node)) row += '   ←   │'
          else if (relationships.references.includes(node)) row += '   ↔   │'
          else if (relationships.related.includes(node)) row += '   ◇   │'
          else row += '   ·   │'
        } else {
          row += '   ?   │'
        }
      })
      if (row.length <= 72) lines.push(row.padEnd(71) + '│')
    })
    
    lines.push('│' + ' '.repeat(70) + '│')
    lines.push('│  ● = Self  · = No relation  ? = Unknown (fill in manually)         │')
    lines.push('└' + '─'.repeat(70) + '┘')
    
    return lines.join('\n')
  }, [title, allRelationships, relationships])

  // ============================================
  // Network Diagram Generator
  // ============================================
  const generateNetworkDiagram = useCallback(() => {
    const lines: string[] = []
    
    lines.push('┌' + '─'.repeat(70) + '┐')
    lines.push('│  NETWORK DIAGRAM - Visual Node Map                                  │')
    lines.push('├' + '─'.repeat(70) + '┤')
    lines.push('│' + ' '.repeat(70) + '│')
    
    // Prerequisites (above)
    if (relationships.prerequisites.length) {
      relationships.prerequisites.forEach(p => {
        lines.push('│' + `      ┌${'─'.repeat(p.length + 4)}┐`.padEnd(70) + '│')
        lines.push('│' + `      │  ${p}  │`.padEnd(70) + '│')
        lines.push('│' + `      └${'─'.repeat(Math.floor(p.length/2) + 2)}┬${'─'.repeat(Math.ceil(p.length/2) + 1)}┘`.padEnd(70) + '│')
        lines.push('│' + '              │'.padEnd(70) + '│')
        lines.push('│' + '              ▼'.padEnd(70) + '│')
      })
    }
    
    // Current node (center)
    const nodeBox = `╔${'═'.repeat(title.length + 6)}╗`
    const nodeTitle = `║ ★ ${title} ★ ║`
    const nodeBottom = `╚${'═'.repeat(title.length + 6)}╝`
    const centerPad = Math.floor((70 - nodeBox.length) / 2)
    
    lines.push('│' + ' '.repeat(centerPad) + nodeBox + ' '.repeat(70 - centerPad - nodeBox.length) + '│')
    lines.push('│' + ' '.repeat(centerPad) + nodeTitle + ' '.repeat(70 - centerPad - nodeTitle.length) + '│')
    lines.push('│' + ' '.repeat(centerPad) + nodeBottom + ' '.repeat(70 - centerPad - nodeBottom.length) + '│')
    
    // Children (below)
    if (relationships.children.length) {
      lines.push('│' + '              │'.padEnd(70) + '│')
      lines.push('│' + '              ▼'.padEnd(70) + '│')
      relationships.children.forEach(c => {
        lines.push('│' + `      ┌${'─'.repeat(Math.floor(c.length/2) + 2)}┴${'─'.repeat(Math.ceil(c.length/2) + 1)}┐`.padEnd(70) + '│')
        lines.push('│' + `      │  ${c}  │`.padEnd(70) + '│')
        lines.push('│' + `      └${'─'.repeat(c.length + 4)}┘`.padEnd(70) + '│')
      })
    }
    
    // References (side)
    if (relationships.references.length) {
      lines.push('│' + ' '.repeat(70) + '│')
      lines.push('│  ↔ References:'.padEnd(70) + '│')
      relationships.references.forEach(r => {
        lines.push('│' + `     ├── ${r}`.padEnd(70) + '│')
      })
    }
    
    // Related (side)
    if (relationships.related.length) {
      lines.push('│' + ' '.repeat(70) + '│')
      lines.push('│  ◇ Related:'.padEnd(70) + '│')
      relationships.related.forEach(r => {
        lines.push('│' + `     ├── ${r}`.padEnd(70) + '│')
      })
    }
    
    lines.push('│' + ' '.repeat(70) + '│')
    lines.push('└' + '─'.repeat(70) + '┘')
    
    return lines.join('\n')
  }, [title, relationships])

  // ============================================
  // Full PDF Export (Multi-page)
  // ============================================
  const generateFullExport = useCallback(() => {
    const sections: string[] = []
    const pageBreak = '\n\n' + '═'.repeat(72) + ' PAGE BREAK ' + '═'.repeat(72) + '\n\n'
    
    // Page 1: Index Card
    sections.push('PAGE 1: INDEX CARD\n' + '─'.repeat(40) + '\n')
    sections.push(generateAsciiCard())
    
    // Page 2: Relationship Matrix
    sections.push(pageBreak)
    sections.push('PAGE 2: RELATIONSHIP MATRIX\n' + '─'.repeat(40) + '\n')
    sections.push(generateRelationshipMatrix())
    
    // Page 3: Network Diagram
    sections.push(pageBreak)
    sections.push('PAGE 3: NETWORK DIAGRAM\n' + '─'.repeat(40) + '\n')
    sections.push(generateNetworkDiagram())
    
    // Page 4: Blank Template for Manual Entry
    sections.push(pageBreak)
    sections.push('PAGE 4: BLANK TEMPLATE (Fill in by hand)\n' + '─'.repeat(40) + '\n')
    sections.push(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  STRAND TITLE: ________________________________________      ║
║                                                              ║
║  HASH ID: [______]                                           ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  LOCATION:                                                   ║
║    Weave: ____________________                               ║
║    Loom:  ____________________                               ║
║    Strand: ___________________                               ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  SUMMARY:                                                    ║
║  ________________________________________________________    ║
║  ________________________________________________________    ║
║  ________________________________________________________    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  CLASSIFICATION:                                             ║
║    Subjects: ____________________________________________    ║
║    Topics:   ____________________________________________    ║
║    Tags:     ____________________________________________    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  CONNECTIONS:                                                ║
║    ← Requires:   ________________________________________    ║
║    → Contains:   ________________________________________    ║
║    ↔ References: ________________________________________    ║
║    ◇ Related:    ________________________________________    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  DIFFICULTY: [ ] Beginner  [ ] Intermediate  [ ] Advanced    ║
║                                                              ║
║  NOTES:                                                      ║
║  ________________________________________________________    ║
║  ________________________________________________________    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`)
    
    // Page 5: Quick Reference Card (wallet-sized)
    sections.push(pageBreak)
    sections.push('PAGE 5: QUICK REFERENCE CARD (Cut out, wallet-sized)\n' + '─'.repeat(40) + '\n')
    sections.push(`
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ ${title.slice(0, 29).padEnd(29)} │  │ CONNECTIONS                     │
│ [${strandHash}]                        │  │                                 │
├─────────────────────────────────┤  │ ← ${(relationships.prerequisites[0] || '___').slice(0, 27).padEnd(27)} │
│ ${location.slice(0, 31).padEnd(31)} │  │ → ${(relationships.children[0] || '___').slice(0, 27).padEnd(27)} │
├─────────────────────────────────┤  │ ↔ ${(relationships.references[0] || '___').slice(0, 27).padEnd(27)} │
│ Tags: ${tags.slice(0, 3).join(', ').slice(0, 25).padEnd(25)} │  │ ◇ ${(relationships.related[0] || '___').slice(0, 27).padEnd(27)} │
│ Diff: ${(difficulty || '___').padEnd(25)} │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘
`)
    
    // Instructions
    sections.push(pageBreak)
    sections.push('INSTRUCTIONS FOR PEN & PAPER MODELING\n' + '═'.repeat(40) + '\n')
    sections.push(`
THE OPENSTRAND PEN & PAPER SYSTEM
─────────────────────────────────

This document contains everything needed to model "${title}" 
and its relationships using only pen, paper, and index cards.

MATERIALS NEEDED:
  • 3×5 inch index cards (one per strand)
  • Colored pens/pencils (4 colors recommended)
  • A flat surface or cork board
  • Push pins or tape (optional, for wall display)

COLOR CODING SYSTEM:
  • RED    ← Prerequisites (must learn first)
  • BLUE   → Children (contained concepts)  
  • GREEN  ↔ References (related reading)
  • YELLOW ◇ Related (similar topics)

STEP-BY-STEP PROCESS:

1. CREATE THE MAIN CARD
   Copy Page 1 (Index Card) onto a 3×5 card.
   Write clearly and use abbreviations if needed.

2. CREATE RELATIONSHIP CARDS
   For each connection listed, create a new card.
   Use Page 4 (Blank Template) as a guide.

3. ARRANGE SPATIALLY
   Prerequisites go ABOVE the main card.
   Children go BELOW the main card.
   References go to the LEFT.
   Related items go to the RIGHT.

4. DRAW CONNECTIONS
   Use Page 3 (Network Diagram) as reference.
   Draw arrows between cards using the color system.

5. BUILD THE MATRIX
   Use Page 2 (Relationship Matrix) to track
   all connections in a tabular format.

6. CARRY THE QUICK CARD
   Cut out Page 5 for portable reference.

HIERARCHY REMINDER:
  FABRIC → contains → WEAVES → contains → LOOMS → contains → STRANDS
  
  This strand belongs to:
    Weave: ${currentPath.split('/')[1] || '___'}
    Loom:  ${currentPath.split('/')[2] || '___'}

TIPS:
  • Update cards as you learn new connections
  • Stack related cards with rubber bands
  • Use different card colors for different weaves
  • Review and reorganize monthly

Generated by Quarry Codex • OpenStrand Schema
`)
    
    return sections.join('')
  }, [generateAsciiCard, generateRelationshipMatrix, generateNetworkDiagram, title, strandHash, location, tags, relationships, difficulty, currentPath])

  // ============================================
  // Copy/Export Handlers
  // ============================================
  const handleCopyFormat = async (format: string, getData: () => string) => {
    try {
      await navigator.clipboard.writeText(getData())
      setCopiedFormat(format)
      setCopyDropdownOpen(false)
      setTimeout(() => setCopiedFormat(null), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getJsonExport = () => JSON.stringify({
    title,
    hash: strandHash,
    path: currentPath,
    location,
    tags,
    subjects,
    topics,
    relationships,
    difficulty,
    summary: metadata.summary,
    version: metadata.version,
    id: metadata.id,
  }, null, 2)

  const getMarkdownExport = () => {
    const lines = [
      `# ${title}`,
      `**Hash:** \`${strandHash}\``,
      '',
      location ? `📍 **Location:** ${location}` : '',
      '',
      metadata.summary ? `> ${metadata.summary}` : '',
      '',
      '## Classification',
      tags.length ? `- **Tags:** ${tags.join(', ')}` : '',
      subjects.length ? `- **Subjects:** ${subjects.join(', ')}` : '',
      topics.length ? `- **Topics:** ${topics.join(', ')}` : '',
      '',
      '## Relationships',
      relationships.prerequisites.length ? `- **← Requires:** ${relationships.prerequisites.join(', ')}` : '',
      relationships.children.length ? `- **→ Contains:** ${relationships.children.join(', ')}` : '',
      relationships.references.length ? `- **↔ References:** ${relationships.references.join(', ')}` : '',
      relationships.related.length ? `- **◇ Related:** ${relationships.related.join(', ')}` : '',
      '',
      '---',
      '*OpenStrand Schema • Quarry Codex*',
    ].filter(Boolean)
    return lines.join('\n')
  }

  const handlePrint = () => {
    const printContent = generateFullExport()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title} - OpenStrand Paper Model</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 10px;
                line-height: 1.4;
                padding: 20px;
                white-space: pre;
              }
              @media print {
                body { font-size: 9px; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleDownloadPDF = () => {
    // Generate a text file that can be printed to PDF
    const content = generateFullExport()
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-paper-model.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ============================================
  // High-Resolution Export Functions
  // ============================================
  
  // 3x5 inch index card dimensions at 300 DPI
  const INDEX_CARD_WIDTH_PX = 1500  // 5 inches * 300 DPI
  const INDEX_CARD_HEIGHT_PX = 900  // 3 inches * 300 DPI
  const INDEX_CARD_WIDTH_IN = 5
  const INDEX_CARD_HEIGHT_IN = 3

  /**
   * Export the current card view as a high-resolution PNG (300 DPI)
   * Life-size 3x5 inch index card
   */
  const handleExportPNG = async () => {
    if (!exportCardRef.current || isExporting) return
    
    setIsExporting('png')
    
    try {
      const html2canvas = await loadHtml2Canvas()
      
      // Create a temporary container for high-res rendering
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.width = `${INDEX_CARD_WIDTH_PX}px`
      tempContainer.style.height = `${INDEX_CARD_HEIGHT_PX}px`
      tempContainer.style.padding = '48px'
      tempContainer.style.boxSizing = 'border-box'
      tempContainer.style.backgroundColor = '#fef3c7' // amber-100
      tempContainer.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
      document.body.appendChild(tempContainer)
      
      // Clone the card content
      const cardClone = exportCardRef.current.cloneNode(true) as HTMLElement
      cardClone.style.width = '100%'
      cardClone.style.height = '100%'
      cardClone.style.transform = 'none'
      cardClone.style.fontSize = '24px' // Scale up for 300 DPI
      tempContainer.appendChild(cardClone)
      
      // Scale all text elements proportionally
      const textElements = tempContainer.querySelectorAll('*')
      textElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        const computedStyle = window.getComputedStyle(htmlEl)
        const fontSize = parseFloat(computedStyle.fontSize)
        if (fontSize) {
          htmlEl.style.fontSize = `${fontSize * 2.5}px` // Scale for print quality
        }
      })
      
      // Render to canvas at high resolution
      const canvas = await html2canvas(tempContainer, {
        width: INDEX_CARD_WIDTH_PX,
        height: INDEX_CARD_HEIGHT_PX,
        scale: 1, // Already at target resolution
        backgroundColor: '#fef3c7',
        useCORS: true,
        logging: false,
      })
      
      // Clean up
      document.body.removeChild(tempContainer)
      
      // Download as PNG
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      const link = document.createElement('a')
      link.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-index-card-3x5.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Failed to export PNG:', error)
      alert('Failed to export PNG. Please try the Print option instead.')
    } finally {
      setIsExporting(null)
    }
  }

  /**
   * Export the current card view as a PDF (life-size 3x5 inch)
   */
  const handleExportPDF = async () => {
    if (!exportCardRef.current || isExporting) return
    
    setIsExporting('pdf')
    
    try {
      const [html2canvas, jsPDF] = await Promise.all([
        loadHtml2Canvas(),
        loadJsPDF()
      ])
      
      // Create a temporary container for high-res rendering
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.width = `${INDEX_CARD_WIDTH_PX}px`
      tempContainer.style.height = `${INDEX_CARD_HEIGHT_PX}px`
      tempContainer.style.padding = '48px'
      tempContainer.style.boxSizing = 'border-box'
      tempContainer.style.backgroundColor = '#fef3c7'
      tempContainer.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
      document.body.appendChild(tempContainer)
      
      // Clone the card content
      const cardClone = exportCardRef.current.cloneNode(true) as HTMLElement
      cardClone.style.width = '100%'
      cardClone.style.height = '100%'
      cardClone.style.transform = 'none'
      cardClone.style.fontSize = '24px'
      tempContainer.appendChild(cardClone)
      
      // Scale text elements
      const textElements = tempContainer.querySelectorAll('*')
      textElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        const computedStyle = window.getComputedStyle(htmlEl)
        const fontSize = parseFloat(computedStyle.fontSize)
        if (fontSize) {
          htmlEl.style.fontSize = `${fontSize * 2.5}px`
        }
      })
      
      // Render to canvas
      const canvas = await html2canvas(tempContainer, {
        width: INDEX_CARD_WIDTH_PX,
        height: INDEX_CARD_HEIGHT_PX,
        scale: 1,
        backgroundColor: '#fef3c7',
        useCORS: true,
        logging: false,
      })
      
      // Clean up temp container
      document.body.removeChild(tempContainer)
      
      // Create PDF with exact 3x5 inch dimensions (landscape)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [INDEX_CARD_HEIGHT_IN, INDEX_CARD_WIDTH_IN], // [height, width] for landscape
      })
      
      // Add the image to the PDF, filling the entire page
      const imgData = canvas.toDataURL('image/png', 1.0)
      pdf.addImage(imgData, 'PNG', 0, 0, INDEX_CARD_WIDTH_IN, INDEX_CARD_HEIGHT_IN)
      
      // Add metadata
      pdf.setProperties({
        title: `${title} - Index Card`,
        subject: 'OpenStrand Paper Model',
        author: 'Quarry Codex',
        keywords: tags.join(', '),
        creator: 'Quarry Codex Paper Model Export'
      })
      
      // Save PDF
      pdf.save(`${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-index-card-3x5.pdf`)
      
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF. Please try the Print option instead.')
    } finally {
      setIsExporting(null)
    }
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="space-y-3">
      {/* Header with View Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            Paper Model
            <span className="text-[8px] font-normal text-zinc-400 dark:text-zinc-500">
              [{strandHash}]
            </span>
          </h4>
        </div>
        
        {/* View Tabs - Full width responsive grid */}
        <div className="grid grid-cols-4 gap-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {[
            { id: 'card', icon: FileText, label: 'Card', shortLabel: '📇' },
            { id: 'matrix', icon: Table2, label: 'Matrix', shortLabel: '⊞' },
            { id: 'network', icon: Network, label: 'Network', shortLabel: '◎' },
            { id: 'full', icon: BookOpen, label: 'Full', shortLabel: '📄' },
          ].map(({ id, icon: Icon, label, shortLabel }) => (
            <button
              key={id}
              onClick={() => setModelView(id as ModelView)}
              className={`
                flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-[10px] font-medium transition-all
                ${modelView === id 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-600' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750'
                }
              `}
              title={label}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline truncate">{label}</span>
              <span className="xs:hidden sm:hidden">{shortLabel}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Copy dropdown */}
        <div className="relative group" ref={dropdownRef}>
          <button
            onClick={() => setCopyDropdownOpen(!copyDropdownOpen)}
            className={`
              flex items-center gap-1 p-1.5 rounded-md transition-all
              ${copiedFormat 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }
            `}
            aria-label="Copy options"
          >
            {copiedFormat ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <ChevronDown className={`w-3 h-3 transition-transform ${copyDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Tooltip */}
          {!copyDropdownOpen && (
            <span className={`
              absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
              px-2 py-1 text-[10px] font-medium whitespace-nowrap
              rounded shadow-lg z-50 pointer-events-none
              transition-opacity
              ${copiedFormat 
                ? 'bg-emerald-600 text-white opacity-100' 
                : 'bg-zinc-800 text-white opacity-0 group-hover:opacity-100'
              }
            `}>
              {copiedFormat ? 'Copied!' : 'Copy'}
              <span className={`
                absolute top-full left-1/2 -translate-x-1/2
                border-4 border-transparent
                ${copiedFormat ? 'border-t-emerald-600' : 'border-t-zinc-800'}
              `} />
            </span>
          )}
          
          {copyDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-40 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-0.5">
              <button
                onClick={() => handleCopyFormat('ascii', generateAsciiCard)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FileText className="w-3 h-3 text-zinc-500" />
                <span>ASCII Card</span>
                {copiedFormat === 'ascii' && <Check className="w-2.5 h-2.5 text-emerald-500 ml-auto" />}
              </button>
              <button
                onClick={() => handleCopyFormat('matrix', generateRelationshipMatrix)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Table2 className="w-3 h-3 text-blue-500" />
                <span>Relationship Matrix</span>
                {copiedFormat === 'matrix' && <Check className="w-2.5 h-2.5 text-emerald-500 ml-auto" />}
              </button>
              <button
                onClick={() => handleCopyFormat('network', generateNetworkDiagram)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Network className="w-3 h-3 text-purple-500" />
                <span>Network Diagram</span>
                {copiedFormat === 'network' && <Check className="w-2.5 h-2.5 text-emerald-500 ml-auto" />}
              </button>
              <button
                onClick={() => handleCopyFormat('full', generateFullExport)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <BookOpen className="w-3 h-3 text-amber-500" />
                <span>Full Export (All)</span>
                {copiedFormat === 'full' && <Check className="w-2.5 h-2.5 text-emerald-500 ml-auto" />}
              </button>
              <div className="border-t border-zinc-200 dark:border-zinc-700 my-0.5" />
              <button
                onClick={() => handleCopyFormat('md', getMarkdownExport)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FileCode className="w-3 h-3 text-blue-500" />
                <span>Markdown</span>
                {copiedFormat === 'md' && <Check className="w-2.5 h-2.5 text-emerald-500 ml-auto" />}
              </button>
              <button
                onClick={() => handleCopyFormat('json', getJsonExport)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FileJson className="w-3 h-3 text-amber-500" />
                <span>JSON</span>
                {copiedFormat === 'json' && <Check className="w-2.5 h-2.5 text-emerald-500 ml-auto" />}
              </button>
            </div>
          )}
        </div>
        
        {/* Export PNG (3x5 inch) */}
        <button
          onClick={handleExportPNG}
          disabled={isExporting !== null || modelView !== 'card'}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all
            ${modelView === 'card' 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/40'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            }
            ${isExporting === 'png' ? 'animate-pulse' : ''}
          `}
          title={modelView === 'card' ? 'Export as PNG (3×5 inch, 300 DPI)' : 'Switch to Card view to export PNG'}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">{isExporting === 'png' ? 'Exporting...' : 'PNG'}</span>
        </button>
        
        {/* Export PDF (3x5 inch) */}
        <button
          onClick={handleExportPDF}
          disabled={isExporting !== null || modelView !== 'card'}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all
            ${modelView === 'card' 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            }
            ${isExporting === 'pdf' ? 'animate-pulse' : ''}
          `}
          title={modelView === 'card' ? 'Export as PDF (3×5 inch, life-size)' : 'Switch to Card view to export PDF'}
        >
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">{isExporting === 'pdf' ? 'Exporting...' : 'PDF'}</span>
        </button>
        
        {/* Download Text */}
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          title="Download as text file"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">TXT</span>
        </button>
        
        {/* Print */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          title="Print all pages"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Print</span>
        </button>
        
        {/* Toggle Instructions */}
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ml-auto
            ${showInstructions 
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }
          `}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Guide</span>
        </button>
      </div>
      
      {/* Dynamic Content Area */}
      <div ref={printRef} className="space-y-3">
        {/* Card View */}
        {modelView === 'card' && (
          <div className="relative">
            {/* Paper texture */}
            <div 
              className="absolute inset-0 rounded-lg opacity-50 dark:opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
            
            <div 
              ref={exportCardRef}
              className="relative bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800/50 rounded-lg p-4 shadow-md font-mono text-[10px] leading-relaxed"
            >
              {/* Hole punches */}
              <div className="absolute left-3 top-3 w-2 h-2 rounded-full border border-amber-300 dark:border-amber-700" />
              <div className="absolute left-3 bottom-3 w-2 h-2 rounded-full border border-amber-300 dark:border-amber-700" />
              
              {/* Title */}
              <div className="ml-4 mb-3 pb-2 border-b border-amber-300 dark:border-amber-700/50">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    ◉ {title}
                  </h3>
                  <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                    [{strandHash}]
                  </span>
                </div>
                {location && (
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 mt-0.5">
                    📍 {location}
                  </p>
                )}
              </div>
              
              {/* Identity */}
              <div className="ml-4 mb-3 flex flex-wrap gap-x-3 gap-y-1 text-amber-800 dark:text-amber-200">
                {metadata.id && <span title={metadata.id}>ID: {metadata.id.slice(0, 8)}…</span>}
                {metadata.version && <span>v{metadata.version}</span>}
                {difficulty && (
                  <span className={`
                    px-1.5 py-0.5 rounded text-[9px]
                    ${difficulty === 'beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : difficulty === 'intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                    : difficulty === 'advanced' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}
                  `}>
                    ★ {difficulty}
                  </span>
                )}
              </div>
              
              {/* Summary */}
              {metadata.summary && (
                <div className="ml-4 mb-3 p-2 bg-white/50 dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800/30">
                  <p className="text-amber-900 dark:text-amber-100 text-[10px] italic">
                    "{metadata.summary}"
                  </p>
                </div>
              )}
              
              {/* Classification */}
              {hasTaxonomy && (
                <div className="ml-4 mb-3">
                  <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                    Classification
                  </p>
                  <div className="space-y-1">
                    {subjects.length > 0 && (
                      <div className="flex items-start gap-1">
                        <span className="text-amber-600">◆</span>
                        <span className="text-amber-800 dark:text-amber-200">{subjects.join(' • ')}</span>
                      </div>
                    )}
                    {topics.length > 0 && (
                      <div className="flex items-start gap-1">
                        <span className="text-amber-600">◇</span>
                        <span className="text-amber-800 dark:text-amber-200">{topics.join(' • ')}</span>
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="flex items-start gap-1">
                        <span className="text-amber-600">○</span>
                        <span className="text-amber-800 dark:text-amber-200">{tags.join(' • ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Relationships */}
              {hasRelationships && (
                <div className="ml-4 mb-3">
                  <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                    Connections
                  </p>
                  <div className="space-y-1.5">
                    {relationships.prerequisites.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-red-600 dark:text-red-400 font-bold">←</span>
                        <div>
                          <span className="text-[9px] text-red-600 dark:text-red-400">Requires:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {relationships.prerequisites.map((req, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded text-[9px]">
                                {req}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {relationships.children.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                        <div>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400">Contains:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {relationships.children.map((c, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-[9px]">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {relationships.references.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-green-600 dark:text-green-400 font-bold">↔</span>
                        <div>
                          <span className="text-[9px] text-green-600 dark:text-green-400">References:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {relationships.references.map((ref, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-[9px]">
                                {ref}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {relationships.related.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">◇</span>
                        <div>
                          <span className="text-[9px] text-yellow-600 dark:text-yellow-400">Related:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {relationships.related.map((rel, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-[9px]">
                                {rel}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Footer */}
              <div className="ml-4 mt-3 pt-2 border-t border-dashed border-amber-300 dark:border-amber-700/50 flex items-center justify-between text-[9px] text-amber-600 dark:text-amber-500">
                <span>OpenStrand Schema</span>
                <span>Quarry Codex</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Matrix View */}
        {modelView === 'matrix' && (
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <pre className="text-[8px] font-mono overflow-x-auto whitespace-pre text-zinc-700 dark:text-zinc-300 leading-tight">
              {generateRelationshipMatrix()}
            </pre>
          </div>
        )}
        
        {/* Network View */}
        {modelView === 'network' && (
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <pre className="text-[8px] font-mono overflow-x-auto whitespace-pre text-zinc-700 dark:text-zinc-300 leading-tight">
              {generateNetworkDiagram()}
            </pre>
          </div>
        )}
        
        {/* Full Export View */}
        {modelView === 'full' && (
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 max-h-[500px] overflow-y-auto">
            <pre className="text-[7px] font-mono overflow-x-auto whitespace-pre text-zinc-700 dark:text-zinc-300 leading-tight">
              {generateFullExport()}
            </pre>
          </div>
        )}
      </div>
      
      {/* Instructions Panel */}
      {showInstructions && (
        <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50">
          <h5 className="text-[10px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" />
            Pen & Paper Modeling Guide
          </h5>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[9px] text-amber-900 dark:text-amber-100">
            <div>
              <p className="font-semibold mb-1">Materials:</p>
              <ul className="space-y-0.5 text-amber-700 dark:text-amber-300">
                <li>• 3×5 index cards</li>
                <li>• 4 colored pens (R/B/G/Y)</li>
                <li>• Cork board or flat surface</li>
              </ul>
            </div>
            
            <div>
              <p className="font-semibold mb-1">Export Options:</p>
              <ul className="space-y-0.5 text-amber-700 dark:text-amber-300">
                <li>• <span className="text-emerald-600 dark:text-emerald-400 font-medium">PNG</span>: 1500×900px (300 DPI)</li>
                <li>• <span className="text-blue-600 dark:text-blue-400 font-medium">PDF</span>: Life-size 3×5 inch</li>
                <li>• Print directly at 100% scale</li>
              </ul>
            </div>
            
            <div>
              <p className="font-semibold mb-1">Color Code:</p>
              <ul className="space-y-0.5">
                <li className="text-red-600 dark:text-red-400">← RED: Prerequisites</li>
                <li className="text-blue-600 dark:text-blue-400">→ BLUE: Contains</li>
                <li className="text-green-600 dark:text-green-400">↔ GREEN: References</li>
                <li className="text-yellow-600 dark:text-yellow-400">◇ YELLOW: Related</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-3 pt-2 border-t border-amber-200 dark:border-amber-700/50">
            <p className="text-[9px] text-amber-700 dark:text-amber-300">
              <strong>This strand:</strong> {currentPath.split('/')[1] || 'Unknown'} (Weave) › {currentPath.split('/')[2] || 'Root'} (Loom) › <span className="font-bold">{title}</span> (Strand)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
