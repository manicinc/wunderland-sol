import { useReducer } from 'react';
import {
  type WizardState,
  type WizardAction,
  INITIAL_WIZARD_STATE,
} from './wizard-types';

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };

    case 'SELECT_PRESET':
      return {
        ...state,
        selectedPreset: action.preset,
        displayName: action.preset.name,
        traits: { ...action.preset.traits },
        selectedSkills: [...action.preset.suggestedSkills],
        selectedChannels: [...action.preset.suggestedChannels],
        selectedProvider: null,
        credentialValues: {},
      };

    case 'CLEAR_PRESET':
      return { ...state, selectedPreset: null };

    case 'SET_DISPLAY_NAME':
      return { ...state, displayName: action.name };

    case 'SET_HIDE_OWNER':
      return { ...state, hideOwner: action.hide };

    case 'SET_TRAIT':
      return {
        ...state,
        traits: { ...state.traits, [action.key]: action.value },
      };

    case 'SET_TRAITS':
      return { ...state, traits: { ...action.traits } };

    case 'TOGGLE_SKILL': {
      const exists = state.selectedSkills.includes(action.name);
      return {
        ...state,
        selectedSkills: exists
          ? state.selectedSkills.filter((s) => s !== action.name)
          : [...state.selectedSkills, action.name],
      };
    }

    case 'TOGGLE_CHANNEL': {
      const exists = state.selectedChannels.includes(action.platform);
      return {
        ...state,
        selectedChannels: exists
          ? state.selectedChannels.filter((c) => c !== action.platform)
          : [...state.selectedChannels, action.platform],
      };
    }

    case 'SET_PROVIDER':
      return { ...state, selectedProvider: action.providerId };

    case 'SET_CREDENTIAL':
      return {
        ...state,
        credentialValues: { ...state.credentialValues, [action.key]: action.value },
      };

    case 'SET_SIGNER_PUBKEY':
      return { ...state, agentSignerPubkey: action.pubkey };

    case 'SET_GENERATED_SIGNER':
      return {
        ...state,
        generatedSigner: action.signer,
        agentSignerPubkey: action.signer?.publicKey.toBase58() ?? state.agentSignerPubkey,
      };

    case 'SET_HOSTING_MODE':
      return { ...state, hostingMode: action.mode };

    case 'START_MINT':
      return {
        ...state,
        isMinting: true,
        mintError: null,
        mintSig: null,
        mintedAgentPda: null,
        metadataPin: { state: 'idle' },
        managedHosting: { state: 'idle' },
        credentialSubmission: { state: 'idle' },
      };

    case 'MINT_SUCCESS':
      return {
        ...state,
        isMinting: false,
        mintSig: action.sig,
        mintedAgentPda: action.agentPda,
      };

    case 'MINT_ERROR':
      return { ...state, isMinting: false, mintError: action.error };

    case 'SET_METADATA_PIN':
      return { ...state, metadataPin: action.pin };

    case 'SET_MANAGED_HOSTING':
      return { ...state, managedHosting: action.hosting };

    case 'SET_CREDENTIAL_SUBMISSION':
      return { ...state, credentialSubmission: action.submission };

    case 'RESET_MINT':
      return {
        ...state,
        isMinting: false,
        mintError: null,
        mintSig: null,
        mintedAgentPda: null,
        metadataPin: { state: 'idle' },
        managedHosting: { state: 'idle' },
        credentialSubmission: { state: 'idle' },
      };

    case 'APPLY_NL_RECOMMENDATIONS': {
      const next = { ...state };
      if (action.traits) next.traits = { ...action.traits };
      if (action.displayName) next.displayName = action.displayName;
      if (action.skills) {
        // Merge: add new skills, keep existing
        const merged = new Set([...next.selectedSkills, ...action.skills]);
        next.selectedSkills = [...merged];
      }
      if (action.channels) {
        const merged = new Set([...next.selectedChannels, ...action.channels]);
        next.selectedChannels = [...merged];
      }
      return next;
    }

    default:
      return state;
  }
}

export function useMintWizard() {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE);
  return { state, dispatch } as const;
}
