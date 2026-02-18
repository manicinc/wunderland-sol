/**
 * Question Generation Library
 * 
 * Exports shared NLP logic for generating suggested questions.
 * 
 * @module lib/questions
 */

export {
  // Types
  type QuestionType,
  type QuestionDifficulty,
  type QuestionSource,
  type GeneratedQuestion,
  type PrebuiltQuestion,
  type ContentAnalysis,
  type GenerationOptions,
  
  // Constants
  STOP_WORDS,
  TECH_PATTERNS,
  
  // Content Analysis
  analyzeContent,
  extractKeywords,
  extractHeadings,
  extractTechEntities,
  hasCodeBlocks,
  extractTitle,
  
  // Question Generation
  inferQuestionType,
  prebuiltToGenerated,
  generateQuestionsFromContent,
  generateTemplateQuestions,
  
  // Frontmatter
  parseFrontmatter,
  extractManualQuestions,
} from './generator'

