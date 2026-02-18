/**
 * NLP Fallback Provider
 * @module lib/llm/nlp
 *
 * Pattern-based analysis as fallback when LLMs unavailable
 */

import nlp from 'compromise'
import type {
  GenreAnalysisResult,
  CharacterExtractionResult,
  SettingExtractionResult,
  WorthinessEvaluationResult,
  StyleRecommendationResult,
  DocumentAnalysisResult,
} from './types'

/**
 * Analyze genre using NLP heuristics
 */
export function analyzeGenreNLP(textSamples: string[]): GenreAnalysisResult {
  const combinedText = textSamples.join(' ').toLowerCase()
  const doc = nlp(textSamples.join(' '))

  // Fiction indicators
  const fictionIndicators = [
    'he said', 'she said', 'thought to himself', 'thought to herself',
    'once upon', 'long ago', 'in a world', 'the story', 'character',
  ]
  const fictionScore = fictionIndicators.filter(ind => combinedText.includes(ind)).length

  // Technical indicators
  const technicalIndicators = [
    'function', 'class', 'method', 'algorithm', 'implementation',
    'system', 'architecture', 'api', 'database', 'configuration',
  ]
  const technicalScore = technicalIndicators.filter(ind => combinedText.includes(ind)).length

  // Educational indicators
  const educationalIndicators = [
    'learn', 'understand', 'example', 'step', 'guide', 'tutorial',
    'lesson', 'practice', 'exercise', 'question',
  ]
  const educationalScore = educationalIndicators.filter(ind => combinedText.includes(ind)).length

  // Determine content type
  let contentType: 'fiction' | 'non-fiction' | 'technical' | 'educational' | 'mixed' = 'non-fiction'
  let genre = 'General Non-Fiction'

  if (technicalScore > 2) {
    contentType = 'technical'
    genre = 'Technical Documentation'
  } else if (educationalScore > 2) {
    contentType = 'educational'
    genre = 'Educational Material'
  } else if (fictionScore > 1) {
    contentType = 'fiction'
    // Try to determine fiction sub-genre
    if (combinedText.includes('space') || combinedText.includes('future')) {
      genre = 'Science Fiction'
    } else if (combinedText.includes('magic') || combinedText.includes('dragon')) {
      genre = 'Fantasy'
    } else if (combinedText.includes('murder') || combinedText.includes('detective')) {
      genre = 'Mystery'
    } else {
      genre = 'Literary Fiction'
    }
  } else {
    contentType = 'non-fiction'
  }

  // Determine target audience
  const sentences = doc.sentences()
  const avgWordsPerSentence = sentences.length > 0
    ? doc.terms().length / sentences.length
    : 15

  let targetAudience = 'adult'
  if (avgWordsPerSentence < 10) {
    targetAudience = 'children'
  } else if (avgWordsPerSentence < 15) {
    targetAudience = 'young-adult'
  } else if (technicalScore > 2) {
    targetAudience = 'professional'
  }

  // Determine narrative style
  const firstPersonCount = (combinedText.match(/\b(i|me|my|we|our)\b/g) || []).length
  const thirdPersonCount = (combinedText.match(/\b(he|she|they|him|her|them)\b/g) || []).length

  let narrativeStyle = 'instructional'
  if (contentType === 'fiction') {
    narrativeStyle = firstPersonCount > thirdPersonCount ? 'first-person' : 'third-person'
  } else if (contentType === 'educational') {
    narrativeStyle = 'instructional'
  } else if (contentType === 'technical') {
    narrativeStyle = 'technical'
  }

  // Extract key themes (most common nouns)
  const nouns = doc.nouns().out('array') as string[]
  const nounFreq: Record<string, number> = {}
  nouns.forEach(noun => {
    const lower = noun.toLowerCase()
    if (lower.length > 3) {
      nounFreq[lower] = (nounFreq[lower] || 0) + 1
    }
  })

  const keyThemes = Object.entries(nounFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([noun]) => noun)

  // Determine mood
  let mood = 'neutral'
  if (combinedText.includes('dark') || combinedText.includes('fear')) {
    mood = 'dark'
  } else if (combinedText.includes('happy') || combinedText.includes('joy')) {
    mood = 'cheerful'
  } else if (combinedText.includes('serious') || combinedText.includes('important')) {
    mood = 'serious'
  }

  return {
    genre,
    contentType,
    targetAudience,
    narrativeStyle,
    keyThemes,
    mood,
    confidence: 0.6, // NLP is less confident than LLM
    method: 'nlp',
  }
}

/**
 * Extract characters using NLP
 */
export function extractCharactersNLP(textSamples: string[]): CharacterExtractionResult {
  const doc = nlp(textSamples.join(' '))
  const people = doc.people()

  const characterMap: Record<string, {
    name: string
    count: number
    contexts: string[]
  }> = {}

  // Find all person names
  people.forEach((person: any) => {
    const name = person.text()
    if (name && name.length > 1) {
      if (!characterMap[name]) {
        characterMap[name] = { name, count: 0, contexts: [] }
      }
      characterMap[name].count++

      // Get surrounding context
      const text = person.out('text')
      const sentences = nlp(text).sentences().out('array') as string[]
      if (sentences.length > 0) {
        characterMap[name].contexts.push(sentences[0])
      }
    }
  })

  // Convert to character array, filter low-frequency names
  const characters = Object.values(characterMap)
    .filter(char => char.count > 1) // Must appear more than once
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 characters
    .map(char => ({
      name: char.name,
      description: char.contexts[0] || `Character mentioned ${char.count} times`,
      visualTraits: [], // NLP can't extract visual traits reliably
      role: char.count > 5 ? 'major' : 'supporting',
      frequency: Math.min(char.count / 10, 1.0),
    }))

  return {
    characters,
    confidence: characters.length > 0 ? 0.5 : 0.3,
    method: 'nlp',
  }
}

/**
 * Extract settings using NLP
 */
export function extractSettingsNLP(textSamples: string[]): SettingExtractionResult {
  const doc = nlp(textSamples.join(' '))
  const places = doc.places()

  const settingMap: Record<string, {
    name: string
    count: number
    contexts: string[]
  }> = {}

  // Find all place names
  places.forEach((place: any) => {
    const name = place.text()
    if (name && name.length > 2) {
      if (!settingMap[name]) {
        settingMap[name] = { name, count: 0, contexts: [] }
      }
      settingMap[name].count++

      const text = place.out('text')
      const sentences = nlp(text).sentences().out('array') as string[]
      if (sentences.length > 0) {
        settingMap[name].contexts.push(sentences[0])
      }
    }
  })

  // Convert to setting array
  const settings = Object.values(settingMap)
    .filter(setting => setting.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(setting => ({
      name: setting.name,
      description: setting.contexts[0] || `Location mentioned ${setting.count} times`,
      visualStyle: [],
      timePeriod: undefined,
      mood: undefined,
      frequency: Math.min(setting.count / 8, 1.0),
    }))

  return {
    settings,
    confidence: settings.length > 0 ? 0.5 : 0.3,
    method: 'nlp',
  }
}

/**
 * Evaluate content worthiness using NLP heuristics
 */
export function evaluateWorthinessNLP(content: string): WorthinessEvaluationResult {
  const lower = content.toLowerCase()
  const wordCount = content.split(/\s+/).length

  // Visual concept indicators
  const visualIndicators = [
    'diagram', 'architecture', 'flow', 'process', 'workflow',
    'structure', 'hierarchy', 'tree', 'graph', 'network',
    'pipeline', 'stages', 'phases', 'components', 'layers',
    'relationship', 'connection', 'interaction', 'overview',
    'visualization', 'illustration', 'figure', 'chart',
  ]

  const foundIndicators = visualIndicators.filter(ind => lower.includes(ind))

  // Scene/character indicators
  const sceneIndicators = [
    'looked at', 'saw', 'watched', 'stared', 'gazed',
    'appeared', 'stood', 'walked', 'entered',
    'face', 'eyes', 'room', 'building', 'street',
  ]

  const foundSceneIndicators = sceneIndicators.filter(ind => lower.includes(ind))

  // Process indicators
  const processIndicators = [
    'first,', 'second,', 'then,', 'next,', 'finally,',
    'step 1', 'step 2', 'phase 1', 'stage 1',
  ]

  const foundProcessIndicators = processIndicators.filter(ind => lower.includes(ind))

  const totalIndicators = foundIndicators.length + foundSceneIndicators.length + foundProcessIndicators.length

  // Decision logic
  if (wordCount < 20) {
    return {
      warrants: false,
      confidence: 0.8,
      reasoning: 'Content too short for meaningful illustration',
      visualConcepts: [],
      method: 'nlp',
    }
  }

  if (totalIndicators === 0) {
    return {
      warrants: false,
      confidence: 0.7,
      reasoning: 'Primarily textual content without clear visual concepts',
      visualConcepts: [],
      method: 'nlp',
    }
  }

  // Determine suggested type
  let suggestedType: WorthinessEvaluationResult['suggestedType'] = undefined
  if (foundIndicators.some(ind => ind.includes('diagram') || ind.includes('architecture'))) {
    suggestedType = 'diagram'
  } else if (foundProcessIndicators.length > 0) {
    suggestedType = 'process'
  } else if (foundSceneIndicators.length > 2) {
    suggestedType = 'scene'
  }

  return {
    warrants: true,
    confidence: Math.min(0.5 + (totalIndicators * 0.1), 0.9),
    reasoning: `Found ${totalIndicators} visual concept indicators`,
    visualConcepts: [...foundIndicators, ...foundSceneIndicators, ...foundProcessIndicators],
    suggestedType,
    method: 'nlp',
  }
}

/**
 * Recommend illustration style based on genre analysis
 */
export function recommendStyleNLP(genreResult: GenreAnalysisResult): StyleRecommendationResult {
  let recommendedPresetId = 'line-art-editorial' // Default
  let reasoning = 'Default style for general content'
  let consistencyStrategy: 'seed' | 'reference' | 'style-transfer' = 'seed'

  // Map content type to style
  if (genreResult.contentType === 'technical') {
    recommendedPresetId = 'technical-diagram'
    reasoning = 'Technical content benefits from precise diagrams'
  } else if (genreResult.contentType === 'educational') {
    recommendedPresetId = 'educational-friendly'
    reasoning = 'Educational content works well with friendly, approachable illustrations'
  } else if (genreResult.contentType === 'fiction') {
    if (genreResult.targetAudience === 'children') {
      recommendedPresetId = 'childrens-cartoon'
      reasoning = 'Children\'s fiction pairs well with playful cartoon style'
    } else if (genreResult.mood === 'dark') {
      recommendedPresetId = 'noir-graphic-novel'
      reasoning = 'Dark fiction benefits from high-contrast dramatic style'
    } else if (genreResult.genre.includes('Literary')) {
      recommendedPresetId = 'muted-watercolor'
      reasoning = 'Literary fiction pairs well with artistic watercolor style'
    } else {
      recommendedPresetId = 'line-art-editorial'
      reasoning = 'Clean line art works well for general fiction'
      consistencyStrategy = 'reference'
    }
  }

  // Generate color palette based on mood
  let colorPalette = {
    primary: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6'],
    accent: ['#3498DB', '#E74C3C'],
    mood: 'neutral professional',
    source: 'auto-detected' as const,
  }

  if (genreResult.mood === 'dark') {
    colorPalette = {
      primary: ['#1C1C1C', '#2E2E2E', '#404040', '#525252'],
      accent: ['#8B0000', '#4A4A4A'],
      mood: 'dark moody',
      source: 'auto-detected' as const,
    }
  } else if (genreResult.mood === 'cheerful') {
    colorPalette = {
      primary: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'],
      accent: ['#F7DC6F', '#85C1E2'],
      mood: 'bright cheerful',
      source: 'auto-detected' as const,
    }
  } else if (genreResult.contentType === 'technical') {
    colorPalette = {
      primary: ['#0366D6', '#044289', '#6A737D', '#586069'],
      accent: ['#28A745', '#D73A49'],
      mood: 'technical clean',
      source: 'auto-detected' as const,
    }
  }

  return {
    recommendedPresetId,
    reasoning,
    colorPalette,
    consistencyStrategy,
    confidence: 0.6,
    method: 'nlp',
  }
}

/**
 * Full document analysis using NLP
 */
export function analyzeDocumentNLP(
  textSamples: string[],
  options: {
    includeCharacters?: boolean
    includeSettings?: boolean
  } = {}
): DocumentAnalysisResult {
  const startTime = Date.now()

  const genre = analyzeGenreNLP(textSamples)

  const characters = options.includeCharacters !== false
    ? extractCharactersNLP(textSamples)
    : undefined

  const settings = options.includeSettings !== false
    ? extractSettingsNLP(textSamples)
    : undefined

  const styleRecommendation = recommendStyleNLP(genre)

  return {
    genre,
    characters,
    settings,
    styleRecommendation,
    method: 'nlp',
    analysisTime: Date.now() - startTime,
  }
}
