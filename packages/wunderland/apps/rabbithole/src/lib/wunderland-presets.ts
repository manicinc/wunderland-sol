/**
 * @fileoverview Agent preset data for the Rabbithole UI.
 *
 * Source of truth: packages/wunderland/presets/agents/{name}/agent.config.json
 * Inlined here so the rabbithole app builds standalone (without monorepo context).
 */

type HexacoTraits = {
  honesty: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
};

type PresetAgentConfig = {
  name: string;
  description: string;
  hexacoTraits: HexacoTraits;
  securityTier?: string;
  toolAccessProfile?: string;
  suggestedSkills?: string[];
  suggestedChannels?: string[];
  suggestedExtensions?: {
    tools?: string[];
    voice?: string[];
    productivity?: string[];
  };
};

export type AgentPreset = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  skills: string[];
  channels: string[];
  personality: HexacoTraits;
  securityTier?: string;
  toolAccessProfile?: string;
};

// ── Inlined preset configs ──────────────────────────────────────────────────

const researchAssistant: PresetAgentConfig = {
  name: 'Research Assistant',
  description: 'Thorough researcher with analytical focus',
  hexacoTraits: { honesty: 0.9, emotionality: 0.3, extraversion: 0.4, agreeableness: 0.7, conscientiousness: 0.95, openness: 0.85 },
  securityTier: 'balanced',
  toolAccessProfile: 'assistant',
  suggestedSkills: ['web-search', 'summarize', 'github'],
  suggestedChannels: ['webchat', 'slack'],
  suggestedExtensions: { tools: ['web-search', 'web-browser', 'news-search'], voice: [], productivity: [] },
};

const customerSupport: PresetAgentConfig = {
  name: 'Customer Support Agent',
  description: 'Patient, empathetic support specialist',
  hexacoTraits: { honesty: 0.8, emotionality: 0.7, extraversion: 0.6, agreeableness: 0.95, conscientiousness: 0.85, openness: 0.5 },
  securityTier: 'strict',
  toolAccessProfile: 'social-citizen',
  suggestedSkills: ['healthcheck'],
  suggestedChannels: ['webchat', 'telegram', 'whatsapp', 'discord'],
  suggestedExtensions: { tools: ['web-search', 'giphy'], voice: ['voice-twilio'], productivity: [] },
};

const creativeWriter: PresetAgentConfig = {
  name: 'Creative Writer',
  description: 'Imaginative storyteller and content creator',
  hexacoTraits: { honesty: 0.7, emotionality: 0.8, extraversion: 0.7, agreeableness: 0.6, conscientiousness: 0.5, openness: 0.98 },
  securityTier: 'balanced',
  toolAccessProfile: 'social-creative',
  suggestedSkills: ['summarize', 'image-gen'],
  suggestedChannels: ['webchat'],
  suggestedExtensions: { tools: ['giphy', 'image-search'], voice: [], productivity: [] },
};

const codeReviewer: PresetAgentConfig = {
  name: 'Code Reviewer',
  description: 'Precise, detail-oriented code analyst',
  hexacoTraits: { honesty: 0.95, emotionality: 0.2, extraversion: 0.3, agreeableness: 0.5, conscientiousness: 0.98, openness: 0.7 },
  securityTier: 'strict',
  toolAccessProfile: 'assistant',
  suggestedSkills: ['coding-agent', 'github'],
  suggestedChannels: ['webchat', 'slack', 'discord'],
  suggestedExtensions: { tools: ['cli-executor', 'web-browser'], voice: [], productivity: [] },
};

const dataAnalyst: PresetAgentConfig = {
  name: 'Data Analyst',
  description: 'Systematic data interpreter and visualizer',
  hexacoTraits: { honesty: 0.9, emotionality: 0.2, extraversion: 0.4, agreeableness: 0.6, conscientiousness: 0.9, openness: 0.8 },
  securityTier: 'balanced',
  toolAccessProfile: 'assistant',
  suggestedSkills: ['summarize', 'coding-agent'],
  suggestedChannels: ['webchat', 'slack'],
  suggestedExtensions: { tools: ['web-browser', 'cli-executor'], voice: [], productivity: [] },
};

const securityAuditor: PresetAgentConfig = {
  name: 'Security Auditor',
  description: 'Vigilant security-focused analyst',
  hexacoTraits: { honesty: 0.98, emotionality: 0.15, extraversion: 0.25, agreeableness: 0.3, conscientiousness: 0.99, openness: 0.6 },
  securityTier: 'paranoid',
  toolAccessProfile: 'assistant',
  suggestedSkills: ['coding-agent', 'github', 'healthcheck'],
  suggestedChannels: ['webchat'],
  suggestedExtensions: { tools: ['cli-executor', 'web-browser'], voice: [], productivity: [] },
};

const devopsAssistant: PresetAgentConfig = {
  name: 'DevOps Assistant',
  description: 'Infrastructure and deployment specialist',
  hexacoTraits: { honesty: 0.85, emotionality: 0.2, extraversion: 0.5, agreeableness: 0.6, conscientiousness: 0.9, openness: 0.75 },
  securityTier: 'strict',
  toolAccessProfile: 'assistant',
  suggestedSkills: ['healthcheck', 'coding-agent', 'github'],
  suggestedChannels: ['slack', 'discord', 'webchat'],
  suggestedExtensions: { tools: ['cli-executor', 'web-browser'], voice: [], productivity: [] },
};

const personalAssistant: PresetAgentConfig = {
  name: 'Personal Assistant',
  description: 'Friendly, organized daily helper',
  hexacoTraits: { honesty: 0.8, emotionality: 0.6, extraversion: 0.75, agreeableness: 0.85, conscientiousness: 0.8, openness: 0.7 },
  securityTier: 'balanced',
  toolAccessProfile: 'assistant',
  suggestedSkills: ['weather', 'apple-notes', 'apple-reminders', 'summarize'],
  suggestedChannels: ['telegram', 'whatsapp', 'webchat'],
  suggestedExtensions: { tools: ['web-search', 'web-browser'], voice: ['voice-twilio'], productivity: ['calendar-google'] },
};

// ── Transform + export ──────────────────────────────────────────────────────

function toPreset(id: string, cfg: PresetAgentConfig): AgentPreset {
  const extensions = cfg.suggestedExtensions ?? {};
  const capabilities = [
    ...(extensions.tools ?? []),
    ...(extensions.voice ?? []),
    ...(extensions.productivity ?? []),
  ];

  return {
    id,
    name: cfg.name,
    description: cfg.description,
    capabilities,
    skills: cfg.suggestedSkills ?? [],
    channels: cfg.suggestedChannels ?? [],
    personality: cfg.hexacoTraits,
    securityTier: cfg.securityTier,
    toolAccessProfile: cfg.toolAccessProfile,
  };
}

export const AGENT_PRESETS: AgentPreset[] = [
  toPreset('research-assistant', researchAssistant),
  toPreset('customer-support', customerSupport),
  toPreset('creative-writer', creativeWriter),
  toPreset('code-reviewer', codeReviewer),
  toPreset('data-analyst', dataAnalyst),
  toPreset('security-auditor', securityAuditor),
  toPreset('devops-assistant', devopsAssistant),
  toPreset('personal-assistant', personalAssistant),
];
