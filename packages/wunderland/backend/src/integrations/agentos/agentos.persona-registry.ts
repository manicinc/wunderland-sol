import fs from 'fs';
import path from 'path';
import type { ILlmTool } from '../../core/llm/llm.interfaces.js';
import { CodingAssistantAgentTools } from '../../tools/codingAssistant.tools.js';
import { DiaryAgentTools } from '../../tools/diary.tools.js';
import { TutorAgentTools } from '../../tools/tutor.tools.js';
import { listApprovedDynamicPersonas } from './agentos.dynamic-personas.js';

const PROMPTS_DIR = path.resolve(process.cwd(), 'prompts');

export type AgentOSAccessLevel = 'public' | 'metered' | 'global' | 'unlimited';

export interface AgentOSToolset {
  id: string;
  label: string;
  description: string;
  tools: ILlmTool[];
  minAccessLevel?: AgentOSAccessLevel;
}

export interface AgentOSPersonaDefinition {
  personaId: string;
  agentIds: string[];
  label: string;
  description: string;
  category: string;
  promptKey: string;
  promptPath: string;
  tags: string[];
  toolsetIds: string[];
  minAccessLevel?: AgentOSAccessLevel;
  requiredSecrets?: string[];
}

const TOOLSETS: Record<string, AgentOSToolset> = {
  coding_core: {
    id: 'coding_core',
    label: 'CodePilot Core Tools',
    description: 'Generate code snippets, explain code, and debug stack traces.',
    tools: CodingAssistantAgentTools,
    minAccessLevel: 'metered',
  },
  tutor_learning: {
    id: 'tutor_learning',
    label: 'Professor Astra Study Tools',
    description: 'Create flashcards and Socratic quizzes.',
    tools: TutorAgentTools,
    minAccessLevel: 'public',
  },
  diary_reflection: {
    id: 'diary_reflection',
    label: 'Echo Diary Reflection Helpers',
    description: 'Suggest diary metadata prior to full entry generation.',
    tools: DiaryAgentTools,
    minAccessLevel: 'public',
  },
};

let dynamicPersonas: AgentOSPersonaDefinition[] = [];

export const reloadDynamicPersonas = async (): Promise<void> => {
  dynamicPersonas = await listApprovedDynamicPersonas();
};

const PERSONAS: AgentOSPersonaDefinition[] = [
  {
    personaId: 'nerf_generalist',
    agentIds: ['nerf_agent'],
    label: 'Nerf',
    description: 'Friendly and concise Q&A generalist for everyday questions.',
    category: 'general',
    promptKey: 'nerf_chat',
    promptPath: resolvePromptPath('nerf_chat'),
    tags: ['concise', 'q&a', 'daily-helper'],
    toolsetIds: [],
    requiredSecrets: ['openrouter.apiKey'],
  },
  {
    personaId: 'v_researcher',
    agentIds: ['v_agent', 'general', 'general-ai'],
    label: 'V',
    description: 'Advanced polymathic researcher for complex explorations.',
    category: 'general',
    promptKey: 'v_default_assistant',
    promptPath: resolvePromptPath('v_default_assistant'),
    tags: ['research', 'analysis', 'deep-dive'],
    toolsetIds: [],
    requiredSecrets: ['openrouter.apiKey'],
  },
  {
    personaId: 'code_pilot',
    agentIds: ['coding_assistant'],
    label: 'CodePilot',
    description: 'Expert coding partner across languages, debugging, and explanations.',
    category: 'coding',
    promptKey: 'coding',
    promptPath: resolvePromptPath('coding'),
    tags: ['code', 'debugging', 'snippets'],
    toolsetIds: ['coding_core'],
    minAccessLevel: 'metered',
    requiredSecrets: ['openrouter.apiKey'],
  },
  {
    personaId: 'systems_architect',
    agentIds: ['system_designer'],
    label: 'Systems Architect',
    description: 'Guides you through large-scale architecture and trade-offs.',
    category: 'coding',
    promptKey: 'system_design',
    promptPath: resolvePromptPath('system_design'),
    tags: ['architecture', 'diagrams', 'tradeoffs'],
    toolsetIds: [],
    minAccessLevel: 'metered',
    requiredSecrets: ['openrouter.apiKey'],
  },
  {
    personaId: 'meeting_maestro',
    agentIds: ['meeting_summarizer'],
    label: 'Meeting Maestro',
    description: 'Captures meetings with structured summaries and action items.',
    category: 'productivity',
    promptKey: 'meeting',
    promptPath: resolvePromptPath('meeting'),
    tags: ['meetings', 'notes', 'productivity'],
    toolsetIds: [],
    requiredSecrets: ['openrouter.apiKey'],
  },
  {
    personaId: 'echo_diary',
    agentIds: ['diary_agent'],
    label: 'Echo Diary',
    description: 'Reflective diary companion that structures entries and metadata.',
    category: 'productivity',
    promptKey: 'diary',
    promptPath: resolvePromptPath('diary'),
    tags: ['journaling', 'reflection', 'personal'],
    toolsetIds: ['diary_reflection'],
    requiredSecrets: ['openrouter.apiKey'],
  },
  {
    personaId: 'interview_coach',
    agentIds: ['coding_interviewer'],
    label: 'Coding Interviewer',
    description: 'Simulates interviews and evaluates technical answers.',
    category: 'learning',
    promptKey: 'coding_interviewer',
    promptPath: resolvePromptPath('coding_interviewer'),
    tags: ['interview', 'practice', 'feedback'],
    toolsetIds: [],
    requiredSecrets: ['openrouter.apiKey'],
  },
  {
    personaId: 'professor_astra',
    agentIds: ['tutor_agent'],
    label: 'Professor Astra',
    description: 'Adaptive tutor with quiz + flashcard tooling.',
    category: 'learning',
    promptKey: 'tutor',
    promptPath: resolvePromptPath('tutor'),
    tags: ['learning', 'tutor', 'education'],
    toolsetIds: ['tutor_learning'],
    requiredSecrets: ['openrouter.apiKey'],
  },
  {
    personaId: 'lc_audit',
    agentIds: ['lc_audit_aide'],
    label: 'LC Audit',
    description: 'Deep LeetCode audits with slideshow-style responses.',
    category: 'auditing',
    promptKey: 'lc_audit_aide',
    promptPath: resolvePromptPath('lc_audit_aide'),
    tags: ['leetcode', 'audit', 'algorithms'],
    toolsetIds: [],
    minAccessLevel: 'metered',
    requiredSecrets: ['openrouter.apiKey'],
  },
];

export function resolveAgentOSPersona(agentId?: string): AgentOSPersonaDefinition {
  if (!agentId) {
    return PERSONAS[0];
  }
  const normalized = agentId.toLowerCase();
  const fromStatic =
    PERSONAS.find((persona) => persona.agentIds.map((id) => id.toLowerCase()).includes(normalized)) ??
    PERSONAS.find((persona) => persona.personaId.toLowerCase() === normalized);
  if (fromStatic) {
    return fromStatic;
  }
  const fromDynamic =
    dynamicPersonas.find((persona) => persona.agentIds.map((id) => id.toLowerCase()).includes(normalized)) ??
    dynamicPersonas.find((persona) => persona.personaId.toLowerCase() === normalized);
  return fromDynamic ?? PERSONAS[0];
}

export function listAgentOSPersonas(): AgentOSPersonaDefinition[] {
  return [...PERSONAS, ...dynamicPersonas];
}

export function listAgentOSToolsets(): AgentOSToolset[] {
  return Object.values(TOOLSETS);
}

function resolvePromptPath(promptKey: string): string {
  const candidates = [
    promptKey,
    promptKey.replace(/^default_/, ''),
    promptKey.replace(/_default_/, '_'),
    'v_default_assistant',
  ];

  for (const key of candidates) {
    const filePath = path.join(PROMPTS_DIR, `${key}.md`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return path.join(PROMPTS_DIR, 'v_default_assistant.md');
}
