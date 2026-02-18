import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/api-auth';
import {
  TOOL_CATALOG,
  SKILLS_CATALOG,
  CHANNEL_CATALOG,
} from '@/lib/catalog-data';
export const runtime = 'nodejs';

/** Mirrors NLRecommendationResponse from packages/shared/src/nlRecommendation.ts */
interface NLRecommendationResponse {
  recommendations: Array<{
    id?: string;
    category: 'skill' | 'tool' | 'channel';
    itemId: string;
    displayName: string;
    reasoning: string;
    confidence: number;
    accepted?: boolean;
  }>;
  suggestedPreset: string | null;
  suggestedPresetReasoning: string | null;
  personalitySuggestion: {
    traits: { honesty: number; emotionality: number; extraversion: number; agreeableness: number; conscientiousness: number; openness: number };
    reasoning: string;
  } | null;
  securityTierSuggestion: { tier: string; reasoning: string } | null;
  identitySuggestion: { displayName: string | null; bio: string | null; systemPrompt: string | null } | null;
}

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

function buildRecommendationPrompt(params: {
  validTools: string;
  validSkills: string;
  validChannels: string;
}): string {
  return `You are an AI agent configuration advisor. Given a natural language description of an agent, recommend specific skills, tools, channels, personality traits, and security settings. For each recommendation, provide a brief reasoning.

## Available Tools (use exact "name" values)
${params.validTools}

## Available Skills (use exact "name" values)
${params.validSkills}

## Available Channels (use exact "platform" values)
${params.validChannels}

## Security Tiers
- dangerous: All protections OFF (testing only)
- permissive: Lightweight input screening (dev environments)
- balanced: Recommended default (production)
- strict: All layers enabled, external actions gated
- paranoid: Maximum security, HITL for all actions

## HEXACO Personality Model (0.0-1.0 per trait)
- honesty: Fairness, sincerity, modesty (high = very honest/fair)
- emotionality: Empathy, anxiety sensitivity (high = very emotional/empathetic)
- extraversion: Social boldness, liveliness (high = very outgoing)
- agreeableness: Patience, flexibility (high = very agreeable/patient)
- conscientiousness: Organization, diligence (high = very organized/diligent)
- openness: Creativity, intellectual curiosity (high = very creative/curious)

## Agent Presets (suggest one if it closely matches)
- research-assistant: Analytical focus, high conscientiousness
- customer-support: Empathetic, high agreeableness
- creative-writer: Imaginative, high openness
- code-reviewer: Detail-oriented, high conscientiousness and honesty
- data-analyst: Systematic interpreter, methodical
- security-auditor: Vigilant, high honesty and conscientiousness
- devops-assistant: Infrastructure specialist
- personal-assistant: Friendly helper, balanced traits

## Instructions
1. Analyze the user's description to understand their agent's purpose, target audience, deployment context, and behavioral expectations.
2. For each skill, tool, or channel you recommend, provide:
   - The exact catalog ID
   - The display name
   - A 1-sentence reasoning why this is relevant
   - A confidence score (0.0-1.0) based on how clearly the description supports it
3. For personality traits, infer appropriate HEXACO values (0.0-1.0) with overall reasoning.
4. For security tier, recommend the most appropriate tier with reasoning.
5. If a preset matches well, suggest it with reasoning. Set to null if no good match.
6. Generate identity suggestions (displayName, bio, systemPrompt) if enough context exists.
7. Only recommend items with confidence >= 0.5.
8. Always include "web-search", "giphy", and "image-search" as tool recommendations (they are platform defaults).

Respond ONLY with valid JSON matching the schema.`;
}

const RECOMMENDATION_JSON_SCHEMA = {
  name: 'agent_recommendations',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['skill', 'tool', 'channel'] },
            itemId: { type: 'string' },
            displayName: { type: 'string' },
            reasoning: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['category', 'itemId', 'displayName', 'reasoning', 'confidence'],
          additionalProperties: false,
        },
      },
      suggestedPreset: { type: ['string', 'null'] },
      suggestedPresetReasoning: { type: ['string', 'null'] },
      personalitySuggestion: {
        type: ['object', 'null'],
        properties: {
          traits: {
            type: 'object',
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
          reasoning: { type: 'string' },
        },
        required: ['traits', 'reasoning'],
        additionalProperties: false,
      },
      securityTierSuggestion: {
        type: ['object', 'null'],
        properties: {
          tier: { type: 'string' },
          reasoning: { type: 'string' },
        },
        required: ['tier', 'reasoning'],
        additionalProperties: false,
      },
      identitySuggestion: {
        type: ['object', 'null'],
        properties: {
          displayName: { type: ['string', 'null'] },
          bio: { type: ['string', 'null'] },
          systemPrompt: { type: ['string', 'null'] },
        },
        required: ['displayName', 'bio', 'systemPrompt'],
        additionalProperties: false,
      },
    },
    required: [
      'recommendations',
      'suggestedPreset',
      'suggestedPresetReasoning',
      'personalitySuggestion',
      'securityTierSuggestion',
      'identitySuggestion',
    ],
    additionalProperties: false,
  },
};

interface RecommendRequest {
  description: string;
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

  let body: RecommendRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { description } = body;
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return NextResponse.json(
      { error: 'Description must be at least 10 characters' },
      { status: 400 }
    );
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

  const systemPrompt = buildRecommendationPrompt({ validTools, validSkills, validChannels });

  const toolIds = new Set(toolsForPrompt.map((t) => t.name));
  const skillIds = new Set(skillsForPrompt.map((s) => s.name));
  const channelIds = new Set(channelsForPrompt.map((c) => c.platform));

  const validPresets = new Set([
    'research-assistant', 'customer-support', 'creative-writer', 'code-reviewer',
    'data-analyst', 'security-auditor', 'devops-assistant', 'personal-assistant',
  ]);

  const validSecurityTiers = new Set(['dangerous', 'permissive', 'balanced', 'strict', 'paranoid']);

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
          { role: 'user', content: `Agent description:\n${description.trim()}` },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: RECOMMENDATION_JSON_SCHEMA,
        },
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[voice/recommend-config] OpenAI error:', res.status, errBody);
      return NextResponse.json(
        { error: 'Recommendation extraction failed' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'No response from recommendation model' },
        { status: 502 }
      );
    }

    let result: NLRecommendationResponse;
    try {
      result = JSON.parse(content);
    } catch {
      console.error('[voice/recommend-config] Invalid JSON from model:', content);
      return NextResponse.json(
        { error: 'Model returned invalid JSON' },
        { status: 502 }
      );
    }

    // Validate recommendation IDs against catalogs
    if (Array.isArray(result.recommendations)) {
      result.recommendations = result.recommendations.filter((rec) => {
        if (rec.category === 'tool') return toolIds.has(rec.itemId);
        if (rec.category === 'skill') return skillIds.has(rec.itemId);
        if (rec.category === 'channel') return channelIds.has(rec.itemId);
        return false;
      });

      // Assign stable IDs to each recommendation
      result.recommendations = result.recommendations.map((rec, i) => ({
        ...rec,
        id: `${rec.category}-${rec.itemId}-${i}`,
        accepted: true, // Default: all accepted
      }));
    }

    // Validate preset suggestion
    if (result.suggestedPreset && !validPresets.has(result.suggestedPreset)) {
      result.suggestedPreset = null;
      result.suggestedPresetReasoning = null;
    }

    // Validate security tier
    if (result.securityTierSuggestion && !validSecurityTiers.has(result.securityTierSuggestion.tier)) {
      result.securityTierSuggestion = null;
    }

    // Clamp HEXACO values to 0-1
    if (result.personalitySuggestion?.traits) {
      const t = result.personalitySuggestion.traits;
      for (const key of Object.keys(t) as (keyof typeof t)[]) {
        t[key] = Math.max(0, Math.min(1, Number(t[key]) || 0.5));
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[voice/recommend-config] Network error:', err);
    return NextResponse.json(
      { error: 'Failed to reach OpenAI' },
      { status: 502 }
    );
  }
}
