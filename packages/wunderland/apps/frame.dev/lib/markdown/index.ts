/**
 * Markdown Utilities
 * @module lib/markdown
 *
 * Utilities for working with markdown content.
 */

export {
  detectExistingTOC,
  stripExistingTOC,
  hasTOCHeading,
  generateTOC,
  ensureTOC,
  type TOCDetectionResult,
  type TOCEntry,
} from './tocDetector'

// Citation plugin
export {
  extractCitations,
  hasCitations,
  resolveCitationReference,
  resolveAllCitations,
  formatInTextCitation,
  renderCitations,
  generateBibliography,
  processCitationsToHtml,
  citationToHtml,
  type CitationReference,
  type ParsedCitation,
} from './citationPlugin'
