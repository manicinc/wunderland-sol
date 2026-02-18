#!/usr/bin/env npx ts-node
/**
 * Generate Stable Diffusion Image Prompts for Writing Prompts
 * @module scripts/generate-prompt-images
 *
 * This script generates aesthetic Stable Diffusion prompts for each writing prompt
 * using OpenAI's GPT-4o-mini model.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-xxx npx ts-node scripts/generate-prompt-images.ts --api
 *   npx ts-node scripts/generate-prompt-images.ts (uses local generation)
 *
 * Options:
 *   --api        Use OpenAI API for better SD prompts
 *   --category   Filter by category (e.g., --category=reflection)
 *   --limit      Limit number of prompts (e.g., --limit=10)
 *   --output     Output file path (default: data/prompt-sd-prompts.json)
 *
 * Output:
 *   JSON file with writing prompts and their generated SD prompts
 */

import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ═══════════════════════════════════════════════════════════════════════════
// LOAD PROMPTS FROM SOURCE FILES
// ═══════════════════════════════════════════════════════════════════════════

// We need to manually define prompts here since we can't use ES imports in ts-node
// This loads from the exported JSON catalog or falls back to inline

interface WritingPrompt {
  id: string
  text: string
  category: string
  mood?: string[]
  difficulty?: string
  estimatedTime?: string
  mode?: string
  tags?: string[]
}

/**
 * Load all prompts from source files
 */
function loadAllPrompts(): WritingPrompt[] {
  // Try to load from catalog first
  const catalogPath = path.join(__dirname, '../data/prompts-catalog.json')
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
    return catalog.prompts || []
  }

  // Otherwise, load prompts inline (copied from source files)
  console.log('No catalog found, using inline prompts...')
  return getAllPromptsInline()
}

// ═══════════════════════════════════════════════════════════════════════════
// AESTHETIC CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_AESTHETICS: Record<string, string> = {
  reflection:
    'soft watercolor, introspective mood, mirror imagery, muted blues and purples, dreamy atmosphere, personal journal aesthetic, gentle light rays',
  creative:
    'vibrant abstract art, bold colors, artistic palette, creative energy, paint splashes, imaginative surreal elements, dynamic composition',
  technical:
    'clean minimalist design, geometric patterns, blueprint aesthetic, precise lines, tech-inspired, monochrome with accent colors, grid elements',
  philosophical:
    'cosmic imagery, deep space, contemplative mood, stars and nebulae, ethereal lighting, profound and mysterious, vast scale',
  practical:
    'warm earthy tones, organized workspace, natural materials, craft aesthetic, hands-on feeling, cozy productivity, artisan style',
  exploration:
    'adventure imagery, maps and compasses, discovery aesthetic, golden hour lighting, wanderlust vibes, horizon views, journey feeling',
  personal:
    'intimate photography style, soft natural light, memoir aesthetic, nostalgic film grain, personal artifacts, warm memories, vintage textures',
  learning:
    'library aesthetic, books and scrolls, scholarly mood, warm lamp light, knowledge symbols, educational vintage style, antique study',
}

const MOOD_PALETTES: Record<string, string> = {
  focused: 'deep blues and silver, concentrated energy',
  creative: 'rainbow spectrum, artistic chaos, vibrant',
  curious: 'amber and gold, mysterious shadows, discovery',
  relaxed: 'soft greens and teals, calm waters, peaceful',
  energetic: 'orange and red, dynamic movement, alive',
  reflective: 'purple twilight, mirror surfaces, contemplative',
  anxious: 'muted orange, scattered elements, restless',
  grateful: 'rose gold, warm embrace, heartfelt',
  tired: 'soft grays, gentle curves, restful',
  peaceful: 'seafoam and cream, still waters, serene',
  excited: 'electric purple, sparkling, celebratory',
  neutral: 'balanced grays, clean space, minimal',
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PromptWithSDImage {
  id: string
  text: string
  category: string
  mood?: string[]
  sdPrompt: string
  aesthetic: string
  generatedAt: string
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateSDPrompt(openai: OpenAI, prompt: WritingPrompt): Promise<string> {
  const categoryAesthetic = CATEGORY_AESTHETICS[prompt.category] || CATEGORY_AESTHETICS.reflection
  const moodPalette = prompt.mood?.[0] ? MOOD_PALETTES[prompt.mood[0]] : ''

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert at creating Stable Diffusion image prompts. Generate beautiful, evocative prompts that work well for journal/writing prompt cover images.

Rules:
- Output ONLY the SD prompt, no explanations or commentary
- Keep prompts under 200 characters
- Include artistic style, mood, colors, and composition
- No text, words, or letters in the image
- Square format composition
- Avoid faces or identifiable people
- Focus on abstract, symbolic, or atmospheric imagery
- Make the image feel artistic and inspiring`,
      },
      {
        role: 'user',
        content: `Create a Stable Diffusion prompt for this writing prompt:
"${prompt.text}"

Category aesthetic: ${categoryAesthetic}
${moodPalette ? `Color palette hints: ${moodPalette}` : ''}

Generate an artistic, abstract interpretation that captures the emotional essence without being too literal.`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  })

  return response.choices[0].message.content?.trim() || ''
}

function generateLocalSDPrompt(prompt: WritingPrompt): string {
  const aesthetic = CATEGORY_AESTHETICS[prompt.category] || CATEGORY_AESTHETICS.reflection
  const moodPalette = prompt.mood?.[0] ? MOOD_PALETTES[prompt.mood[0]] : ''

  const concepts = prompt.text
    .replace(
      /^(what|how|when|where|why|if|describe|write about|write a|reflect on|explain|document|create|imagine|tell|recall)\s+/i,
      ''
    )
    .replace(/\?$/, '')
    .slice(0, 80)

  return [aesthetic, `evocative imagery of "${concepts}"`, moodPalette, 'square format, no text, artistic illustration']
    .filter(Boolean)
    .join(', ')
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE PROMPTS (all 220 prompts)
// ═══════════════════════════════════════════════════════════════════════════

function getAllPromptsInline(): WritingPrompt[] {
  // Base 40 prompts
  const basePrompts: WritingPrompt[] = [
    { id: 'r1', text: 'What lesson took you the longest to learn, and why?', category: 'reflection', mood: ['reflective', 'curious'] },
    { id: 'r2', text: 'Describe a belief you held strongly but have since changed.', category: 'reflection', mood: ['reflective'] },
    { id: 'r3', text: 'What would your 10-year-ago self think of your life now?', category: 'reflection', mood: ['reflective', 'curious'] },
    { id: 'r4', text: 'Write about a moment that changed how you see the world.', category: 'reflection', mood: ['reflective', 'peaceful'] },
    { id: 'r5', text: 'What fear have you overcome? What helped you through it?', category: 'reflection', mood: ['reflective', 'energetic'] },
    { id: 'c1', text: "Invent a word for a feeling that doesn't have a name yet.", category: 'creative', mood: ['creative', 'curious'] },
    { id: 'c2', text: 'Describe a color to someone who has never seen it.', category: 'creative', mood: ['creative'] },
    { id: 'c3', text: 'Write about an ordinary object as if it were magical.', category: 'creative', mood: ['creative', 'peaceful'] },
    { id: 'c4', text: 'Create a short myth explaining why the sky changes colors.', category: 'creative', mood: ['creative', 'relaxed'] },
    { id: 'c5', text: "Tell a story that starts with the ending.", category: 'creative', mood: ['creative', 'energetic'] },
    { id: 't1', text: 'Document a process you do often but have never written down.', category: 'technical', mood: ['focused'] },
    { id: 't2', text: 'Explain a complex concept as if teaching a beginner.', category: 'technical', mood: ['focused', 'creative'] },
    { id: 't3', text: 'Create a troubleshooting guide for a common problem.', category: 'technical', mood: ['focused'] },
    { id: 't4', text: 'Write down your decision-making framework for important choices.', category: 'technical', mood: ['focused', 'reflective'] },
    { id: 't5', text: 'Document the tools you use daily and why you chose them.', category: 'technical', mood: ['focused', 'relaxed'] },
    { id: 'p1', text: 'What is something everyone believes that you think is wrong?', category: 'philosophical', mood: ['curious', 'reflective'] },
    { id: 'p2', text: 'If you could know the absolute truth about one thing, what would it be?', category: 'philosophical', mood: ['curious'] },
    { id: 'p3', text: 'What makes something beautiful to you?', category: 'philosophical', mood: ['reflective', 'peaceful'] },
    { id: 'p4', text: 'Explore the difference between happiness and meaning.', category: 'philosophical', mood: ['reflective'] },
    { id: 'p5', text: 'What would you do differently if no one would ever know?', category: 'philosophical', mood: ['reflective', 'curious'] },
    { id: 'pr1', text: 'Document your morning routine and why each step matters.', category: 'practical', mood: ['focused', 'energetic'] },
    { id: 'pr2', text: 'Create a checklist for a task you want to master.', category: 'practical', mood: ['focused'] },
    { id: 'pr3', text: 'Write a guide for future you on handling a specific situation.', category: 'practical', mood: ['focused', 'reflective'] },
    { id: 'pr4', text: 'List and explain your personal productivity principles.', category: 'practical', mood: ['focused', 'energetic'] },
    { id: 'pr5', text: 'Document a recipe (for food, or for anything else in life).', category: 'practical', mood: ['relaxed', 'creative'] },
    { id: 'e1', text: 'Explore a Wikipedia rabbit hole and document your journey.', category: 'exploration', mood: ['curious', 'energetic'] },
    { id: 'e2', text: 'Research something you know nothing about. What surprised you?', category: 'exploration', mood: ['curious'] },
    { id: 'e3', text: 'Find connections between two unrelated topics you enjoy.', category: 'exploration', mood: ['curious', 'creative'] },
    { id: 'e4', text: 'Investigate the history of something you use every day.', category: 'exploration', mood: ['curious', 'focused'] },
    { id: 'e5', text: 'Explore a question you\'ve always wondered about but never looked up.', category: 'exploration', mood: ['curious'] },
    { id: 'pe1', text: 'Write a letter to someone who shaped who you are.', category: 'personal', mood: ['reflective', 'grateful'] },
    { id: 'pe2', text: 'Describe your perfect ordinary day in detail.', category: 'personal', mood: ['peaceful', 'relaxed'] },
    { id: 'pe3', text: 'What are you most grateful for right now, and why?', category: 'personal', mood: ['grateful', 'peaceful'] },
    { id: 'pe4', text: 'Write about a small moment that brought you unexpected joy.', category: 'personal', mood: ['grateful', 'peaceful'] },
    { id: 'pe5', text: 'Describe a relationship that has evolved in surprising ways.', category: 'personal', mood: ['reflective'] },
    { id: 'l1', text: 'Summarize the most interesting thing you learned this week.', category: 'learning', mood: ['focused', 'curious'] },
    { id: 'l2', text: 'Teach a concept by explaining it three different ways.', category: 'learning', mood: ['focused', 'creative'] },
    { id: 'l3', text: 'Create a study guide for something you want to remember.', category: 'learning', mood: ['focused'] },
    { id: 'l4', text: 'Write about a misconception you used to have.', category: 'learning', mood: ['reflective', 'curious'] },
    { id: 'l5', text: 'Document the key insights from a book, video, or article.', category: 'learning', mood: ['focused', 'relaxed'] },
  ]

  // Nonfiction 80 prompts
  const nonfictionPrompts: WritingPrompt[] = [
    { id: 'nr1', text: "Imagine you've traveled through time and encountered a younger version of yourself. What lesson would you share?", category: 'reflection', mood: ['reflective'] },
    { id: 'nr2', text: 'Tell me about a moment when you were terrified to do something, but you did it anyway.', category: 'reflection', mood: ['reflective', 'energetic'] },
    { id: 'nr3', text: 'What moment from your childhood set you on your current career path?', category: 'reflection', mood: ['reflective', 'curious'] },
    { id: 'nr4', text: 'What adult had the most influence on molding who you are today?', category: 'reflection', mood: ['reflective', 'grateful'] },
    { id: 'nr5', text: 'Write about a relationship that was unexpected or outside your usual type.', category: 'reflection', mood: ['reflective'] },
    { id: 'nr6', text: 'Write about something you do now that the old you would never believe.', category: 'reflection', mood: ['reflective', 'excited'] },
    { id: 'nr7', text: 'What single event has most strongly shaped who you currently are?', category: 'reflection', mood: ['reflective'] },
    { id: 'nr8', text: 'Revisit a moment you feel you will never be able to forget. Why is it unforgettable?', category: 'reflection', mood: ['reflective'] },
    { id: 'nr9', text: 'Write about an experience that has made you more resilient.', category: 'reflection', mood: ['reflective', 'energetic'] },
    { id: 'nr10', text: 'What relationship in your life has caused the most pain? Write about the key scene.', category: 'reflection', mood: ['reflective', 'anxious'] },
    { id: 'nr11', text: "Write about a time you chose to remain silent. Why didn't you speak?", category: 'reflection', mood: ['reflective'] },
    { id: 'nr12', text: 'Describe a scene from your memory reimagined from an alternate perspective.', category: 'reflection', mood: ['reflective', 'creative'] },
    { id: 'nr13', text: 'Write about a fork in the road in your life, and how you made that decision.', category: 'reflection', mood: ['reflective'] },
    { id: 'nr14', text: 'What do you want more than anything in life? Write about the burning core of your desire.', category: 'reflection', mood: ['reflective', 'energetic'] },
    { id: 'nr15', text: 'Write about a time you felt like an outsider at an event.', category: 'reflection', mood: ['reflective', 'anxious'] },
    { id: 'nc1', text: "Write your autobiography using only other people's book titles.", category: 'creative', mood: ['creative'] },
    { id: 'nc2', text: 'Take a boring moment from today and make it dramatic with ecstatic prose.', category: 'creative', mood: ['creative', 'energetic'] },
    { id: 'nc3', text: 'Describe your favorite meal. Then describe a conflict with the people you shared it with.', category: 'creative', mood: ['creative'] },
    { id: 'nc4', text: 'Write about a date that took an unexpected turn.', category: 'creative', mood: ['creative', 'curious'] },
    { id: 'nc5', text: 'Rewrite a favorite childhood story with an alternative ending.', category: 'creative', mood: ['creative'] },
    { id: 'nc6', text: 'Imagine a world where days are getting progressively shorter. How do your characters save humanity?', category: 'creative', mood: ['creative', 'energetic'] },
    { id: 'nc7', text: 'Write a scene where your main character wakes up on a train destined somewhere tropical.', category: 'creative', mood: ['creative', 'relaxed'] },
    { id: 'nc8', text: 'Your main character wakes up with a superpower. What happens next?', category: 'creative', mood: ['creative', 'excited'] },
    { id: 'nc9', text: 'Write a story based on your most recent text message.', category: 'creative', mood: ['creative', 'curious'] },
    { id: 'nc10', text: 'Create a mini-mythology to explain your morning coffee ritual.', category: 'creative', mood: ['creative'] },
    { id: 'nc11', text: 'Write from the perspective of an inanimate object in your home.', category: 'creative', mood: ['creative'] },
    { id: 'nc12', text: 'Describe your house disappearing and being replaced with a supermarket. What happens?', category: 'creative', mood: ['creative', 'curious'] },
    { id: 'nc13', text: "Write a comedic story from the perspective of a restaurant server on Valentine's Day.", category: 'creative', mood: ['creative', 'energetic'] },
    { id: 'nc14', text: 'Two friends discover their lake has magic powers. Write about their adventure.', category: 'creative', mood: ['creative', 'excited'] },
    { id: 'nc15', text: "Write a poem from the sun's perspective.", category: 'creative', mood: ['creative', 'peaceful'] },
    { id: 'np1', text: 'Tell the story of your name.', category: 'personal', mood: ['reflective'] },
    { id: 'np2', text: 'What did you collect as a child or teenager? Why?', category: 'personal', mood: ['curious', 'relaxed'] },
    { id: 'np3', text: 'Write about your childhood home in vivid detail.', category: 'personal', mood: ['reflective', 'peaceful'] },
    { id: 'np4', text: 'Describe a family heirloom and why it matters to you.', category: 'personal', mood: ['reflective', 'grateful'] },
    { id: 'np5', text: "Write about the day you got your driver's license.", category: 'personal', mood: ['energetic', 'excited'] },
    { id: 'np6', text: 'What nickname did you have growing up? Who gave it to you?', category: 'personal', mood: ['relaxed'] },
    { id: 'np7', text: 'Write about your first pet, or the first thing you cared for.', category: 'personal', mood: ['reflective', 'grateful'] },
    { id: 'np8', text: 'Tell the story of one of your family holiday gatherings.', category: 'personal', mood: ['relaxed', 'grateful'] },
    { id: 'np9', text: 'Who was your childhood best friend? Write about that friendship.', category: 'personal', mood: ['reflective'] },
    { id: 'np10', text: 'How did your relationship with your city evolve as you grew up?', category: 'personal', mood: ['reflective', 'curious'] },
    { id: 'np11', text: 'Write about a tradition that matters to you and why.', category: 'personal', mood: ['grateful', 'peaceful'] },
    { id: 'np12', text: "Go through your phone's photo gallery. What story do 20 different photos tell?", category: 'personal', mood: ['curious', 'reflective'] },
    { id: 'np13', text: 'Write a letter to someone who shaped who you are today.', category: 'personal', mood: ['reflective', 'grateful'] },
    { id: 'np14', text: "Tell a story you'd never want your parents to read.", category: 'personal', mood: ['creative', 'anxious'] },
    { id: 'np15', text: 'What was the best/worst letter you ever received or wrote?', category: 'personal', mood: ['reflective'] },
    { id: 'nph1', text: 'What does it mean to say "I love you"? When did you first feel loved?', category: 'philosophical', mood: ['reflective', 'grateful'] },
    { id: 'nph2', text: 'In the circle of life, beginnings are preceded by endings. Write about an ending that led to a beginning.', category: 'philosophical', mood: ['reflective'] },
    { id: 'nph3', text: 'What makes you feel guilty? Explore a moment you are ashamed of.', category: 'philosophical', mood: ['reflective', 'anxious'] },
    { id: 'nph4', text: 'How has your identity changed over your life? Compare scenes from your teens and now.', category: 'philosophical', mood: ['reflective', 'curious'] },
    { id: 'nph5', text: "What is something you see others doing that you'd do differently if they knew what you know?", category: 'philosophical', mood: ['reflective'] },
    { id: 'nph6', text: 'Write about a time you acted selflessly. What motivated you?', category: 'philosophical', mood: ['reflective', 'grateful'] },
    { id: 'nph7', text: 'Creativity can process heartache. Write about the last time you felt grief.', category: 'philosophical', mood: ['reflective', 'peaceful'] },
    { id: 'nph8', text: 'Consider the meaning of beauty and how it has evolved. Write about this.', category: 'philosophical', mood: ['reflective', 'curious'] },
    { id: 'nph9', text: 'If you could give $100,000 to any charity, which would you choose and why?', category: 'philosophical', mood: ['reflective'] },
    { id: 'nph10', text: 'Scientists wonder about nature vs nurture. Where are you and your siblings today?', category: 'philosophical', mood: ['reflective', 'curious'] },
    { id: 'ne1', text: 'Go through your search history and write about a topic you researched obsessively.', category: 'exploration', mood: ['curious', 'energetic'] },
    { id: 'ne2', text: "Write a portrait of what's in your bookshelf at this moment.", category: 'exploration', mood: ['curious', 'relaxed'] },
    { id: 'ne3', text: 'Research and write about the origin story of something you use daily.', category: 'exploration', mood: ['curious'] },
    { id: 'ne4', text: 'Describe your favorite room in your house and why it matters.', category: 'exploration', mood: ['relaxed', 'peaceful'] },
    { id: 'ne5', text: 'Write about a trip you took and where your fellow travelers ended up in life.', category: 'exploration', mood: ['curious', 'reflective'] },
    { id: 'ne6', text: 'If time, money, and pandemics were no object, where would you visit and why?', category: 'exploration', mood: ['curious', 'excited'] },
    { id: 'ne7', text: 'Write about a location close to your heart—your connection, however small.', category: 'exploration', mood: ['reflective', 'peaceful'] },
    { id: 'ne8', text: 'Write about an encounter with someone new who changed your life forever.', category: 'exploration', mood: ['curious', 'excited'] },
    { id: 'ne9', text: 'Describe your last vacation in present tense, as if living it now.', category: 'exploration', mood: ['relaxed', 'energetic'] },
    { id: 'ne10', text: 'Write about a time you explored somewhere new. What did you discover?', category: 'exploration', mood: ['curious', 'energetic'] },
    { id: 'npr1', text: "Document a skill you've mastered in a way others could follow.", category: 'practical', mood: ['focused'] },
    { id: 'npr2', text: "Create a troubleshooting guide for a problem you've solved before.", category: 'practical', mood: ['focused'] },
    { id: 'npr3', text: 'Write a guide to the best local spots only you know about.', category: 'practical', mood: ['energetic', 'relaxed'] },
    { id: 'npr4', text: 'If you could take on one home improvement project today, what would it be?', category: 'practical', mood: ['focused', 'energetic'] },
    { id: 'npr5', text: 'Make a list of the 3 best things that happened this week and explain why.', category: 'practical', mood: ['grateful', 'relaxed'] },
    { id: 'npr6', text: "Write about a resolution you didn't keep. What did releasing it teach you?", category: 'practical', mood: ['reflective'] },
    { id: 'npr7', text: 'Document your ideal workflow for a creative task you do often.', category: 'practical', mood: ['focused'] },
    { id: 'npr8', text: 'Write a packing list and rationale for your dream trip.', category: 'practical', mood: ['relaxed', 'excited'] },
    { id: 'nl1', text: 'Recall a key lesson that family tried to impart. How do you interpret it now?', category: 'learning', mood: ['reflective', 'curious'] },
    { id: 'nl2', text: "Write about something you're scared of and how you plan to overcome it.", category: 'learning', mood: ['reflective', 'energetic'] },
    { id: 'nl3', text: 'Explore an addiction you had or have. Describe the first time you tried it.', category: 'learning', mood: ['reflective'] },
    { id: 'nl4', text: 'What challenge did you overcome? Write about the experience and lessons.', category: 'learning', mood: ['reflective', 'energetic'] },
    { id: 'nl5', text: 'Recall someone you hated. Describe their behavior and try to understand why.', category: 'learning', mood: ['reflective'] },
    { id: 'nl6', text: 'Write about a moment you learned to take your own advice.', category: 'learning', mood: ['reflective'] },
    { id: 'nl7', text: 'Pick an impactful childhood moment. Write about it from the lens of adulthood.', category: 'learning', mood: ['reflective', 'curious'] },
  ]

  return [...basePrompts, ...nonfictionPrompts]
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2)
  const useApi = args.includes('--api')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined
  const categoryArg = args.find((a) => a.startsWith('--category='))
  const category = categoryArg ? categoryArg.split('=')[1] : undefined
  const outputArg = args.find((a) => a.startsWith('--output='))
  const outputPath = outputArg
    ? outputArg.split('=')[1]
    : path.join(__dirname, '../data/prompt-sd-prompts.json')

  console.log('='.repeat(60))
  console.log('Stable Diffusion Prompt Generator for Writing Prompts')
  console.log('='.repeat(60))

  let openai: OpenAI | null = null

  if (useApi) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('\nError: OPENAI_API_KEY environment variable not set')
      console.error('Usage: OPENAI_API_KEY=sk-xxx npx ts-node scripts/generate-prompt-images.ts --api')
      process.exit(1)
    }
    openai = new OpenAI({ apiKey })
    console.log('\nUsing OpenAI API for generation')
  } else {
    console.log('\nUsing local generation (no API)')
    console.log('Add --api flag to use OpenAI for better results')
  }

  // Load all prompts
  let prompts = loadAllPrompts()
  console.log(`\nLoaded ${prompts.length} prompts`)

  if (category) {
    prompts = prompts.filter((p) => p.category === category)
    console.log(`Filtered to category: ${category} (${prompts.length} prompts)`)
  }
  if (limit) {
    prompts = prompts.slice(0, limit)
    console.log(`Limited to: ${limit} prompts`)
  }

  console.log(`\nProcessing ${prompts.length} prompts...`)
  console.log('-'.repeat(60))

  const results: PromptWithSDImage[] = []

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]
    const progress = `[${i + 1}/${prompts.length}]`
    process.stdout.write(`${progress} ${prompt.id}: ${prompt.text.slice(0, 40)}...`)

    let sdPrompt: string

    if (openai) {
      try {
        sdPrompt = await generateSDPrompt(openai, prompt)
        await new Promise((r) => setTimeout(r, 300)) // Rate limit
      } catch (error) {
        console.log(' [API error, using local]')
        sdPrompt = generateLocalSDPrompt(prompt)
      }
    } else {
      sdPrompt = generateLocalSDPrompt(prompt)
    }

    console.log(' ✓')

    results.push({
      id: prompt.id,
      text: prompt.text,
      category: prompt.category,
      mood: prompt.mood,
      sdPrompt,
      aesthetic: CATEGORY_AESTHETICS[prompt.category],
      generatedAt: new Date().toISOString(),
    })
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log(`Generated ${results.length} SD prompts`)
  console.log(`Output: ${outputPath}`)
  console.log('='.repeat(60))
}

main().catch(console.error)
