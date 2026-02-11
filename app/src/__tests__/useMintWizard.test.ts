import { describe, it, expect } from 'vitest';
import {
  INITIAL_WIZARD_STATE,
  DEFAULT_TRAITS,
  type WizardState,
  type WizardAction,
  type AgentPreset,
  type TraitsState,
} from '@/components/mint/wizard-types';

// Import the reducer by reconstructing it (it's not exported directly,
// but we can test via the hook's behavior by calling the reducer logic).
// Since useMintWizard uses useReducer, we test the reducer function directly.
// We need to import it — let's use a test helper.

// The reducer is internal to useMintWizard.ts. We'll replicate the import
// via the module structure. Since the test environment is node (not jsdom),
// we mock React's useReducer and capture the reducer function.

import { vi } from 'vitest';

let capturedReducer: ((state: WizardState, action: WizardAction) => WizardState) | null = null;

vi.mock('react', () => ({
  useReducer: (reducer: any, initialState: any) => {
    capturedReducer = reducer;
    return [initialState, vi.fn()];
  },
}));

// Import the hook to trigger the mock and capture the reducer
import { useMintWizard } from '@/components/mint/useMintWizard';

// Call the hook once to capture the reducer
useMintWizard();

function reduce(state: WizardState, action: WizardAction): WizardState {
  if (!capturedReducer) throw new Error('Reducer not captured — mock failed');
  return capturedReducer(state, action);
}

// ── Test preset ────────────────────────────────────────────────────────────

const TEST_PRESET: AgentPreset = {
  id: 'test-preset',
  name: 'Test Bot',
  description: 'A test preset',
  category: 'role',
  traits: {
    honestyHumility: 0.9,
    emotionality: 0.2,
    extraversion: 0.8,
    agreeableness: 0.5,
    conscientiousness: 0.95,
    openness: 0.7,
  },
  suggestedSkills: ['web-search', 'github'],
  suggestedChannels: ['discord', 'webchat'],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('wizardReducer', () => {
  describe('SET_STEP', () => {
    it('sets the wizard step', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_STEP', step: 3 });
      expect(result.step).toBe(3);
    });
  });

  describe('SELECT_PRESET', () => {
    it('sets preset, display name, traits, skills, and channels', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SELECT_PRESET', preset: TEST_PRESET });
      expect(result.selectedPreset).toEqual(TEST_PRESET);
      expect(result.displayName).toBe('Test Bot');
      expect(result.traits).toEqual(TEST_PRESET.traits);
      expect(result.selectedSkills).toEqual(['web-search', 'github']);
      expect(result.selectedChannels).toEqual(['discord', 'webchat']);
    });

    it('clears provider and credentials on preset change', () => {
      const stateWithProvider = {
        ...INITIAL_WIZARD_STATE,
        selectedProvider: 'openai',
        credentialValues: { OPENAI_API_KEY: 'sk-xxx' },
      };
      const result = reduce(stateWithProvider, { type: 'SELECT_PRESET', preset: TEST_PRESET });
      expect(result.selectedProvider).toBeNull();
      expect(result.credentialValues).toEqual({});
    });

    it('creates copies of arrays (not references)', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SELECT_PRESET', preset: TEST_PRESET });
      expect(result.selectedSkills).not.toBe(TEST_PRESET.suggestedSkills);
      expect(result.selectedChannels).not.toBe(TEST_PRESET.suggestedChannels);
    });
  });

  describe('CLEAR_PRESET', () => {
    it('clears the selected preset without changing other state', () => {
      const withPreset = reduce(INITIAL_WIZARD_STATE, { type: 'SELECT_PRESET', preset: TEST_PRESET });
      const result = reduce(withPreset, { type: 'CLEAR_PRESET' });
      expect(result.selectedPreset).toBeNull();
      // Skills and channels remain from preset
      expect(result.selectedSkills).toEqual(['web-search', 'github']);
    });
  });

  describe('SET_DISPLAY_NAME', () => {
    it('sets the display name', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_DISPLAY_NAME', name: 'My Agent' });
      expect(result.displayName).toBe('My Agent');
    });
  });

  describe('SET_TRAIT', () => {
    it('sets a single trait value', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_TRAIT', key: 'openness', value: 0.99 });
      expect(result.traits.openness).toBe(0.99);
      // Other traits unchanged
      expect(result.traits.honestyHumility).toBe(DEFAULT_TRAITS.honestyHumility);
    });
  });

  describe('SET_TRAITS', () => {
    it('replaces all traits', () => {
      const newTraits: TraitsState = {
        honestyHumility: 0.1,
        emotionality: 0.2,
        extraversion: 0.3,
        agreeableness: 0.4,
        conscientiousness: 0.5,
        openness: 0.6,
      };
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_TRAITS', traits: newTraits });
      expect(result.traits).toEqual(newTraits);
    });
  });

  describe('SET_HIDE_OWNER', () => {
    it('sets hideOwner to true', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_HIDE_OWNER', hide: true });
      expect(result.hideOwner).toBe(true);
    });

    it('sets hideOwner to false', () => {
      const withHidden = { ...INITIAL_WIZARD_STATE, hideOwner: true };
      const result = reduce(withHidden, { type: 'SET_HIDE_OWNER', hide: false });
      expect(result.hideOwner).toBe(false);
    });
  });

  describe('TOGGLE_SKILL', () => {
    it('adds a skill when not present', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'TOGGLE_SKILL', name: 'github' });
      expect(result.selectedSkills).toContain('github');
    });

    it('removes a skill when already present', () => {
      const withSkill = { ...INITIAL_WIZARD_STATE, selectedSkills: ['github', 'web-search'] };
      const result = reduce(withSkill, { type: 'TOGGLE_SKILL', name: 'github' });
      expect(result.selectedSkills).not.toContain('github');
      expect(result.selectedSkills).toContain('web-search');
    });
  });

  describe('TOGGLE_CHANNEL', () => {
    it('adds a channel when not present', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'TOGGLE_CHANNEL', platform: 'telegram' });
      expect(result.selectedChannels).toContain('telegram');
    });

    it('removes a channel when already present', () => {
      const withChannel = { ...INITIAL_WIZARD_STATE, selectedChannels: ['telegram', 'discord'] };
      const result = reduce(withChannel, { type: 'TOGGLE_CHANNEL', platform: 'telegram' });
      expect(result.selectedChannels).not.toContain('telegram');
      expect(result.selectedChannels).toContain('discord');
    });
  });

  describe('SET_PROVIDER', () => {
    it('sets the provider', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_PROVIDER', providerId: 'anthropic' });
      expect(result.selectedProvider).toBe('anthropic');
    });

    it('can clear the provider', () => {
      const withProvider = { ...INITIAL_WIZARD_STATE, selectedProvider: 'openai' };
      const result = reduce(withProvider, { type: 'SET_PROVIDER', providerId: null });
      expect(result.selectedProvider).toBeNull();
    });
  });

  describe('SET_CREDENTIAL', () => {
    it('sets a credential value', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_CREDENTIAL', key: 'OPENAI_API_KEY', value: 'sk-xxx' });
      expect(result.credentialValues['OPENAI_API_KEY']).toBe('sk-xxx');
    });

    it('preserves other credentials', () => {
      const withCreds = { ...INITIAL_WIZARD_STATE, credentialValues: { FOO: 'bar' } };
      const result = reduce(withCreds, { type: 'SET_CREDENTIAL', key: 'BAZ', value: 'qux' });
      expect(result.credentialValues).toEqual({ FOO: 'bar', BAZ: 'qux' });
    });
  });

  describe('SET_SIGNER_PUBKEY', () => {
    it('sets the signer pubkey', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_SIGNER_PUBKEY', pubkey: 'ABC123' });
      expect(result.agentSignerPubkey).toBe('ABC123');
    });
  });

  describe('SET_HOSTING_MODE', () => {
    it('sets managed mode', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_HOSTING_MODE', mode: 'managed' });
      expect(result.hostingMode).toBe('managed');
    });

    it('sets self-hosted mode', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_HOSTING_MODE', mode: 'self_hosted' });
      expect(result.hostingMode).toBe('self_hosted');
    });
  });

  describe('START_MINT', () => {
    it('sets isMinting true and resets mint state', () => {
      const prevState = {
        ...INITIAL_WIZARD_STATE,
        mintError: 'Previous error',
        mintSig: 'prevSig',
        mintedAgentPda: 'prevPda',
      };
      const result = reduce(prevState, { type: 'START_MINT' });
      expect(result.isMinting).toBe(true);
      expect(result.mintError).toBeNull();
      expect(result.mintSig).toBeNull();
      expect(result.mintedAgentPda).toBeNull();
      expect(result.metadataPin).toEqual({ state: 'idle' });
      expect(result.managedHosting).toEqual({ state: 'idle' });
      expect(result.credentialSubmission).toEqual({ state: 'idle' });
    });
  });

  describe('MINT_SUCCESS', () => {
    it('sets mint sig and agent PDA, stops minting', () => {
      const minting = { ...INITIAL_WIZARD_STATE, isMinting: true };
      const result = reduce(minting, { type: 'MINT_SUCCESS', sig: 'txSig123', agentPda: 'pdaABC' });
      expect(result.isMinting).toBe(false);
      expect(result.mintSig).toBe('txSig123');
      expect(result.mintedAgentPda).toBe('pdaABC');
    });
  });

  describe('MINT_ERROR', () => {
    it('sets mint error and stops minting', () => {
      const minting = { ...INITIAL_WIZARD_STATE, isMinting: true };
      const result = reduce(minting, { type: 'MINT_ERROR', error: 'Insufficient SOL' });
      expect(result.isMinting).toBe(false);
      expect(result.mintError).toBe('Insufficient SOL');
    });
  });

  describe('SET_METADATA_PIN', () => {
    it('sets metadata pin state', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'SET_METADATA_PIN', pin: { state: 'pinning' } });
      expect(result.metadataPin).toEqual({ state: 'pinning' });
    });
  });

  describe('SET_MANAGED_HOSTING', () => {
    it('sets managed hosting state', () => {
      const result = reduce(INITIAL_WIZARD_STATE, {
        type: 'SET_MANAGED_HOSTING',
        hosting: { state: 'done', ok: true },
      });
      expect(result.managedHosting).toEqual({ state: 'done', ok: true });
    });
  });

  describe('SET_CREDENTIAL_SUBMISSION', () => {
    it('sets credential submission state', () => {
      const result = reduce(INITIAL_WIZARD_STATE, {
        type: 'SET_CREDENTIAL_SUBMISSION',
        submission: { state: 'done', submitted: 3, failed: [] },
      });
      expect(result.credentialSubmission).toEqual({ state: 'done', submitted: 3, failed: [] });
    });
  });

  describe('RESET_MINT', () => {
    it('resets mint-related state without clearing form data', () => {
      const postMint: WizardState = {
        ...INITIAL_WIZARD_STATE,
        displayName: 'My Agent',
        selectedSkills: ['github'],
        mintSig: 'someSig',
        mintedAgentPda: 'somePda',
        isMinting: false,
        mintError: null,
        metadataPin: { state: 'done', pinned: true, cid: 'QmABC', gatewayUrl: 'http://...' },
      };
      const result = reduce(postMint, { type: 'RESET_MINT' });
      expect(result.mintSig).toBeNull();
      expect(result.mintedAgentPda).toBeNull();
      expect(result.metadataPin).toEqual({ state: 'idle' });
      // Form data preserved
      expect(result.displayName).toBe('My Agent');
      expect(result.selectedSkills).toEqual(['github']);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged for unknown actions', () => {
      const result = reduce(INITIAL_WIZARD_STATE, { type: 'NONEXISTENT' } as any);
      expect(result).toEqual(INITIAL_WIZARD_STATE);
    });
  });
});
