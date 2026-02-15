import type { Keypair } from '@solana/web3.js';

// ── Traits (mirrors PresetSelector's TraitsState) ──────────────────────────

export interface TraitsState {
  honestyHumility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

export const TRAIT_KEYS: (keyof TraitsState)[] = [
  'honestyHumility', 'emotionality', 'extraversion',
  'agreeableness', 'conscientiousness', 'openness',
];

export const TRAIT_LABELS: Record<keyof TraitsState, string> = {
  honestyHumility: 'Honesty-Humility',
  emotionality: 'Emotionality',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  conscientiousness: 'Conscientiousness',
  openness: 'Openness',
};

export const TRAIT_TOOLTIPS: Record<keyof TraitsState, string> = {
  honestyHumility: 'Sincerity, fairness, greed avoidance. High = transparent, collaborative agents.',
  emotionality: 'Fearfulness, anxiety, sentimentality. High = empathetic but cautious agents.',
  extraversion: 'Social boldness, sociability, liveliness. High = actively engaging agents.',
  agreeableness: 'Forgiveness, gentleness, patience. High = diplomatic, conflict-averse agents.',
  conscientiousness: 'Organization, diligence, perfectionism. High = thorough, detail-oriented agents.',
  openness: 'Creativity, inquisitiveness, unconventionality. High = creative, exploratory agents.',
};

export const DEFAULT_TRAITS: TraitsState = {
  honestyHumility: 0.7,
  emotionality: 0.5,
  extraversion: 0.6,
  agreeableness: 0.7,
  conscientiousness: 0.6,
  openness: 0.7,
};

// ── Preset type (re-exported from PresetSelector) ──────────────────────────

export interface AgentPreset {
  id: string;
  name: string;
  description: string;
  category: 'role' | 'personality';
  traits: TraitsState;
  suggestedSkills: string[];
  suggestedChannels: string[];
}

// ── Wizard steps ───────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Identity',
  2: 'Personality',
  3: 'Skills & Channels',
  4: 'API Keys',
  5: 'Signer & Hosting',
  6: 'Review & Mint',
};

// ── Credential submission state ────────────────────────────────────────────

export type CredentialSubmission =
  | { state: 'idle' }
  | { state: 'submitting' }
  | { state: 'done'; submitted: number; failed: { key: string; error: string }[] };

// ── Metadata pin state ─────────────────────────────────────────────────────

export type MetadataPinState =
  | { state: 'idle' }
  | { state: 'pinning' }
  | { state: 'done'; pinned: boolean; cid: string; gatewayUrl: string | null; error?: string };

// ── Managed hosting state ──────────────────────────────────────────────────

export type ManagedHostingState =
  | { state: 'idle' }
  | { state: 'onboarding' }
  | { state: 'done'; ok: boolean; error?: string; details?: any };

// ── Wizard state ───────────────────────────────────────────────────────────

export interface WizardState {
  step: WizardStep;

  // Step 1: Identity
  displayName: string;
  selectedPreset: AgentPreset | null;
  hideOwner: boolean; // UI-level: hide owner wallet from web profile (on-chain data still public)

  // Step 2: Personality
  traits: TraitsState;

  // Step 3: Skills & Channels
  selectedSkills: string[];
  selectedChannels: string[];
  selectedProvider: string | null;

  // Step 4: Credentials
  credentialValues: Record<string, string>; // env var key → raw value

  // Step 5: Signer & Hosting
  agentSignerPubkey: string;
  generatedSigner: Keypair | null;
  hostingMode: 'managed' | 'self_hosted';

  // Step 6: Review & Mint
  isMinting: boolean;
  mintError: string | null;
  mintSig: string | null;
  mintedAgentPda: string | null;
  metadataPin: MetadataPinState;
  managedHosting: ManagedHostingState;
  credentialSubmission: CredentialSubmission;
}

// ── Actions ────────────────────────────────────────────────────────────────

export type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SELECT_PRESET'; preset: AgentPreset }
  | { type: 'CLEAR_PRESET' }
  | { type: 'SET_DISPLAY_NAME'; name: string }
  | { type: 'SET_HIDE_OWNER'; hide: boolean }
  | { type: 'SET_TRAIT'; key: keyof TraitsState; value: number }
  | { type: 'SET_TRAITS'; traits: TraitsState }
  | { type: 'TOGGLE_SKILL'; name: string }
  | { type: 'TOGGLE_CHANNEL'; platform: string }
  | { type: 'SET_PROVIDER'; providerId: string | null }
  | { type: 'SET_CREDENTIAL'; key: string; value: string }
  | { type: 'SET_SIGNER_PUBKEY'; pubkey: string }
  | { type: 'SET_GENERATED_SIGNER'; signer: Keypair | null }
  | { type: 'SET_HOSTING_MODE'; mode: 'managed' | 'self_hosted' }
  | { type: 'START_MINT' }
  | { type: 'MINT_SUCCESS'; sig: string; agentPda: string }
  | { type: 'MINT_ERROR'; error: string }
  | { type: 'SET_METADATA_PIN'; pin: MetadataPinState }
  | { type: 'SET_MANAGED_HOSTING'; hosting: ManagedHostingState }
  | { type: 'SET_CREDENTIAL_SUBMISSION'; submission: CredentialSubmission }
  | { type: 'RESET_MINT' }
  | { type: 'APPLY_NL_RECOMMENDATIONS'; traits?: TraitsState; skills?: string[]; channels?: string[]; displayName?: string };

// ── Initial state ──────────────────────────────────────────────────────────

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  displayName: 'New Agent',
  selectedPreset: null,
  hideOwner: false,
  traits: DEFAULT_TRAITS,
  selectedSkills: [],
  selectedChannels: [],
  selectedProvider: 'openai',
  credentialValues: {},
  agentSignerPubkey: '',
  generatedSigner: null,
  hostingMode: 'managed',
  isMinting: false,
  mintError: null,
  mintSig: null,
  mintedAgentPda: null,
  metadataPin: { state: 'idle' },
  managedHosting: { state: 'idle' },
  credentialSubmission: { state: 'idle' },
};

// ── Step validation ────────────────────────────────────────────────────────

export function isStepValid(state: WizardState, step: WizardStep): boolean {
  switch (step) {
    case 1:
      return state.displayName.trim().length > 0 &&
        new TextEncoder().encode(state.displayName.trim()).length <= 32;
    case 2:
      return true; // defaults are always valid
    case 3:
      return true; // optional selections
    case 4:
      return true; // credentials are optional (can add later)
    case 5:
      return state.agentSignerPubkey.trim().length > 0;
    case 6:
      return true;
    default:
      return false;
  }
}

export function canProceedToStep(state: WizardState, targetStep: WizardStep): boolean {
  for (let s = 1; s < targetStep; s++) {
    if (!isStepValid(state, s as WizardStep)) return false;
  }
  return true;
}
