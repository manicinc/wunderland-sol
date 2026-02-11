import { describe, it, expect } from 'vitest';
import {
  TRAIT_KEYS,
  TRAIT_LABELS,
  TRAIT_TOOLTIPS,
  DEFAULT_TRAITS,
  STEP_LABELS,
  INITIAL_WIZARD_STATE,
  isStepValid,
  canProceedToStep,
  type WizardState,
  type WizardStep,
  type TraitsState,
} from '@/components/mint/wizard-types';

// ── Constants ──────────────────────────────────────────────────────────────

describe('wizard-types constants', () => {
  it('TRAIT_KEYS has all 6 HEXACO dimensions', () => {
    expect(TRAIT_KEYS).toHaveLength(6);
    expect(TRAIT_KEYS).toEqual([
      'honestyHumility', 'emotionality', 'extraversion',
      'agreeableness', 'conscientiousness', 'openness',
    ]);
  });

  it('TRAIT_LABELS has a label for every trait key', () => {
    for (const key of TRAIT_KEYS) {
      expect(TRAIT_LABELS[key]).toBeDefined();
      expect(typeof TRAIT_LABELS[key]).toBe('string');
      expect(TRAIT_LABELS[key].length).toBeGreaterThan(0);
    }
  });

  it('TRAIT_TOOLTIPS has a tooltip for every trait key', () => {
    for (const key of TRAIT_KEYS) {
      expect(TRAIT_TOOLTIPS[key]).toBeDefined();
      expect(typeof TRAIT_TOOLTIPS[key]).toBe('string');
    }
  });

  it('DEFAULT_TRAITS values are all between 0 and 1', () => {
    for (const key of TRAIT_KEYS) {
      const value = DEFAULT_TRAITS[key];
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('STEP_LABELS covers steps 1-6', () => {
    for (let i = 1; i <= 6; i++) {
      expect(STEP_LABELS[i as WizardStep]).toBeDefined();
      expect(typeof STEP_LABELS[i as WizardStep]).toBe('string');
    }
  });
});

// ── Initial state ──────────────────────────────────────────────────────────

describe('INITIAL_WIZARD_STATE', () => {
  it('starts at step 1', () => {
    expect(INITIAL_WIZARD_STATE.step).toBe(1);
  });

  it('has default display name', () => {
    expect(INITIAL_WIZARD_STATE.displayName).toBe('New Agent');
  });

  it('has no preset selected', () => {
    expect(INITIAL_WIZARD_STATE.selectedPreset).toBeNull();
  });

  it('does not hide owner by default', () => {
    expect(INITIAL_WIZARD_STATE.hideOwner).toBe(false);
  });

  it('has default traits', () => {
    expect(INITIAL_WIZARD_STATE.traits).toEqual(DEFAULT_TRAITS);
  });

  it('has empty skills, channels, provider', () => {
    expect(INITIAL_WIZARD_STATE.selectedSkills).toEqual([]);
    expect(INITIAL_WIZARD_STATE.selectedChannels).toEqual([]);
    expect(INITIAL_WIZARD_STATE.selectedProvider).toBeNull();
  });

  it('has empty signer pubkey', () => {
    expect(INITIAL_WIZARD_STATE.agentSignerPubkey).toBe('');
  });

  it('defaults to managed hosting', () => {
    expect(INITIAL_WIZARD_STATE.hostingMode).toBe('managed');
  });

  it('is not minting', () => {
    expect(INITIAL_WIZARD_STATE.isMinting).toBe(false);
    expect(INITIAL_WIZARD_STATE.mintError).toBeNull();
    expect(INITIAL_WIZARD_STATE.mintSig).toBeNull();
    expect(INITIAL_WIZARD_STATE.mintedAgentPda).toBeNull();
  });

  it('has idle post-mint states', () => {
    expect(INITIAL_WIZARD_STATE.metadataPin).toEqual({ state: 'idle' });
    expect(INITIAL_WIZARD_STATE.managedHosting).toEqual({ state: 'idle' });
    expect(INITIAL_WIZARD_STATE.credentialSubmission).toEqual({ state: 'idle' });
  });
});

// ── isStepValid ────────────────────────────────────────────────────────────

describe('isStepValid', () => {
  const baseState: WizardState = { ...INITIAL_WIZARD_STATE };

  it('step 1: valid with non-empty name', () => {
    expect(isStepValid({ ...baseState, displayName: 'Test Agent' }, 1)).toBe(true);
  });

  it('step 1: invalid with empty name', () => {
    expect(isStepValid({ ...baseState, displayName: '' }, 1)).toBe(false);
    expect(isStepValid({ ...baseState, displayName: '   ' }, 1)).toBe(false);
  });

  it('step 1: invalid if name exceeds 32 UTF-8 bytes', () => {
    // Each emoji is 4 bytes UTF-8, 9 emojis = 36 bytes > 32
    const longName = '\u{1F600}'.repeat(9);
    expect(isStepValid({ ...baseState, displayName: longName }, 1)).toBe(false);
  });

  it('step 1: valid with exactly 32 UTF-8 bytes', () => {
    // 32 ASCII chars = exactly 32 bytes
    const exactName = 'a'.repeat(32);
    expect(isStepValid({ ...baseState, displayName: exactName }, 1)).toBe(true);
  });

  it('step 2: always valid (personality has defaults)', () => {
    expect(isStepValid(baseState, 2)).toBe(true);
  });

  it('step 3: always valid (skills/channels are optional)', () => {
    expect(isStepValid(baseState, 3)).toBe(true);
  });

  it('step 4: always valid (credentials can be added later)', () => {
    expect(isStepValid(baseState, 4)).toBe(true);
  });

  it('step 5: valid with non-empty signer pubkey', () => {
    expect(isStepValid({ ...baseState, agentSignerPubkey: 'SomeBase58Pubkey' }, 5)).toBe(true);
  });

  it('step 5: invalid with empty signer pubkey', () => {
    expect(isStepValid({ ...baseState, agentSignerPubkey: '' }, 5)).toBe(false);
    expect(isStepValid({ ...baseState, agentSignerPubkey: '   ' }, 5)).toBe(false);
  });

  it('step 6: always valid', () => {
    expect(isStepValid(baseState, 6)).toBe(true);
  });
});

// ── canProceedToStep ───────────────────────────────────────────────────────

describe('canProceedToStep', () => {
  const baseState: WizardState = { ...INITIAL_WIZARD_STATE };

  it('can always proceed to step 1', () => {
    expect(canProceedToStep(baseState, 1)).toBe(true);
  });

  it('can proceed to step 2 if step 1 is valid (name present)', () => {
    expect(canProceedToStep(baseState, 2)).toBe(true);
  });

  it('cannot proceed to step 2 if name is empty', () => {
    expect(canProceedToStep({ ...baseState, displayName: '' }, 2)).toBe(false);
  });

  it('can proceed to step 5 if earlier steps are valid', () => {
    expect(canProceedToStep(baseState, 5)).toBe(true);
  });

  it('cannot proceed to step 6 if signer pubkey is empty', () => {
    // Steps 1-4 valid, but step 5 invalid (empty signer)
    expect(canProceedToStep(baseState, 6)).toBe(false);
  });

  it('can proceed to step 6 with valid signer', () => {
    const withSigner = { ...baseState, agentSignerPubkey: 'ABC123' };
    expect(canProceedToStep(withSigner, 6)).toBe(true);
  });
});
