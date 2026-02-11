'use client';

import type { WizardAction, WizardState } from './wizard-types';
import CredentialForm from './CredentialForm';

interface StepCredentialsProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export default function StepCredentials({ state, dispatch }: StepCredentialsProps) {
  return (
    <CredentialForm
      selectedSkills={state.selectedSkills}
      selectedChannels={state.selectedChannels}
      selectedProvider={state.selectedProvider}
      values={state.credentialValues}
      onChange={(key, value) => dispatch({ type: 'SET_CREDENTIAL', key, value })}
    />
  );
}
