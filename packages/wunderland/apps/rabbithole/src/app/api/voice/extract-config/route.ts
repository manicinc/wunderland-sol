import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/api-auth';
import {
  TOOL_CATALOG,
  SKILLS_CATALOG,
  CHANNEL_CATALOG,
} from '@/lib/catalog-data';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AGENT_BUILDER_MODEL = process.env.AGENT_BUILDER_MODEL || 'gpt-5.2';

const IS_HOSTED_MODE =
  process.env.WUNDERLAND_HOSTED_MODE === 'true' ||
  process.env.WUNDERLAND_MANAGED_MODE === 'true' ||
  process.env.NEXT_PUBLIC_WUNDERLAND_HOSTED_MODE === 'true';

const HOSTED_BLOCKED_TOOL_PACKS = new Set<string>(['cli-executor', 'skills']);
const HOSTED_BLOCKED_SKILLS = new Set<string>(['github', 'git', '1password']);

function isHostedBlockedSkill(entry: { name: string; category: string; requiredTools: string[] }): boolean {
  if (HOSTED_BLOCKED_SKILLS.has(entry.name)) return true;
  if (entry.category === 'developer-tools') return true;
  if (entry.requiredTools.includes('filesystem')) return true;
  return false;
}

function buildSystemPrompt(params: {
  validTools: string;
  validSkills: string;
  validChannels: string;
}): string {
  return `You are an AI agent configuration extractor. Given a natural language description of an AI agent, extract structured configuration fields.

## Available Tools (use exact "name" values)
${params.validTools}

## Available Skills (use exact "name" values)
${params.validSkills}

## Available Channels (use exact "platform" values)
${params.validChannels}

## HEXACO Personality Model (values 0.0 to 1.0)
- honesty: Fairness, sincerity, modesty (high = very honest/fair)
- emotionality: Empathy, anxiety sensitivity (high = very emotional/empathetic)
- extraversion: Social boldness, liveliness (high = very outgoing)
- agreeableness: Patience, flexibility (high = very agreeable/patient)
- conscientiousness: Organization, diligence (high = very organized/diligent)
- openness: Creativity, intellectual curiosity (high = very creative/curious)

## Voice Configuration
- Providers: openai, elevenlabs
- OpenAI voices: alloy (neutral), echo (male), fable (neutral), onyx (male), nova (female, default), shimmer (female)
- ElevenLabs voices: rachel (female, default), domi (female), bella (female), antoni (male), josh (male), arnold (male), adam (male), sam (male)
- Extract voice preferences if the user mentions a specific voice, accent, tone, gender preference, or TTS provider.
- If they say "deep voice" → male voice like onyx or adam. "Friendly female" → nova or rachel. "Professional" → adam or onyx.

## Execution Modes
- autonomous: Agent acts freely (within safety bounds)
- human-all: All agent outputs require human approval before execution
- human-dangerous: Only destructive/high-risk actions require human approval (recommended default)

## Instructions
1. Extract as many fields as you can confidently determine from the description.
2. For fields you cannot determine, omit them (set to null).
3. Map described capabilities to the exact tool/skill/channel IDs listed above. For example:
   - "search the web" → tool: "web-search"
   - "post on Telegram" → channel: "telegram"
   - "generate images" → skill: "image-gen"
   - "help with coding" → skill: "coding-agent" (if available in the catalog)
   - "manage GitHub" → skill: "github" (if available in the catalog)
4. Generate a system prompt that captures the described agent's role, personality, and behavior.
5. Infer HEXACO personality traits from the description (e.g., "friendly and helpful" → high agreeableness and extraversion).
6. Always include "web-search", "giphy", and "image-search" in capabilities (they are required).
7. Set confidence scores (0.0-1.0) for each field you extract, based on how clearly it was described.
8. If an existingConfig is provided, merge changes described in the text into the existing configuration. Only override fields that the user explicitly wants to change.
9. For the seedId, generate a URL-safe lowercase identifier (3-64 chars, no spaces) based on the agent name if one was described.

Respond ONLY with valid JSON matching the schema.`;
}

const JSON_SCHEMA = {
  name: 'agent_config',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      seedId: { type: ['string', 'null'], description: 'URL-safe identifier (3-64 chars)' },
      displayName: { type: ['string', 'null'], description: 'Agent display name' },
      bio: { type: ['string', 'null'], description: 'Short agent bio/description (max 500 chars)' },
      systemPrompt: { type: ['string', 'null'], description: 'System prompt defining agent behavior' },
      personality: {
        type: ['object', 'null'],
        properties: {
          honesty: { type: 'number' },
          emotionality: { type: 'number' },
          extraversion: { type: 'number' },
          agreeableness: { type: 'number' },
          conscientiousness: { type: 'number' },
          openness: { type: 'number' },
        },
        required: ['honesty', 'emotionality', 'extraversion', 'agreeableness', 'conscientiousness', 'openness'],
        additionalProperties: false,
      },
      capabilities: {
        type: ['array', 'null'],
        items: { type: 'string' },
        description: 'Tool IDs from catalog',
      },
      skills: {
        type: ['array', 'null'],
        items: { type: 'string' },
        description: 'Skill names from catalog',
      },
      channels: {
        type: ['array', 'null'],
        items: { type: 'string' },
        description: 'Channel platform IDs from catalog',
      },
      executionMode: {
        type: ['string', 'null'],
        enum: ['autonomous', 'human-all', 'human-dangerous', null],
        description: 'Agent execution mode',
      },
      voiceConfig: {
        type: ['object', 'null'],
        properties: {
          provider: { type: 'string', enum: ['openai', 'elevenlabs'] },
          voiceId: { type: 'string', description: 'Voice name/ID from catalog' },
        },
        required: ['provider', 'voiceId'],
        additionalProperties: false,
        description: 'TTS voice configuration (null if not mentioned)',
      },
      confidence: {
        type: 'object',
        additionalProperties: { type: 'number' },
        description: 'Confidence scores (0-1) for each extracted field',
      },
    },
    required: [
      'seedId',
      'displayName',
      'bio',
      'systemPrompt',
      'personality',
      'capabilities',
      'skills',
      'channels',
      'executionMode',
      'voiceConfig',
      'confidence',
    ],
    additionalProperties: false,
  },
};

interface ExtractRequest {
  text: string;
  existingConfig?: Record<string, unknown>;
  hostingMode?: 'managed' | 'self_hosted';
}

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    );
  }

  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  let body: ExtractRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { text, existingConfig } = body;
  if (!text || typeof text !== 'string' || text.trim().length < 5) {
    return NextResponse.json(
      { error: 'Text description must be at least 5 characters' },
      { status: 400 }
    );
  }

  // Build the user message
  let userMessage = `Agent description:\n${text.trim()}`;
  if (existingConfig) {
    userMessage += `\n\nExisting agent configuration (merge changes into this):\n${JSON.stringify(existingConfig, null, 2)}`;
  }

  const requestedHostingMode = body.hostingMode === 'self_hosted' ? 'self_hosted' : 'managed';
  const enforceHostedRestrictions = IS_HOSTED_MODE && requestedHostingMode !== 'self_hosted';

  const toolsForPrompt = enforceHostedRestrictions
    ? TOOL_CATALOG.filter((t) => !HOSTED_BLOCKED_TOOL_PACKS.has(t.name))
    : TOOL_CATALOG;

  const skillsForPrompt = enforceHostedRestrictions
    ? SKILLS_CATALOG.filter((s) => !isHostedBlockedSkill(s))
    : SKILLS_CATALOG;

  const channelsForPrompt = CHANNEL_CATALOG;

  const validTools = toolsForPrompt
    .map((t) => `${t.name} (${t.displayName}: ${t.description})`)
    .join('\n');
  const validSkills = skillsForPrompt
    .map((s) => `${s.name} (${s.displayName}: ${s.description})`)
    .join('\n');
  const validChannels = channelsForPrompt
    .map((c) => `${c.platform} (${c.displayName}: ${c.description})`)
    .join('\n');

  const systemPrompt = buildSystemPrompt({ validTools, validSkills, validChannels });

  const toolIds = toolsForPrompt.map((t) => t.name);
  const skillIds = skillsForPrompt.map((s) => s.name);
  const channelIds = channelsForPrompt.map((c) => c.platform);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AGENT_BUILDER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: JSON_SCHEMA,
        },
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[voice/extract-config] OpenAI error:', res.status, errBody);
      return NextResponse.json(
        { error: 'Config extraction failed' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'No response from extraction model' },
        { status: 502 }
      );
    }

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(content);
    } catch {
      console.error('[voice/extract-config] Invalid JSON from model:', content);
      return NextResponse.json(
        { error: 'Model returned invalid JSON' },
        { status: 502 }
      );
    }

    // Validate extracted IDs against catalogs
    if (Array.isArray(extracted.capabilities)) {
      extracted.capabilities = (extracted.capabilities as string[]).filter(
        (id) => toolIds.includes(id)
      );
      // Ensure required tools are always present
      for (const req of ['web-search', 'giphy', 'image-search']) {
        if (!(extracted.capabilities as string[]).includes(req)) {
          (extracted.capabilities as string[]).push(req);
        }
      }
    }
    if (Array.isArray(extracted.skills)) {
      extracted.skills = (extracted.skills as string[]).filter(
        (id) => skillIds.includes(id)
      );
    }
    if (Array.isArray(extracted.channels)) {
      extracted.channels = (extracted.channels as string[]).filter(
        (id) => channelIds.includes(id)
      );
    }

    return NextResponse.json(extracted);
  } catch (err) {
    console.error('[voice/extract-config] Network error:', err);
    return NextResponse.json(
      { error: 'Failed to reach OpenAI' },
      { status: 502 }
    );
  }
}
