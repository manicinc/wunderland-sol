'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  wunderlandAPI,
  type WunderlandAgentProfile,
} from '@/lib/wunderland-api';
import { useSoftPaywall } from '@/lib/route-guard';
import { useVoiceRecorder } from '@/lib/voice-recorder';
import {
  TOOL_CATALOG,
  SKILLS_CATALOG,
  CHANNEL_CATALOG,
  VOICE_CATALOG,
} from '@/lib/catalog-data';
import { AGENT_PRESETS } from '@/lib/wunderland-presets';
import { PROVIDER_CATALOG } from '@/lib/provider-catalog';
import { useNLRateLimit } from '@/hooks/useNLRateLimit';
import { NLRecommendationPanel, type PersonalitySuggestion, type SecurityTierSuggestion, type IdentitySuggestion } from '@/components/NLRecommendationPanel';
import type { RecommendationItem } from '@/components/RecommendationCard';

const IS_HOSTED_MODE = process.env.NEXT_PUBLIC_WUNDERLAND_HOSTED_MODE === 'true';

const HOSTED_BLOCKED_TOOL_PACKS = new Set<string>(['cli-executor', 'skills']);
const HOSTED_BLOCKED_SKILLS = new Set<string>([
  'github',
  'git',
  '1password',
]);

function isHostedBlockedSkill(entry: { name: string; category: string; requiredTools: string[] }): boolean {
  if (HOSTED_BLOCKED_SKILLS.has(entry.name)) return true;
  if (entry.category === 'developer-tools') return true;
  if (entry.requiredTools.includes('filesystem')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Security Tiers (derived from packages/wunderland/src/security/SecurityTiers.ts)
// ---------------------------------------------------------------------------

type SecurityTierName = 'dangerous' | 'permissive' | 'balanced' | 'strict' | 'paranoid';

const SECURITY_TIER_OPTIONS: {
  name: SecurityTierName;
  label: string;
  description: string;
  riskThreshold: number;
  pipeline: { preLlm: boolean; dualLlm: boolean; signing: boolean };
  permissions: { cli: boolean; fileWrite: boolean; fileRead: boolean; externalApis: boolean };
  color: string;
}[] = [
  {
    name: 'balanced',
    label: 'Balanced (Recommended)',
    description: 'Input screening + output signing. File reads allowed, no writes.',
    riskThreshold: 0.7,
    pipeline: { preLlm: true, dualLlm: false, signing: true },
    permissions: { cli: true, fileWrite: false, fileRead: true, externalApis: true },
    color: '#10ffb0',
  },
  {
    name: 'permissive',
    label: 'Permissive',
    description: 'Lightweight input screening only. Full filesystem + CLI access.',
    riskThreshold: 0.9,
    pipeline: { preLlm: true, dualLlm: false, signing: false },
    permissions: { cli: true, fileWrite: true, fileRead: true, externalApis: true },
    color: '#ffd700',
  },
  {
    name: 'strict',
    label: 'Strict',
    description: 'All layers enabled. External APIs gated behind review.',
    riskThreshold: 0.5,
    pipeline: { preLlm: true, dualLlm: true, signing: true },
    permissions: { cli: false, fileWrite: false, fileRead: true, externalApis: false },
    color: '#00f5ff',
  },
  {
    name: 'paranoid',
    label: 'Paranoid',
    description: 'Maximum security. Every non-trivial action requires human approval.',
    riskThreshold: 0.3,
    pipeline: { preLlm: true, dualLlm: true, signing: true },
    permissions: { cli: false, fileWrite: false, fileRead: true, externalApis: false },
    color: '#ff6b6b',
  },
  {
    name: 'dangerous',
    label: 'Dangerous (Testing Only)',
    description: 'All protections disabled. For testing and benchmarking only.',
    riskThreshold: 1.0,
    pipeline: { preLlm: false, dualLlm: false, signing: false },
    permissions: { cli: true, fileWrite: true, fileRead: true, externalApis: true },
    color: '#ff4444',
  },
];

const TOOL_ACCESS_PROFILES: { id: string; label: string; description: string }[] = [
  { id: 'assistant', label: 'Assistant', description: 'General-purpose helper with balanced capabilities' },
  { id: 'social-citizen', label: 'Social Citizen', description: 'Social posting and community interaction focus' },
  { id: 'social-creative', label: 'Social Creative', description: 'Creative writing and expressive content generation' },
  { id: 'code-reviewer', label: 'Code Reviewer', description: 'Technical code analysis and review focus' },
  { id: 'research-analyst', label: 'Research Analyst', description: 'Deep research, data analysis, and reporting' },
  { id: 'security-auditor', label: 'Security Auditor', description: 'Security scanning and vulnerability assessment' },
];

const STORAGE_POLICIES: { id: string; label: string; description: string; warning?: string }[] = [
  { id: 'encrypted', label: 'Encrypted', description: 'AES-256 encryption at rest (recommended)' },
  { id: 'sealed', label: 'Sealed', description: 'Immutable after creation — core identity cannot be changed', warning: 'This cannot be reversed. Core fields become read-only.' },
  { id: 'public', label: 'Public', description: 'Open and auditable — all data is publicly accessible' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedConfig {
  seedId?: string | null;
  displayName?: string | null;
  bio?: string | null;
  systemPrompt?: string | null;
  personality?: {
    honesty: number;
    emotionality: number;
    extraversion: number;
    agreeableness: number;
    conscientiousness: number;
    openness: number;
  } | null;
  preset?: string | null;
  capabilities?: string[] | null;
  skills?: string[] | null;
  channels?: string[] | null;
  executionMode?: 'autonomous' | 'human-all' | 'human-dangerous' | null;
  toolAccessProfile?: string | null;
  voiceConfig?: { provider?: string; voiceId?: string } | null;
  securityTier?: SecurityTierName | null;
  storagePolicy?: 'sealed' | 'encrypted' | 'public' | null;
  llmProvider?: string | null;
  llmModel?: string | null;
  confidence?: Record<string, number>;
}

type Step = 'input' | 'preview' | 'done';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vcaAuthToken');
}

async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob);
  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Transcription failed');
  }
  const data = await res.json();
  return data.text;
}

async function extractConfig(
  text: string,
  existingConfig?: Record<string, unknown>,
  hostingMode?: 'managed' | 'self_hosted'
): Promise<ExtractedConfig> {
  const res = await fetch('/api/voice/extract-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ text, existingConfig, hostingMode }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Config extraction failed');
  }
  return res.json();
}

function confidenceColor(score: number): string {
  if (score >= 0.8) return '#10ffb0';
  if (score >= 0.5) return '#ffd700';
  return '#ff6b6b';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TRAIT_LABELS: Record<string, string> = {
  honesty: 'Honesty',
  emotionality: 'Emotionality',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  conscientiousness: 'Conscientiousness',
  openness: 'Openness',
};

const MODE_LABELS: Record<string, { label: string; description: string }> = {
  autonomous: {
    label: 'Autonomous',
    description: 'Agent acts freely within safety bounds',
  },
  'human-all': {
    label: 'Human Approves All',
    description: 'Every action requires your approval',
  },
  'human-dangerous': {
    label: 'Human Approves Dangerous',
    description: 'Only high-risk actions need approval (recommended)',
  },
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function AgentBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="empty-state">
          <div className="empty-state__title">Loading builder...</div>
        </div>
      }
    >
      <AgentBuilderContent />
    </Suspense>
  );
}

function AgentBuilderContent() {
  const { ready } = useSoftPaywall();
  const searchParams = useSearchParams();
  const editSeedId = searchParams.get('agent');

  // State
  const [step, setStep] = useState<Step>('input');
  const [transcript, setTranscript] = useState('');
  const [hostingMode, setHostingMode] = useState<'managed' | 'self_hosted'>(
    IS_HOSTED_MODE ? 'self_hosted' : 'managed'
  );
  const [config, setConfig] = useState<ExtractedConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [existingAgent, setExistingAgent] = useState<WunderlandAgentProfile | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // NL Recommendation state
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [personalitySuggestion, setPersonalitySuggestion] = useState<PersonalitySuggestion | null>(null);
  const [securityTierSuggestion, setSecurityTierSuggestion] = useState<SecurityTierSuggestion | null>(null);
  const [identitySuggestion, setIdentitySuggestion] = useState<IdentitySuggestion | null>(null);
  const [suggestedPreset, setSuggestedPreset] = useState<string | null>(null);
  const [suggestedPresetReasoning, setSuggestedPresetReasoning] = useState<string | null>(null);
  const [personalityAccepted, setPersonalityAccepted] = useState(true);
  const [securityAccepted, setSecurityAccepted] = useState(true);
  const [identityAccepted, setIdentityAccepted] = useState(true);
  const [isRecommending, setIsRecommending] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const rateLimit = useNLRateLimit();
  const recommendDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recorder = useVoiceRecorder();

  const enforceHostedRestrictions = IS_HOSTED_MODE && hostingMode !== 'self_hosted';

  const selectedCapabilities = config?.capabilities ?? [];
  const selectedSkills = config?.skills ?? [];

  const toolItems = (enforceHostedRestrictions
    ? TOOL_CATALOG.filter(
        (t) => !HOSTED_BLOCKED_TOOL_PACKS.has(t.name) || selectedCapabilities.includes(t.name)
      )
    : TOOL_CATALOG
  ).map((t) => ({
    id: t.name,
    label:
      t.displayName +
      (enforceHostedRestrictions && HOSTED_BLOCKED_TOOL_PACKS.has(t.name) ? ' (Self-hosted)' : ''),
  }));

  const disabledToolIds = enforceHostedRestrictions
    ? new Set(
        TOOL_CATALOG.filter(
          (t) => HOSTED_BLOCKED_TOOL_PACKS.has(t.name) && !selectedCapabilities.includes(t.name)
        ).map((t) => t.name)
      )
    : undefined;

  const skillItems = (enforceHostedRestrictions
    ? SKILLS_CATALOG.filter((s) => !isHostedBlockedSkill(s) || selectedSkills.includes(s.name))
    : SKILLS_CATALOG
  ).map((s) => ({
    id: s.name,
    label:
      s.displayName +
      (enforceHostedRestrictions && isHostedBlockedSkill(s) ? ' (Self-hosted)' : ''),
  }));

  const disabledSkillIds = enforceHostedRestrictions
    ? new Set(
        SKILLS_CATALOG.filter((s) => isHostedBlockedSkill(s) && !selectedSkills.includes(s.name)).map(
          (s) => s.name
        )
      )
    : undefined;

  // Load existing agent if editing
  useEffect(() => {
    if (!ready || !editSeedId) return;
    let cancelled = false;
    (async () => {
      try {
        const { agent } = await wunderlandAPI.agentRegistry.get(editSeedId);
        if (!cancelled) setExistingAgent(agent);
        try {
          const { runtime } = await wunderlandAPI.runtime.get(editSeedId);
          if (!cancelled) setHostingMode(runtime.hostingMode);
        } catch {
          // Runtime not available; leave default.
        }
      } catch {
        if (!cancelled) setError(`Could not load agent "${editSeedId}"`);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, editSeedId]);

  // Auto-transcribe when recording stops
  useEffect(() => {
    if (!recorder.audioBlob || recorder.isRecording) return;
    let cancelled = false;
    (async () => {
      setIsTranscribing(true);
      setError('');
      try {
        const text = await transcribeAudio(recorder.audioBlob!);
        if (!cancelled) {
          setTranscript((prev) => (prev ? `${prev}\n\n${text}` : text));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Transcription failed');
      } finally {
        if (!cancelled) setIsTranscribing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recorder.audioBlob, recorder.isRecording]);

  // Extract config from transcript
  const handleExtract = useCallback(async () => {
    if (!transcript.trim()) return;
    setIsExtracting(true);
    setError('');
    try {
      const existing = existingAgent
        ? {
            seedId: existingAgent.seedId,
            displayName: existingAgent.displayName,
            bio: existingAgent.bio,
            systemPrompt: existingAgent.systemPrompt,
            personality: existingAgent.personality,
            capabilities: existingAgent.capabilities,
          }
        : undefined;
      const result = await extractConfig(transcript, existing, hostingMode);
      setConfig(result);
      // Set preset if AI extracted one
      if (result.preset) {
        setSelectedPreset(result.preset);
      }
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  }, [transcript, existingAgent, hostingMode]);

  // Create or update agent
  const handleSave = useCallback(async () => {
    if (!config) return;
    setIsSaving(true);
    setError('');
    try {
      if (existingAgent) {
        // Update existing agent — send only changed fields
        const updatePayload: Record<string, unknown> = {};
        if (config.displayName) updatePayload.displayName = config.displayName;
        if (config.bio) updatePayload.bio = config.bio;
        if (config.systemPrompt) updatePayload.systemPrompt = config.systemPrompt;
        if (config.personality) updatePayload.personality = config.personality;
        if (config.capabilities) updatePayload.capabilities = config.capabilities;
        if (config.skills) updatePayload.skills = config.skills;
        if (config.channels) updatePayload.channels = config.channels;
        if (config.executionMode) updatePayload.executionMode = config.executionMode;
        if (config.toolAccessProfile) updatePayload.toolAccessProfile = config.toolAccessProfile;
        if (config.voiceConfig) updatePayload.voiceConfig = config.voiceConfig;
        if (config.securityTier) updatePayload.securityTier = config.securityTier;
        if (config.llmProvider) updatePayload.llmProvider = config.llmProvider;
        if (config.llmModel) updatePayload.llmModel = config.llmModel;
        await wunderlandAPI.agentRegistry.update(existingAgent.seedId, updatePayload);
        setSuccessMessage(`Agent "${existingAgent.displayName}" updated successfully!`);
      } else {
        // Create new agent — all required fields
        const seedId = config.seedId || `agent-${Date.now()}`;
        const preset = config.preset ? AGENT_PRESETS.find((p) => p.id === config.preset) : null;
        const toolAccessProfile =
          typeof config.toolAccessProfile === 'string' && config.toolAccessProfile.trim()
            ? config.toolAccessProfile.trim()
            : (preset?.toolAccessProfile ?? 'assistant');
        const registerPayload = {
          seedId,
          displayName: config.displayName || 'Unnamed Agent',
          bio: config.bio || '',
          systemPrompt: config.systemPrompt || 'You are a helpful AI assistant.',
          personality: config.personality || {
            honesty: 0.7,
            emotionality: 0.5,
            extraversion: 0.6,
            agreeableness: 0.7,
            conscientiousness: 0.7,
            openness: 0.7,
          },
          security: (() => {
            const tier = SECURITY_TIER_OPTIONS.find((t) => t.name === (config.securityTier || 'balanced'));
            return {
              preLlmClassifier: tier?.pipeline.preLlm ?? true,
              dualLlmAuditor: tier?.pipeline.dualLlm ?? false,
              outputSigning: tier?.pipeline.signing ?? true,
              storagePolicy: config.storagePolicy || 'encrypted',
              securityTier: config.securityTier || 'balanced',
            };
          })(),
          capabilities: config.capabilities || ['web-search', 'giphy', 'image-search'],
          skills: config.skills || [],
          channels: config.channels || [],
          toolAccessProfile,
          hostingMode,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(config.llmProvider ? { llmProvider: config.llmProvider } : {}),
          ...(config.llmModel ? { llmModel: config.llmModel } : {}),
        };
        await wunderlandAPI.agentRegistry.register(registerPayload);
        setSuccessMessage(`Agent "${config.displayName}" created successfully!`);
      }
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [config, existingAgent, hostingMode]);

  // Config field updaters
  const updateField = useCallback(
    (field: string, value: unknown) => {
      setConfig((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  const updateTrait = useCallback(
    (trait: string, value: number) => {
      setConfig((prev) => {
        if (!prev?.personality) return prev;
        return {
          ...prev,
          personality: { ...prev.personality, [trait]: value },
        };
      });
    },
    []
  );

  const toggleArrayItem = useCallback(
    (field: 'capabilities' | 'skills' | 'channels', item: string) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const arr = (prev[field] as string[] | null) ?? [];
        const next = arr.includes(item)
          ? arr.filter((x) => x !== item)
          : [...arr, item];
        return { ...prev, [field]: next };
      });
    },
    []
  );

  // Apply preset defaults to config
  const applyPresetDefaults = useCallback((presetId: string) => {
    const preset = AGENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setConfig((prev) => ({
      ...prev,
      preset: presetId,
      displayName: preset.name,
      bio: preset.description,
      personality: preset.personality,
      capabilities: preset.capabilities.slice(),
      skills: preset.skills.slice(),
      channels: preset.channels.slice(),
      executionMode: 'human-dangerous',
      toolAccessProfile: preset.toolAccessProfile ?? null,
    }));
    setSelectedPreset(presetId);
  }, []);

  // ---------------------------------------------------------------------------
  // NL Recommendation handlers
  // ---------------------------------------------------------------------------

  const handleGetRecommendations = useCallback(async () => {
    if (!transcript.trim() || transcript.trim().length < 10) return;
    if (!rateLimit.tryRequest()) return;

    // Debounce 500ms
    if (recommendDebounceRef.current) clearTimeout(recommendDebounceRef.current);
    await new Promise<void>((resolve) => {
      recommendDebounceRef.current = setTimeout(resolve, 500);
    });

    setIsRecommending(true);
    setError('');
    try {
      const res = await fetch('/api/voice/recommend-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ description: transcript.trim(), hostingMode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Recommendation failed');
      }
      const data = await res.json();
      setRecommendations(data.recommendations ?? []);
      setPersonalitySuggestion(data.personalitySuggestion ?? null);
      setSecurityTierSuggestion(data.securityTierSuggestion ?? null);
      setIdentitySuggestion(data.identitySuggestion ?? null);
      setSuggestedPreset(data.suggestedPreset ?? null);
      setSuggestedPresetReasoning(data.suggestedPresetReasoning ?? null);
      setPersonalityAccepted(true);
      setSecurityAccepted(true);
      setIdentityAccepted(true);
      setShowRecommendations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recommendation failed');
    } finally {
      setIsRecommending(false);
    }
  }, [transcript, hostingMode, rateLimit]);

  const handleToggleRecommendation = useCallback((id: string) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, accepted: !r.accepted } : r))
    );
  }, []);

  const handleApplyAllRecommendations = useCallback(() => {
    setRecommendations((prev) => prev.map((r) => ({ ...r, accepted: true })));
    setPersonalityAccepted(true);
    setSecurityAccepted(true);
    setIdentityAccepted(true);
  }, []);

  const handleClearAllRecommendations = useCallback(() => {
    setRecommendations((prev) => prev.map((r) => ({ ...r, accepted: false })));
    setPersonalityAccepted(false);
    setSecurityAccepted(false);
    setIdentityAccepted(false);
  }, []);

  /** Merge accepted recommendations into config and proceed to preview. */
  const handleApplyAndProceed = useCallback(() => {
    const accepted = recommendations.filter((r) => r.accepted);
    const tools = accepted.filter((r) => r.category === 'tool').map((r) => r.itemId);
    const skills = accepted.filter((r) => r.category === 'skill').map((r) => r.itemId);
    const channels = accepted.filter((r) => r.category === 'channel').map((r) => r.itemId);

    // Ensure required tools
    for (const req of ['web-search', 'giphy', 'image-search']) {
      if (!tools.includes(req)) tools.push(req);
    }

    const personality = personalityAccepted && personalitySuggestion
      ? personalitySuggestion.traits
      : undefined;

    const identity = identityAccepted && identitySuggestion
      ? identitySuggestion
      : undefined;

    setConfig((prev) => ({
      ...prev,
      capabilities: tools.length > 0 ? tools : prev?.capabilities ?? [],
      skills: skills.length > 0 ? skills : prev?.skills ?? [],
      channels: channels.length > 0 ? channels : prev?.channels ?? [],
      ...(personality ? { personality } : {}),
      ...(identity?.displayName ? { displayName: identity.displayName } : {}),
      ...(identity?.bio ? { bio: identity.bio } : {}),
      ...(identity?.systemPrompt ? { systemPrompt: identity.systemPrompt } : {}),
    }));
    setStep('preview');
  }, [recommendations, personalityAccepted, personalitySuggestion, identityAccepted, identitySuggestion]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
        <p className="empty-state__description">Verifying your subscription status.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div className="wunderland-header">
        <div className="wunderland-header__row">
          <div>
            <h2 className="wunderland-header__title">
              {existingAgent ? `Modify: ${existingAgent.displayName}` : 'AI Agent Builder'}
            </h2>
            <p className="wunderland-header__subtitle">
              {existingAgent
                ? 'Describe changes by voice or text'
                : 'Describe your ideal agent by voice or text'}
            </p>
          </div>
          {existingAgent && (
            <Link
              href={`/app/dashboard/${existingAgent.seedId}`}
              className="btn btn--holographic"
              style={{ textDecoration: 'none', fontSize: '0.8125rem' }}
            >
              Back to Agent
            </Link>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 8,
            background: 'rgba(255,107,107,0.1)',
            border: '1px solid rgba(255,107,107,0.3)',
            color: '#ff6b6b',
            fontSize: '0.8125rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Step: Input */}
      {step === 'input' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hosting Mode */}
          <ConfigCard title="Hosting Mode">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {(['managed', 'self_hosted'] as const).map((mode) => {
                const selected = hostingMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setHostingMode(mode)}
                    disabled={!!existingAgent}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${
                        selected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'
                      }`,
                      background: selected ? 'rgba(0,245,255,0.1)' : 'transparent',
                      color: selected ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
                      fontSize: '0.75rem',
                      cursor: existingAgent ? 'not-allowed' : 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      opacity: existingAgent ? 0.6 : 1,
                    }}
                  >
                    {mode === 'managed' ? 'Managed Runtime' : 'Self-hosted VPS'}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim, #8a8aa0)', margin: 0 }}>
              {existingAgent
                ? 'Hosting mode is controlled on the agent dashboard.'
                : hostingMode === 'self_hosted'
                  ? 'Self-hosted agents can use filesystem/CLI skills, but run on your own VPS (not on the shared runtime).'
                  : 'Managed agents run on Wunderland with a restricted toolset in hosted mode.'}
            </p>
          </ConfigCard>

          {/* Voice Recording */}
          <div
            className="post-card"
            style={{
              padding: 24,
              borderRadius: 12,
              border: '1px solid rgba(201,162,39,0.12)',
              background: 'var(--card-bg, rgba(26,26,46,0.4))',
            }}
          >
            <div style={{ marginBottom: 12, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text, #fff)' }}>
              Voice Input
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <button
                onClick={recorder.isRecording ? recorder.stopRecording : recorder.startRecording}
                disabled={isTranscribing}
                className={`btn ${recorder.isRecording ? 'btn--primary' : 'btn--holographic'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 140,
                }}
              >
                {recorder.isRecording ? (
                  <>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#ff6b6b',
                        animation: 'pulse 1s infinite',
                      }}
                    />
                    Stop ({formatDuration(recorder.duration)})
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    Record
                  </>
                )}
              </button>
              {isTranscribing && (
                <span style={{ fontSize: '0.75rem', color: '#00f5ff' }}>
                  Transcribing...
                </span>
              )}
              {recorder.error && (
                <span style={{ fontSize: '0.75rem', color: '#ff6b6b' }}>
                  {recorder.error}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim, #8a8aa0)', margin: 0 }}>
              Describe the agent you want: its name, purpose, personality, which platforms it should work on,
              and what tools it needs. Recording auto-stops after a short silence (VAD-style), or at 2 minutes.
            </p>
          </div>

          {/* Text Input */}
          <div
            className="post-card"
            style={{
              padding: 24,
              borderRadius: 12,
              border: '1px solid rgba(201,162,39,0.12)',
              background: 'var(--card-bg, rgba(26,26,46,0.4))',
            }}
          >
            <div style={{ marginBottom: 12, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text, #fff)' }}>
              {existingAgent ? 'Describe Changes' : 'Agent Description'}
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={
                existingAgent
                  ? 'Describe what you want to change... e.g., "Add web search capability and make it more friendly"'
                  : 'Describe your agent... e.g., "I want a friendly customer support bot named SupportBot that works on Telegram and Discord, can search the web, and helps answer product questions"'
              }
              rows={6}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(201,162,39,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--color-text, #fff)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                onClick={handleGetRecommendations}
                disabled={!transcript.trim() || transcript.trim().length < 10 || isRecommending || !rateLimit.canRequest}
                className="btn btn--holographic"
                style={{ fontSize: '0.8125rem' }}
                title={
                  rateLimit.cooldownMs > 0
                    ? `Rate limited (${Math.ceil(rateLimit.cooldownMs / 1000)}s)`
                    : `${rateLimit.remaining} suggestions remaining`
                }
              >
                {isRecommending
                  ? 'Analyzing...'
                  : rateLimit.cooldownMs > 0
                    ? `Rate limited (${Math.ceil(rateLimit.cooldownMs / 1000)}s)`
                    : `Suggest Config (${rateLimit.remaining})`}
              </button>
              <button
                onClick={handleExtract}
                disabled={!transcript.trim() || isExtracting}
                className="btn btn--primary"
              >
                {isExtracting ? 'Extracting...' : 'Extract Config'}
              </button>
            </div>
          </div>

          {/* NL Recommendations Panel */}
          {showRecommendations && recommendations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <NLRecommendationPanel
                recommendations={recommendations}
                suggestedPreset={suggestedPreset}
                suggestedPresetReasoning={suggestedPresetReasoning}
                personalitySuggestion={personalitySuggestion}
                securityTierSuggestion={securityTierSuggestion}
                identitySuggestion={identitySuggestion}
                onToggleRecommendation={handleToggleRecommendation}
                onApplyAll={handleApplyAllRecommendations}
                onClearAll={handleClearAllRecommendations}
                onApplyPersonality={() => setPersonalityAccepted((p) => !p)}
                onApplySecurity={() => setSecurityAccepted((p) => !p)}
                onApplyIdentity={() => setIdentityAccepted((p) => !p)}
                onApplyPreset={applyPresetDefaults}
                personalityAccepted={personalityAccepted}
                securityAccepted={securityAccepted}
                identityAccepted={identityAccepted}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleApplyAndProceed}
                  className="btn btn--primary"
                >
                  Apply Selected &amp; Configure
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Back to Input */}
	          <button
	            onClick={() => setStep('input')}
	            className="btn btn--holographic"
	            style={{ alignSelf: 'flex-start', fontSize: '0.8125rem' }}
	          >
	            &larr; Back to Description
	          </button>

          {/* Preset Selector */}
          <ConfigCard title="Agent Preset">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {AGENT_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id || config.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPresetDefaults(preset.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'}`,
                      background: isSelected ? 'rgba(0,245,255,0.1)' : 'transparent',
                      color: isSelected ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{preset.name}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.7, marginTop: 2 }}>{preset.description}</div>
                  </button>
                );
              })}
            </div>
            {(selectedPreset || config.preset) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(201,162,39,0.1)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #b0b0c0)' }}>
                  Using preset: <strong>{AGENT_PRESETS.find(p => p.id === (selectedPreset || config.preset))?.name}</strong>
                </span>
                <button
                  onClick={() => {
                    if (selectedPreset || config.preset) {
                      applyPresetDefaults((selectedPreset || config.preset)!);
                    }
                  }}
                  className="btn btn--holographic"
                  style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                >
                  Reset to Preset Defaults
                </button>
              </div>
            )}
            {!selectedPreset && !config.preset && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim, #8a8aa0)', margin: 0 }}>
                Select a preset to auto-populate configuration with recommended settings, or customize manually below.
              </p>
            )}
          </ConfigCard>

          {/* Hosting Mode */}
          <ConfigCard title="Hosting Mode">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {(['managed', 'self_hosted'] as const).map((mode) => {
                const selected = hostingMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setHostingMode(mode)}
                    disabled={!!existingAgent}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${
                        selected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'
                      }`,
                      background: selected ? 'rgba(0,245,255,0.1)' : 'transparent',
                      color: selected ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
                      fontSize: '0.75rem',
                      cursor: existingAgent ? 'not-allowed' : 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      opacity: existingAgent ? 0.6 : 1,
                    }}
                  >
                    {mode === 'managed' ? 'Managed Runtime' : 'Self-hosted VPS'}
                  </button>
                );
              })}
            </div>
            {enforceHostedRestrictions && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim, #8a8aa0)', margin: 0 }}>
                Some tools/skills are disabled in hosted managed mode. Switch to self-hosted to enable them.
              </p>
            )}
            {!enforceHostedRestrictions && hostingMode === 'self_hosted' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim, #8a8aa0)', margin: 0 }}>
                Self-hosted: this configuration is for deployment to your VPS. It will not execute on the shared runtime.
              </p>
            )}
          </ConfigCard>

	          {/* Identity */}
	          <ConfigCard title="Identity" confidence={config.confidence}>
	            <ConfigField
	              label="Seed ID"
              value={config.seedId || ''}
              onChange={(v) => updateField('seedId', v)}
              confidence={config.confidence?.seedId}
              disabled={!!existingAgent}
            />
            <ConfigField
              label="Display Name"
              value={config.displayName || ''}
              onChange={(v) => updateField('displayName', v)}
              confidence={config.confidence?.displayName}
            />
            <ConfigField
              label="Bio"
              value={config.bio || ''}
              onChange={(v) => updateField('bio', v)}
              confidence={config.confidence?.bio}
              multiline
            />
          </ConfigCard>

          {/* System Prompt */}
          <ConfigCard title="System Prompt" confidence={config.confidence}>
            <ConfigField
              label="System Prompt"
              value={config.systemPrompt || ''}
              onChange={(v) => updateField('systemPrompt', v)}
              confidence={config.confidence?.systemPrompt}
              multiline
              rows={5}
            />
          </ConfigCard>

          {/* Personality */}
          {config.personality && (
            <ConfigCard title="Personality (HEXACO)" confidence={config.confidence}>
              {Object.entries(config.personality).map(([trait, value]) => (
                <div key={trait} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted, #b0b0c0)',
                      marginBottom: 4,
                    }}
                  >
                    <span>{TRAIT_LABELS[trait] || trait}</span>
                    <span>{(value as number).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={value as number}
                    onChange={(e) => updateTrait(trait, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#00f5ff' }}
                  />
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Tools */}
          <ConfigCard title="Tools" confidence={config.confidence}>
            <TagSelector
              items={toolItems}
              selected={selectedCapabilities}
              onToggle={(id) => toggleArrayItem('capabilities', id)}
              required={new Set(['web-search', 'giphy', 'image-search'])}
              disabled={disabledToolIds}
            />
          </ConfigCard>

          {/* Skills */}
          <ConfigCard title="Skills" confidence={config.confidence}>
            <TagSelector
              items={skillItems}
              selected={selectedSkills}
              onToggle={(id) => toggleArrayItem('skills', id)}
              disabled={disabledSkillIds}
            />
          </ConfigCard>

          {/* Channels */}
          <ConfigCard title="Channels" confidence={config.confidence}>
            <TagSelector
              items={CHANNEL_CATALOG.map((c) => ({ id: c.platform, label: c.displayName }))}
              selected={config.channels ?? []}
              onToggle={(id) => toggleArrayItem('channels', id)}
            />
          </ConfigCard>

          {/* Voice */}
          <ConfigCard title="Voice" confidence={config.confidence}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #b0b0c0)', marginBottom: 6 }}>
                Provider
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['openai', 'elevenlabs'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      const defaultVoice = VOICE_CATALOG.find((v) => v.provider === p && v.isDefault);
                      updateField('voiceConfig', {
                        provider: p,
                        voiceId: defaultVoice?.voiceId || (p === 'openai' ? 'nova' : '21m00Tcm4TlvDq8ikWAM'),
                      });
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: `1px solid ${config.voiceConfig?.provider === p ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'}`,
                      background: config.voiceConfig?.provider === p ? 'rgba(0,245,255,0.1)' : 'transparent',
                      color: config.voiceConfig?.provider === p ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {p === 'openai' ? 'OpenAI' : 'ElevenLabs'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VOICE_CATALOG.filter((v) => v.provider === (config.voiceConfig?.provider || 'openai')).map((voice) => {
                const isSelected = config.voiceConfig?.voiceId === voice.voiceId;
                return (
                  <button
                    key={voice.id}
                    onClick={() => updateField('voiceConfig', { provider: voice.provider, voiceId: voice.voiceId })}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'}`,
                      background: isSelected ? 'rgba(0,245,255,0.1)' : 'transparent',
                      color: isSelected ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{voice.name}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.7 }}>{voice.gender} &middot; {voice.description}</div>
                  </button>
                );
              })}
            </div>
          </ConfigCard>

          {/* LLM Provider & Model */}
          <ConfigCard title="LLM Provider" confidence={config.confidence}>
            {(() => {
              const categories: { key: string; label: string }[] = [
                { key: 'major', label: 'Major' },
                { key: 'cloud', label: 'Cloud' },
                { key: 'aggregator', label: 'Aggregator' },
                { key: 'platform', label: 'Platform' },
                { key: 'asian', label: 'Asian' },
              ];
              const selectedProvider = PROVIDER_CATALOG.find((p) => p.id === config.llmProvider);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {categories.map((cat) => {
                    const providers = PROVIDER_CATALOG.filter((p) => p.category === cat.key);
                    if (providers.length === 0) return null;
                    return (
                      <div key={cat.key}>
                        <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-dim, #8a8aa0)', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {cat.label}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {providers.map((p) => {
                            const isSelected = config.llmProvider === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  updateField('llmProvider', p.id);
                                  updateField('llmModel', p.defaultModel);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  border: `1px solid ${isSelected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'}`,
                                  background: isSelected ? 'rgba(0,245,255,0.1)' : 'transparent',
                                  color: isSelected ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
                                  fontSize: '0.6875rem',
                                  cursor: 'pointer',
                                  fontFamily: "'IBM Plex Mono', monospace",
                                }}
                                title={p.description}
                              >
                                {p.displayName}
                                {!p.requiresKey && (
                                  <span style={{ marginLeft: 4, fontSize: '0.5625rem', color: '#10ffb0' }}>local</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {selectedProvider && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim, #8a8aa0)', fontFamily: "'IBM Plex Mono', monospace" }}>
                        Model
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[selectedProvider.defaultModel, selectedProvider.smallModel].filter((m, i, a) => a.indexOf(m) === i).map((model) => {
                          const isSelected = config.llmModel === model;
                          return (
                            <button
                              key={model}
                              onClick={() => updateField('llmModel', model)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: `1px solid ${isSelected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.12)'}`,
                                background: isSelected ? 'rgba(0,245,255,0.08)' : 'transparent',
                                color: isSelected ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
                                fontSize: '0.6875rem',
                                cursor: 'pointer',
                                fontFamily: "'IBM Plex Mono', monospace",
                              }}
                            >
                              {model}
                              {model === selectedProvider.smallModel && model !== selectedProvider.defaultModel && (
                                <span style={{ marginLeft: 4, fontSize: '0.5625rem', opacity: 0.6 }}>fast</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {selectedProvider.requiresKey && (
                        <div style={{ fontSize: '0.5625rem', color: '#ffd700', fontFamily: "'IBM Plex Mono', monospace", opacity: 0.8 }}>
                          Requires API key (BYO)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </ConfigCard>

          {/* Security Tier */}
          <ConfigCard title="Security Tier" confidence={config.confidence}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SECURITY_TIER_OPTIONS.map((tier) => {
                const isSelected = (config.securityTier || 'balanced') === tier.name;
                return (
                  <label
                    key={tier.name}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? `${tier.color}66` : 'rgba(201,162,39,0.12)'}`,
                      background: isSelected ? `${tier.color}0f` : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="securityTier"
                      value={tier.name}
                      checked={isSelected}
                      onChange={() => updateField('securityTier', tier.name)}
                      style={{ marginTop: 2, accentColor: tier.color }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? tier.color : 'var(--color-text, #fff)' }}>
                          {tier.label}
                        </span>
                        <span style={{
                          fontSize: '0.5625rem',
                          padding: '1px 6px',
                          borderRadius: 4,
                          border: `1px solid ${tier.color}33`,
                          color: tier.color,
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          {tier.riskThreshold}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim, #8a8aa0)', marginTop: 2 }}>
                        {tier.description}
                      </div>
                      {isSelected && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 8 }}>
                          {Object.entries(tier.permissions).map(([perm, allowed]) => (
                            <div
                              key={perm}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.5625rem',
                                fontFamily: "'IBM Plex Mono', monospace",
                                color: allowed ? '#10ffb0' : '#ff6b6b',
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: allowed ? '#10ffb0' : '#ff6b6b', flexShrink: 0 }} />
                              {perm.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </ConfigCard>

          {/* Tool Access Profile */}
          <ConfigCard title="Tool Access Profile" confidence={config.confidence}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TOOL_ACCESS_PROFILES.map((profile) => {
                const isSelected = (config.toolAccessProfile || 'assistant') === profile.id;
                return (
                  <button
                    key={profile.id}
                    onClick={() => updateField('toolAccessProfile', profile.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'}`,
                      background: isSelected ? 'rgba(0,245,255,0.1)' : 'transparent',
                      color: isSelected ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{profile.label}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.7, marginTop: 2 }}>{profile.description}</div>
                  </button>
                );
              })}
            </div>
          </ConfigCard>

          {/* Storage Policy */}
          <ConfigCard title="Storage Policy" confidence={config.confidence}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STORAGE_POLICIES.map((policy) => {
                const isSelected = (config.storagePolicy || 'encrypted') === policy.id;
                return (
                  <label
                    key={policy.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? 'rgba(0,245,255,0.4)' : 'rgba(201,162,39,0.12)'}`,
                      background: isSelected ? 'rgba(0,245,255,0.06)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="storagePolicy"
                      value={policy.id}
                      checked={isSelected}
                      onChange={() => updateField('storagePolicy', policy.id)}
                      style={{ marginTop: 2, accentColor: '#00f5ff' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text, #fff)' }}>
                        {policy.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim, #8a8aa0)' }}>
                        {policy.description}
                      </div>
                      {policy.warning && isSelected && (
                        <div style={{ fontSize: '0.625rem', color: '#ff6b6b', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {policy.warning}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </ConfigCard>

          {/* Execution Mode */}
          <ConfigCard title="Execution Mode" confidence={config.confidence}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(MODE_LABELS).map(([mode, { label, description }]) => (
                <label
                  key={mode}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${config.executionMode === mode ? 'rgba(0,245,255,0.4)' : 'rgba(201,162,39,0.12)'}`,
                    background:
                      config.executionMode === mode
                        ? 'rgba(0,245,255,0.06)'
                        : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="executionMode"
                    value={mode}
                    checked={config.executionMode === mode}
                    onChange={() => updateField('executionMode', mode)}
                    style={{ marginTop: 2, accentColor: '#00f5ff' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text, #fff)' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim, #8a8aa0)' }}>
                      {description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </ConfigCard>

          {/* Save Action */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 32 }}>
            <button
              onClick={handleSave}
              disabled={isSaving || !config.displayName}
              className="btn btn--primary"
              style={{ minWidth: 160 }}
            >
              {isSaving
                ? 'Saving...'
                : existingAgent
                  ? 'Update Agent'
                  : 'Create Agent'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="empty-state" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10ffb0, #10ffb044)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '1.5rem',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#030305" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="empty-state__title">{successMessage}</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <Link href="/app/dashboard" className="btn btn--primary" style={{ textDecoration: 'none' }}>
              Go to Dashboard
            </Link>
            <button
              onClick={() => {
                setStep('input');
                setConfig(null);
                setTranscript('');
                setSuccessMessage('');
                setExistingAgent(null);
                recorder.reset();
              }}
              className="btn btn--holographic"
            >
              Build Another
            </button>
          </div>
        </div>
      )}

      {/* Pulse animation for recording indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfigCard({
  title,
  confidence,
  children,
}: {
  title: string;
  confidence?: Record<string, number>;
  children: React.ReactNode;
}) {
  const fieldKey = title.toLowerCase().replace(/[^a-z]/g, '');
  const score = confidence?.[fieldKey];

  return (
    <div
      className="post-card"
      style={{
        padding: 20,
        borderRadius: 12,
        border: '1px solid rgba(201,162,39,0.12)',
        background: 'var(--card-bg, rgba(26,26,46,0.4))',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text, #fff)' }}>
          {title}
        </span>
        {score != null && (
          <span
            style={{
              fontSize: '0.6875rem',
              color: confidenceColor(score),
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {Math.round(score * 100)}% confidence
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ConfigField({
  label,
  value,
  onChange,
  confidence,
  multiline,
  rows,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  confidence?: number;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid rgba(201,162,39,0.2)',
    background: disabled ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.3)',
    color: disabled ? 'var(--color-text-dim, #8a8aa0)' : 'var(--color-text, #fff)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.8125rem',
    lineHeight: 1.6,
    resize: multiline ? 'vertical' : 'none',
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <label
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted, #b0b0c0)',
          }}
        >
          {label}
        </label>
        {confidence != null && (
          <span
            style={{
              fontSize: '0.6875rem',
              color: confidenceColor(confidence),
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 3}
          disabled={disabled}
          style={inputStyle}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function TagSelector({
  items,
  selected,
  onToggle,
  required,
  disabled,
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  required?: Set<string>;
  disabled?: Set<string>;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item) => {
        const isSelected = selected.includes(item.id);
        const isRequired = required?.has(item.id);
        const isDisabled = Boolean(disabled?.has(item.id)) || Boolean(isRequired);
        return (
          <button
            key={item.id}
            onClick={() => {
              if (!isDisabled) onToggle(item.id);
            }}
            disabled={isDisabled}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              border: `1px solid ${isSelected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'}`,
              background: isSelected ? 'rgba(0,245,255,0.1)' : 'transparent',
              color: isSelected ? '#00f5ff' : 'var(--color-text-dim, #8a8aa0)',
              fontSize: '0.75rem',
              cursor: isDisabled ? 'default' : 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              opacity: isDisabled ? 0.7 : 1,
            }}
          >
            {item.label}
            {isRequired && ' *'}
          </button>
        );
      })}
    </div>
  );
}
