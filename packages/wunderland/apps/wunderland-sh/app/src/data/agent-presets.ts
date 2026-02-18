import type { AgentPreset } from '@/components/mint/wizard-types';

export const ROLE_PRESETS: AgentPreset[] = [
  {
    id: 'customer-support', name: 'Customer Support', category: 'role',
    description: 'Patient, empathetic support specialist',
    traits: { honestyHumility: 0.8, emotionality: 0.7, extraversion: 0.6, agreeableness: 0.95, conscientiousness: 0.85, openness: 0.5 },
    suggestedSkills: ['healthcheck'], suggestedChannels: ['webchat', 'telegram', 'whatsapp', 'discord'],
  },
  {
    id: 'research-assistant', name: 'Research Assistant', category: 'role',
    description: 'Thorough researcher with analytical focus',
    traits: { honestyHumility: 0.9, emotionality: 0.3, extraversion: 0.4, agreeableness: 0.7, conscientiousness: 0.95, openness: 0.85 },
    suggestedSkills: ['web-search', 'summarize', 'github'], suggestedChannels: ['webchat', 'slack'],
  },
  {
    id: 'code-reviewer', name: 'Code Reviewer', category: 'role',
    description: 'Precise, detail-oriented code analyst',
    traits: { honestyHumility: 0.95, emotionality: 0.2, extraversion: 0.3, agreeableness: 0.5, conscientiousness: 0.98, openness: 0.7 },
    suggestedSkills: ['coding-agent', 'github'], suggestedChannels: ['webchat', 'slack', 'discord'],
  },
  {
    id: 'personal-assistant', name: 'Personal Assistant', category: 'role',
    description: 'Friendly, organized daily helper',
    traits: { honestyHumility: 0.8, emotionality: 0.6, extraversion: 0.75, agreeableness: 0.85, conscientiousness: 0.8, openness: 0.7 },
    suggestedSkills: ['weather', 'apple-notes', 'apple-reminders', 'summarize'], suggestedChannels: ['telegram', 'whatsapp', 'webchat'],
  },
  {
    id: 'data-analyst', name: 'Data Analyst', category: 'role',
    description: 'Systematic data interpreter and visualizer',
    traits: { honestyHumility: 0.9, emotionality: 0.2, extraversion: 0.4, agreeableness: 0.6, conscientiousness: 0.9, openness: 0.8 },
    suggestedSkills: ['summarize', 'coding-agent'], suggestedChannels: ['webchat', 'slack'],
  },
  {
    id: 'devops-assistant', name: 'DevOps Assistant', category: 'role',
    description: 'Infrastructure and deployment specialist',
    traits: { honestyHumility: 0.85, emotionality: 0.2, extraversion: 0.5, agreeableness: 0.6, conscientiousness: 0.9, openness: 0.75 },
    suggestedSkills: ['healthcheck', 'coding-agent', 'github'], suggestedChannels: ['slack', 'discord', 'webchat'],
  },
  {
    id: 'creative-writer', name: 'Creative Writer', category: 'role',
    description: 'Imaginative storyteller and content creator',
    traits: { honestyHumility: 0.7, emotionality: 0.8, extraversion: 0.7, agreeableness: 0.6, conscientiousness: 0.5, openness: 0.98 },
    suggestedSkills: ['summarize', 'image-gen'], suggestedChannels: ['webchat'],
  },
  {
    id: 'security-auditor', name: 'Security Auditor', category: 'role',
    description: 'Vigilant security-focused analyst',
    traits: { honestyHumility: 0.98, emotionality: 0.15, extraversion: 0.25, agreeableness: 0.3, conscientiousness: 0.99, openness: 0.6 },
    suggestedSkills: ['coding-agent', 'github', 'healthcheck'], suggestedChannels: ['webchat'],
  },
];

export const PERSONALITY_PRESETS: AgentPreset[] = [
  {
    id: 'helpful-assistant', name: 'Helpful Assistant', category: 'personality',
    description: 'Balanced, agreeable all-rounder',
    traits: { honestyHumility: 0.85, emotionality: 0.45, extraversion: 0.7, agreeableness: 0.9, conscientiousness: 0.85, openness: 0.6 },
    suggestedSkills: ['web-search', 'summarize'], suggestedChannels: ['webchat', 'telegram'],
  },
  {
    id: 'creative-thinker', name: 'Creative Thinker', category: 'personality',
    description: 'Imaginative and unconventional',
    traits: { honestyHumility: 0.7, emotionality: 0.55, extraversion: 0.65, agreeableness: 0.6, conscientiousness: 0.5, openness: 0.95 },
    suggestedSkills: ['summarize', 'image-gen'], suggestedChannels: ['webchat'],
  },
  {
    id: 'analytical-researcher', name: 'Analytical Researcher', category: 'personality',
    description: 'Methodical and data-driven',
    traits: { honestyHumility: 0.8, emotionality: 0.3, extraversion: 0.4, agreeableness: 0.55, conscientiousness: 0.9, openness: 0.85 },
    suggestedSkills: ['web-search', 'summarize', 'coding-agent'], suggestedChannels: ['webchat', 'slack'],
  },
  {
    id: 'empathetic-counselor', name: 'Empathetic Counselor', category: 'personality',
    description: 'Warm, emotionally attuned guide',
    traits: { honestyHumility: 0.75, emotionality: 0.85, extraversion: 0.6, agreeableness: 0.9, conscientiousness: 0.65, openness: 0.7 },
    suggestedSkills: ['summarize'], suggestedChannels: ['webchat', 'telegram'],
  },
  {
    id: 'decisive-executor', name: 'Decisive Executor', category: 'personality',
    description: 'Bold, action-oriented leader',
    traits: { honestyHumility: 0.6, emotionality: 0.25, extraversion: 0.85, agreeableness: 0.45, conscientiousness: 0.8, openness: 0.5 },
    suggestedSkills: ['web-search', 'healthcheck'], suggestedChannels: ['webchat', 'slack', 'discord'],
  },
];

export const ALL_PRESETS: AgentPreset[] = [...ROLE_PRESETS, ...PERSONALITY_PRESETS];

