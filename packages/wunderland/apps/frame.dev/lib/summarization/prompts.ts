/**
 * Summarization Prompts
 * @module lib/summarization/prompts
 *
 * Prompt templates for different summary types and configurations.
 */

import type {
  SummaryType,
  SummaryLength,
  SummarizationRequest,
  SummarizationSource,
  SUMMARY_LENGTH_CONFIG,
} from './types'

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const BASE_SYSTEM_PROMPT = `You are an expert research assistant specialized in synthesizing and summarizing information from multiple sources. You provide clear, accurate, and well-organized summaries while maintaining objectivity.`

const SUMMARY_TYPE_PROMPTS: Record<SummaryType, string> = {
  digest: `Create a comprehensive digest that synthesizes information from all sources. Structure it with clear sections covering the main themes. Use smooth transitions between topics and highlight key insights.`,

  abstract: `Write an academic-style abstract following this structure:
1. Background/Context (1-2 sentences)
2. Main findings or arguments (2-3 sentences)
3. Key implications or conclusions (1-2 sentences)
Use formal academic language and passive voice where appropriate.`,

  'key-points': `Extract and present the main takeaways as a numbered list. Each point should:
- Be concise (1-2 sentences)
- Capture a distinct insight or finding
- Be actionable or informative
Order points by importance or logical flow.`,

  comparison: `Compare and contrast the sources using this structure:
1. **Common Themes**: What do sources agree on?
2. **Differences**: Where do sources diverge?
3. **Unique Insights**: What does each source uniquely contribute?
4. **Synthesis**: Overall conclusion from the comparison.
Be specific about which source says what.`,

  executive: `Write a concise executive summary for busy decision-makers:
- Lead with the most important conclusion
- Focus on implications and actionable insights
- Avoid technical jargon
- Use bullet points for key data
Keep it business-focused and to the point.`,
}

const AUDIENCE_MODIFIERS: Record<string, string> = {
  general: `Use clear, accessible language suitable for a general audience. Explain any technical terms.`,
  academic: `Use formal academic language with precise terminology. Assume familiarity with research conventions.`,
  technical: `Use technical language appropriate for subject matter experts. Include specific details and terminology.`,
  executive: `Use concise business language. Focus on implications, outcomes, and actionable insights.`,
}

const LENGTH_MODIFIERS: Record<SummaryLength, string> = {
  brief: `Keep the summary very concise, approximately 50-100 words. Focus only on the most essential points.`,
  standard: `Aim for a balanced summary of approximately 150-250 words. Cover main points with adequate context.`,
  detailed: `Provide a comprehensive summary of approximately 300-500 words. Include supporting details and nuances.`,
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

/**
 * Build the complete system prompt for summarization
 */
export function buildSystemPrompt(request: SummarizationRequest): string {
  const parts = [
    BASE_SYSTEM_PROMPT,
    '',
    '## Task',
    SUMMARY_TYPE_PROMPTS[request.type],
    '',
    '## Length',
    LENGTH_MODIFIERS[request.length],
  ]

  if (request.audience) {
    parts.push('', '## Audience', AUDIENCE_MODIFIERS[request.audience] || AUDIENCE_MODIFIERS.general)
  }

  if (request.includeCitations) {
    parts.push('', '## Citations', 'Include inline citations in [Author/Source] format to attribute key claims to their sources.')
  }

  if (request.focus) {
    parts.push('', '## Focus Area', `Pay particular attention to: ${request.focus}`)
  }

  return parts.join('\n')
}

/**
 * Build the user prompt with source content
 */
export function buildUserPrompt(sources: SummarizationSource[], type: SummaryType): string {
  const sourceSections = sources.map((source, i) => {
    const parts = [
      `### Source ${i + 1}: ${source.title}`,
      `URL: ${source.url}`,
    ]

    if (source.authors?.length) {
      parts.push(`Authors: ${source.authors.join(', ')}`)
    }

    if (source.isAcademic) {
      parts.push(`Type: Academic/Research`)
    }

    parts.push('', 'Content:', source.content, '')

    return parts.join('\n')
  }).join('\n---\n\n')

  let intro: string
  switch (type) {
    case 'comparison':
      intro = `Please compare and contrast the following ${sources.length} sources:`
      break
    case 'key-points':
      intro = `Please extract the key points from the following ${sources.length} source(s):`
      break
    case 'abstract':
      intro = `Please write an academic abstract synthesizing the following ${sources.length} source(s):`
      break
    case 'executive':
      intro = `Please provide an executive summary of the following ${sources.length} source(s):`
      break
    default:
      intro = `Please summarize the following ${sources.length} source(s):`
  }

  return `${intro}\n\n${sourceSections}`
}

/**
 * Build prompt for scraping and summarizing a URL
 */
export function buildScrapeSummaryPrompt(url: string, content: string, type: SummaryType): string {
  return buildUserPrompt(
    [{
      title: 'Web Page',
      url,
      content,
      domain: new URL(url).hostname,
    }],
    type
  )
}

// ============================================================================
// UTILITY PROMPTS
// ============================================================================

/**
 * Prompt for extracting key quotes from sources
 */
export function buildQuoteExtractionPrompt(sources: SummarizationSource[]): string {
  return `Extract the 3-5 most significant quotes from these sources. For each quote:
1. Provide the exact quote in quotation marks
2. Indicate the source
3. Briefly explain why this quote is significant

Sources:
${sources.map((s, i) => `${i + 1}. ${s.title}\n${s.content}`).join('\n\n')}`
}

/**
 * Prompt for generating discussion questions
 */
export function buildDiscussionQuestionsPrompt(sources: SummarizationSource[]): string {
  return `Based on these research sources, generate 5 thought-provoking discussion questions that:
- Encourage critical thinking
- Connect ideas across sources
- Highlight areas of debate or uncertainty
- Could lead to further research

Sources:
${sources.map((s, i) => `${i + 1}. ${s.title}: ${s.content}`).join('\n\n')}`
}

/**
 * Prompt for generating a literature review outline
 */
export function buildLitReviewOutlinePrompt(sources: SummarizationSource[]): string {
  return `Create an outline for a literature review based on these sources. Structure:

1. Introduction
   - Research question/topic
   - Scope of review

2. Thematic Sections (identify 2-4 major themes)
   - For each theme: which sources address it and how

3. Analysis
   - Common findings
   - Gaps in research
   - Methodological considerations

4. Conclusion
   - Key takeaways
   - Future research directions

Sources:
${sources.map((s, i) => `${i + 1}. ${s.title} (${s.isAcademic ? 'Academic' : 'Web'})\n${s.content}`).join('\n\n')}`
}
