/**
 * Teach Mode AI Service
 * @module lib/teach/teachModeAI
 *
 * AI-powered student responses and gap analysis for Feynman Technique teaching.
 * Uses LLM streaming for realistic student interactions.
 */

import type { StudentPersona, GapReport } from '@/types/openstrand'
import { streamLLM, type StreamOptions } from '@/lib/llm/streaming'
import type { LLMProvider } from '@/lib/llm'
import { getAPIKey } from '@/lib/config/apiKeyStorage'

// ============================================================================
// TYPES
// ============================================================================

export interface TeachMessage {
  role: 'user' | 'student'
  content: string
}

export interface StudentResponseResult {
  content: string
  gaps?: string[]
}

// ============================================================================
// PERSONA PROMPTS
// ============================================================================

const PERSONA_SYSTEM_PROMPTS: Record<StudentPersona, string> = {
  'curious-child': `You are a curious 8-year-old child learning something new. You:
- Ask "why?" and "what does that mean?" frequently
- Need simple explanations without jargon
- Make connections to things you know (toys, cartoons, school)
- Get excited when you understand something
- Ask for examples from everyday life
- Don't pretend to understand if something is unclear`,

  'exam-prep': `You are a high school student preparing for an important exam. You:
- Focus on what will be tested
- Ask for definitions, formulas, and key facts
- Want to know the most important points
- Ask how to solve practice problems
- Request mnemonics or memory tricks
- Push for clarity on exam-relevant details`,

  'devils-advocate': `You are a skeptical critical thinker who challenges assumptions. You:
- Question every claim and ask for evidence
- Point out logical inconsistencies
- Ask "what about the opposite?" or "what if this is wrong?"
- Push back on oversimplifications
- Demand concrete examples and data
- Never accept hand-waving explanations`,

  'visual-learner': `You are a visual learner who needs concrete examples. You:
- Ask for diagrams, drawings, or visualizations
- Request real-world examples you can picture
- Ask "what does this look like in practice?"
- Prefer analogies and metaphors
- Need step-by-step walkthroughs
- Ask to see the process, not just the result`,

  'socratic': `You are a Socratic questioner who guides through questions. You:
- Ask "what do you mean by that term?"
- Probe assumptions with "why do you think that?"
- Never give answers, only questions
- Guide toward deeper understanding
- Ask "what follows from that?"
- Help discover contradictions in reasoning`,
}

// ============================================================================
// PROVIDER SELECTION
// ============================================================================

async function selectProvider(): Promise<{ provider: LLMProvider; apiKey: string; model: string } | null> {
  // Try Anthropic first (better at roleplay)
  const anthropicKey = await getAPIKey('anthropic')
  if (anthropicKey) {
    return { provider: 'anthropic', apiKey: anthropicKey.key, model: 'claude-3-haiku-20240307' }
  }

  // Try OpenAI
  const openaiKey = await getAPIKey('openai')
  if (openaiKey) {
    return { provider: 'openai', apiKey: openaiKey.key, model: 'gpt-4o-mini' }
  }

  return null
}

// ============================================================================
// STUDENT RESPONSE GENERATION
// ============================================================================

/**
 * Generate a student response based on persona and conversation
 */
export async function generateStudentResponse(
  persona: StudentPersona,
  userMessage: string,
  strandContent: string,
  previousMessages: TeachMessage[],
  signal?: AbortSignal
): Promise<StudentResponseResult> {
  const providerInfo = await selectProvider()

  if (!providerInfo) {
    // Fallback to placeholder response if no API key
    return generatePlaceholderResponse(persona, userMessage)
  }

  const systemPrompt = `${PERSONA_SYSTEM_PROMPTS[persona]}

You are being taught about a topic by a student who is practicing the Feynman Technique.
Your job is to help them discover gaps in their understanding by asking clarifying questions.

The source material they should know:
${strandContent.slice(0, 2000)}

Respond naturally as this student persona. Keep responses concise (1-3 sentences).
If their explanation has gaps or is unclear, ask a question that exposes the gap.
End your response with a question or prompt for more explanation.`

  // Build conversation history
  const messages = previousMessages.map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }))
  messages.push({ role: 'user' as const, content: userMessage })

  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages,
    system: systemPrompt,
    maxTokens: 150,
    temperature: 0.8,
    signal,
  }

  let fullContent = ''

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content
      } else if (chunk.type === 'error') {
        console.error('[TeachModeAI] Stream error:', chunk.error)
        return generatePlaceholderResponse(persona, userMessage)
      }
    }

    // Simple gap detection based on the student's response
    const gaps = detectGapsFromResponse(fullContent, userMessage)

    return {
      content: fullContent.trim(),
      gaps: gaps.length > 0 ? gaps : undefined,
    }
  } catch (error) {
    console.error('[TeachModeAI] Failed to generate response:', error)
    return generatePlaceholderResponse(persona, userMessage)
  }
}

/**
 * Generate initial greeting for a persona
 */
export async function generateGreeting(
  persona: StudentPersona,
  topicTitle: string,
  signal?: AbortSignal
): Promise<string> {
  const providerInfo = await selectProvider()

  if (!providerInfo) {
    return getDefaultGreeting(persona, topicTitle)
  }

  const systemPrompt = `${PERSONA_SYSTEM_PROMPTS[persona]}

Generate a short greeting (1-2 sentences) introducing yourself and asking the teacher to start explaining the topic: "${topicTitle}".
Be in character for this persona.`

  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages: [{ role: 'user', content: `Greet me and ask me to teach you about "${topicTitle}"` }],
    system: systemPrompt,
    maxTokens: 100,
    temperature: 0.9,
    signal,
  }

  let greeting = ''

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        greeting += chunk.content
      }
    }
    return greeting.trim() || getDefaultGreeting(persona, topicTitle)
  } catch {
    return getDefaultGreeting(persona, topicTitle)
  }
}

// ============================================================================
// GAP REPORT GENERATION
// ============================================================================

/**
 * Generate a comprehensive gap report from the teaching session
 */
export async function generateGapReport(
  userTranscript: string,
  strandContent: string,
  signal?: AbortSignal
): Promise<GapReport> {
  const providerInfo = await selectProvider()

  if (!providerInfo) {
    return generatePlaceholderGapReport(userTranscript)
  }

  const systemPrompt = `You are an educational assessment expert analyzing a teaching session.

Compare what the student explained to the source material and identify:
1. Concepts they covered well
2. Gaps in their understanding
3. Suggestions for improvement

Source material:
${strandContent.slice(0, 3000)}

Student's explanations:
${userTranscript.slice(0, 2000)}

Respond in this exact JSON format:
{
  "covered": ["concept 1", "concept 2"],
  "gaps": ["gap 1", "gap 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "coveragePercent": 75
}

Be specific and constructive. Estimate coverage percent based on how much of the source material was explained.`

  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages: [{ role: 'user', content: 'Analyze this teaching session and provide a gap report.' }],
    system: systemPrompt,
    maxTokens: 500,
    temperature: 0.3,
    signal,
  }

  let response = ''

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        response += chunk.content
      }
    }

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        covered: parsed.covered || [],
        gaps: parsed.gaps || [],
        suggestions: parsed.suggestions || [],
        coveragePercent: Math.min(100, Math.max(0, parsed.coveragePercent || 50)),
      }
    }

    return generatePlaceholderGapReport(userTranscript)
  } catch (error) {
    console.error('[TeachModeAI] Failed to generate gap report:', error)
    return generatePlaceholderGapReport(userTranscript)
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDefaultGreeting(persona: StudentPersona, topicTitle: string): string {
  const greetings: Record<StudentPersona, string> = {
    'curious-child': `Oh cool! You're going to teach me about "${topicTitle}"? I don't know anything about it yet. Can you start from the very beginning?`,
    'exam-prep': `I have a test on "${topicTitle}" coming up. What are the most important things I need to know?`,
    'devils-advocate': `So you think you understand "${topicTitle}"? Let's see if your reasoning holds up. Go ahead.`,
    'visual-learner': `I learn best with examples. Can you explain "${topicTitle}" using something I can picture?`,
    'socratic': `Tell me about "${topicTitle}". What is it, fundamentally?`,
  }
  return greetings[persona]
}

function generatePlaceholderResponse(persona: StudentPersona, userMessage: string): StudentResponseResult {
  const questions: Record<StudentPersona, string[]> = {
    'curious-child': [
      "But why does that happen?",
      "What does that word mean?",
      "Can you explain that more simply?",
    ],
    'exam-prep': [
      "Will that be on the test?",
      "What's the definition of that?",
      "What are the key steps?",
    ],
    'devils-advocate': [
      "But what about the opposite case?",
      "How do you know that's actually true?",
      "What evidence supports that?",
    ],
    'visual-learner': [
      "Can you give me a concrete example?",
      "What does that look like in practice?",
      "Can you draw that out?",
    ],
    'socratic': [
      "And what follows from that?",
      "What assumptions are you making?",
      "Is that always the case?",
    ],
  }

  const personaQuestions = questions[persona]
  const randomQuestion = personaQuestions[Math.floor(Math.random() * personaQuestions.length)]

  const gaps: string[] = []
  if (userMessage.length < 50) {
    gaps.push('Explanation may be too brief')
  }

  return {
    content: randomQuestion,
    gaps: gaps.length > 0 ? gaps : undefined,
  }
}

function generatePlaceholderGapReport(userTranscript: string): GapReport {
  const wordCount = userTranscript.split(/\s+/).length
  const coveragePercent = Math.min(95, Math.max(30, wordCount / 5))

  return {
    covered: [
      'Basic concept introduction',
      'Key terminology',
      'Main principles',
    ],
    gaps: [
      'Detailed examples not provided',
      'Edge cases not discussed',
      'Historical context missing',
    ],
    suggestions: [
      'Review section on advanced applications',
      'Practice with more examples',
      'Explore related topics',
    ],
    coveragePercent,
  }
}

function detectGapsFromResponse(studentResponse: string, _userMessage: string): string[] {
  const gaps: string[] = []
  const lowerResponse = studentResponse.toLowerCase()

  if (lowerResponse.includes("don't understand") || lowerResponse.includes("confused")) {
    gaps.push('Clarity issue detected')
  }
  if (lowerResponse.includes("example") || lowerResponse.includes("concrete")) {
    gaps.push('More examples needed')
  }
  if (lowerResponse.includes("why") || lowerResponse.includes("how come")) {
    gaps.push('Deeper explanation requested')
  }

  return gaps
}

/**
 * Check if AI teaching is available (has API key configured)
 */
export async function isTeachModeAIAvailable(): Promise<boolean> {
  const providerInfo = await selectProvider()
  return providerInfo !== null
}
