import { NextRequest, NextResponse } from 'next/server';

import { CHANNELS, SKILLS, TOOLS } from '@/data/catalog-data';
import { ALL_PRESETS } from '@/data/agent-presets';

export const runtime = 'nodejs';

type NLRecommendation = {
  id: string;
  category: 'skill' | 'tool' | 'channel';
  itemId: string;
  displayName: string;
  reasoning: string;
  confidence: number;
  accepted: boolean;
};

type NLResponse = {
  recommendations: NLRecommendation[];
  suggestedPreset: string | null;
  personalitySuggestion: { traits: Record<string, number>; reasoning: string } | null;
  securityTierSuggestion: { tier: string; reasoning: string } | null;
  identitySuggestion: { displayName: string | null; bio: string | null; systemPrompt: string | null } | null;
};

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

function addRec(
  map: Map<string, NLRecommendation>,
  rec: Omit<NLRecommendation, 'id' | 'accepted'> & { accepted?: boolean; id?: string },
) {
  const key = `${rec.category}:${rec.itemId}`;
  const existing = map.get(key);
  const next: NLRecommendation = {
    id: rec.id ?? key,
    category: rec.category,
    itemId: rec.itemId,
    displayName: rec.displayName,
    reasoning: rec.reasoning,
    confidence: clamp01(rec.confidence),
    accepted: Boolean(rec.accepted),
  };

  if (!existing) {
    map.set(key, next);
    return;
  }

  // Keep higher-confidence entry; merge reasoning if confidence is tied.
  if (next.confidence > existing.confidence) {
    map.set(key, next);
    return;
  }
  if (Math.abs(next.confidence - existing.confidence) < 1e-6 && next.reasoning && !existing.reasoning.includes(next.reasoning)) {
    map.set(key, { ...existing, reasoning: `${existing.reasoning} ${next.reasoning}`.trim() });
  }
}

function pickPresetId(text: string): string {
  const rules: Array<{ id: string; keywords: string[] }> = [
    { id: 'security-auditor', keywords: ['security', 'audit', 'vulnerability', 'exploit', 'threat', 'pentest', 'compliance'] },
    { id: 'devops-assistant', keywords: ['devops', 'kubernetes', 'docker', 'terraform', 'ci', 'cd', 'deploy', 'infrastructure', 'uptime', 'monitoring'] },
    { id: 'code-reviewer', keywords: ['code review', 'pull request', 'pr ', 'refactor', 'debug', 'bug', 'typescript', 'javascript', 'node', 'python', 'rust', 'repo', 'github'] },
    { id: 'research-assistant', keywords: ['research', 'paper', 'papers', 'academic', 'arxiv', 'literature', 'citation', 'citations', 'journal', 'study', 'thesis'] },
    { id: 'data-analyst', keywords: ['data', 'dataset', 'analytics', 'analysis', 'sql', 'metrics', 'dashboard', 'charts', 'visualization'] },
    { id: 'customer-support', keywords: ['support', 'helpdesk', 'customer', 'ticket', 'tickets', 'troubleshoot', 'faq'] },
    { id: 'personal-assistant', keywords: ['personal assistant', 'calendar', 'schedule', 'reminder', 'reminders', 'tasks', 'email'] },
    { id: 'creative-writer', keywords: ['write', 'writer', 'story', 'blog', 'copywriting', 'script', 'poem', 'creative writing'] },
    { id: 'creative-thinker', keywords: ['brainstorm', 'ideate', 'creative', 'invent', 'innovate'] },
    { id: 'helpful-assistant', keywords: ['assistant', 'helpful', 'friendly'] },
  ];

  for (const r of rules) {
    if (hasAny(text, r.keywords)) return r.id;
  }
  return 'helpful-assistant';
}

function buildPersonalitySuggestion(text: string) {
  const traits: Record<string, number> = {
    honestyHumility: 0.7,
    emotionality: 0.5,
    extraversion: 0.6,
    agreeableness: 0.7,
    conscientiousness: 0.6,
    openness: 0.7,
  };

  const reasons: string[] = [];

  if (hasAny(text, ['empathetic', 'kind', 'patient', 'support', 'counsel', 'therapy'])) {
    traits.agreeableness += 0.2;
    traits.emotionality += 0.15;
    reasons.push('Emphasis on empathy/support → higher Agreeableness & Emotionality.');
  }

  if (hasAny(text, ['security', 'audit', 'strict', 'compliance', 'policy', 'safe'])) {
    traits.honestyHumility += 0.2;
    traits.conscientiousness += 0.2;
    traits.emotionality -= 0.1;
    reasons.push('Security/rigor → higher Honesty-Humility & Conscientiousness, lower Emotionality.');
  }

  if (hasAny(text, ['research', 'analysis', 'analytical', 'papers', 'citations', 'data'])) {
    traits.conscientiousness += 0.15;
    traits.openness += 0.1;
    traits.emotionality -= 0.05;
    reasons.push('Research/analysis → higher Conscientiousness & Openness.');
  }

  if (hasAny(text, ['creative', 'story', 'writer', 'brainstorm', 'poem', 'art'])) {
    traits.openness += 0.25;
    traits.emotionality += 0.05;
    reasons.push('Creativity → higher Openness.');
  }

  if (hasAny(text, ['community', 'social', 'engage', 'outreach', 'sales', 'chatty'])) {
    traits.extraversion += 0.2;
    reasons.push('High interaction → higher Extraversion.');
  }

  // Clamp
  for (const k of Object.keys(traits)) {
    traits[k] = Math.max(0.05, Math.min(0.98, traits[k]));
  }

  return {
    traits,
    reasoning: reasons.length > 0 ? reasons.join(' ') : 'Balanced HEXACO defaults based on a general-purpose assistant.',
  };
}

function buildIdentitySuggestion(text: string, presetId: string) {
  const preset = ALL_PRESETS.find((p) => p.id === presetId) ?? null;
  const displayName = preset?.name ?? 'New Agent';
  const bio = text.length > 0 ? text.slice(0, 180) : null;
  const systemPrompt = text.length > 0
    ? `You are ${displayName}. Your mission: ${text}`
    : `You are ${displayName}.`;

  return { displayName, bio, systemPrompt };
}

function buildRecommendations(text: string, presetId: string): NLRecommendation[] {
  const recs = new Map<string, NLRecommendation>();

  const skillById = new Map(SKILLS.map((s) => [s.name, s]));
  const channelById = new Map(CHANNELS.map((c) => [c.platform, c]));
  const toolById = new Map(TOOLS.map((t) => [t.name, t]));

  const preset = ALL_PRESETS.find((p) => p.id === presetId) ?? null;
  if (preset) {
    for (const id of preset.suggestedSkills) {
      const s = skillById.get(id);
      addRec(recs, {
        category: 'skill',
        itemId: id,
        displayName: s?.displayName ?? id,
        reasoning: `Fits preset "${preset.name}".`,
        confidence: 0.72,
        accepted: false,
      });
    }
    for (const id of preset.suggestedChannels) {
      const c = channelById.get(id);
      addRec(recs, {
        category: 'channel',
        itemId: id,
        displayName: c?.displayName ?? id,
        reasoning: `Fits preset "${preset.name}".`,
        confidence: 0.7,
        accepted: false,
      });
    }
  }

  // Explicit platform mentions → recommend channels.
  for (const ch of CHANNELS) {
    const platform = normalize(ch.platform);
    const name = normalize(ch.displayName);
    if (text.includes(platform) || (name && text.includes(name))) {
      addRec(recs, {
        category: 'channel',
        itemId: ch.platform,
        displayName: ch.displayName,
        reasoning: `You mentioned ${ch.displayName}.`,
        confidence: 0.92,
        accepted: false,
      });
    }
  }

  // A few high-signal skill rules.
  const wantResearch = hasAny(text, ['research', 'paper', 'papers', 'academic', 'arxiv', 'citations', 'literature', 'news', 'sources']);
  const wantCode = hasAny(text, ['code', 'coding', 'refactor', 'debug', 'review', 'typescript', 'javascript', 'python', 'rust', 'repo', 'github']);
  const wantOps = hasAny(text, ['deploy', 'infrastructure', 'uptime', 'monitor', 'health', 'devops', 'kubernetes', 'docker', 'terraform']);
  const wantProductivity = hasAny(text, ['notes', 'notion', 'obsidian', 'trello', 'reminder', 'calendar', 'tasks']);
  const wantVoice = hasAny(text, ['voice', 'call', 'phone']);

  if (wantResearch) {
    if (skillById.get('web-search')) addRec(recs, { category: 'skill', itemId: 'web-search', displayName: skillById.get('web-search')!.displayName, reasoning: 'Matches research/news intent.', confidence: 0.9 });
    if (skillById.get('summarize')) addRec(recs, { category: 'skill', itemId: 'summarize', displayName: skillById.get('summarize')!.displayName, reasoning: 'Useful for turning sources into concise briefs.', confidence: 0.84 });
    if (toolById.get('news-search')) addRec(recs, { category: 'tool', itemId: 'news-search', displayName: toolById.get('news-search')!.displayName, reasoning: 'Directly targets recent news sources.', confidence: 0.76 });
  }

  if (wantCode) {
    if (skillById.get('coding-agent')) addRec(recs, { category: 'skill', itemId: 'coding-agent', displayName: skillById.get('coding-agent')!.displayName, reasoning: 'Matches coding/debugging intent.', confidence: 0.9 });
    if (skillById.get('github')) addRec(recs, { category: 'skill', itemId: 'github', displayName: skillById.get('github')!.displayName, reasoning: 'Matches repo/PR workflows.', confidence: 0.78 });
  }

  if (wantOps) {
    if (skillById.get('healthcheck')) addRec(recs, { category: 'skill', itemId: 'healthcheck', displayName: skillById.get('healthcheck')!.displayName, reasoning: 'Matches monitoring/ops intent.', confidence: 0.76 });
  }

  if (wantProductivity) {
    if (text.includes('notion') && skillById.get('notion')) addRec(recs, { category: 'skill', itemId: 'notion', displayName: skillById.get('notion')!.displayName, reasoning: 'You mentioned Notion.', confidence: 0.82 });
    if (text.includes('obsidian') && skillById.get('obsidian')) addRec(recs, { category: 'skill', itemId: 'obsidian', displayName: skillById.get('obsidian')!.displayName, reasoning: 'You mentioned Obsidian.', confidence: 0.8 });
    if (text.includes('trello') && skillById.get('trello')) addRec(recs, { category: 'skill', itemId: 'trello', displayName: skillById.get('trello')!.displayName, reasoning: 'You mentioned Trello.', confidence: 0.8 });
    if (hasAny(text, ['reminder', 'reminders']) && skillById.get('apple-reminders')) addRec(recs, { category: 'skill', itemId: 'apple-reminders', displayName: skillById.get('apple-reminders')!.displayName, reasoning: 'Matches reminders/task intent.', confidence: 0.74 });
    if (hasAny(text, ['notes']) && skillById.get('apple-notes')) addRec(recs, { category: 'skill', itemId: 'apple-notes', displayName: skillById.get('apple-notes')!.displayName, reasoning: 'Matches note-taking intent.', confidence: 0.72 });
  }

  if (text.includes('weather') && skillById.get('weather')) {
    addRec(recs, { category: 'skill', itemId: 'weather', displayName: skillById.get('weather')!.displayName, reasoning: 'You mentioned weather/forecasting.', confidence: 0.82 });
  }

  if (wantVoice) {
    if (toolById.get('voice-twilio')) addRec(recs, { category: 'tool', itemId: 'voice-twilio', displayName: toolById.get('voice-twilio')!.displayName, reasoning: 'Matches phone/voice call intent.', confidence: 0.74 });
  }

  // Return top recommendations (stable ordering by confidence desc, then id).
  return [...recs.values()]
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
    .slice(0, 12)
    .map((r) => ({ ...r, accepted: false }));
}

export async function POST(req: NextRequest) {
  let description = '';
  try {
    const body = await req.json();
    description = typeof body?.description === 'string' ? body.description : '';
  } catch {
    // ignore
  }

  const raw = description.trim();
  if (raw.length < 10) {
    return NextResponse.json({ error: 'Description must be at least 10 characters.' }, { status: 400 });
  }

  const text = normalize(raw);
  const suggestedPreset = pickPresetId(text);
  const personalitySuggestion = buildPersonalitySuggestion(text);
  const identitySuggestion = buildIdentitySuggestion(raw, suggestedPreset);
  const recommendations = buildRecommendations(text, suggestedPreset);

  const payload: NLResponse = {
    recommendations,
    suggestedPreset,
    personalitySuggestion,
    securityTierSuggestion: null,
    identitySuggestion,
  };

  return NextResponse.json(payload, { status: 200 });
}

