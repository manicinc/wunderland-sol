// File: frontend/src/components/voice-input/README.md

# Voice Input Module

This module encapsulates all functionalities related to voice and text input for the application, including Speech-to-Text (STT) handling, voice visualization, UI effects, and input mode management.

## Structure

-   **`VoiceInput.vue`**: The main UI component that orchestrates all sub-components and composables.
-   **`composables/`**: Contains Vue 3 composables for managing specific logic:
    -   `useSttHandlerManager.ts`: Manages the lifecycle and interaction with different STT handlers (Browser Web Speech, Whisper). Handles STT state, mode changes, and event communication.
    -   `useVoiceInputEffects.ts`: Manages visual effects for the input panel, including geometric background patterns, state-based gradients, and "listening but ignoring" text animations.
-   **`handlers/`**: Contains the actual STT implementation components:
    -   `BrowserSpeechHandler.vue`: Implements STT using the browser's Web Speech API.
    -   `WhisperSpeechHandler.vue`: Implements STT using the OpenAI Whisper API (via backend).
-   **`components/`**: Contains smaller UI components used within `VoiceInput.vue`:
    -   `AudioModeDropdown.vue`: Dropdown for selecting PTT, Continuous, or VAD modes.
    -   `InputToolbar.vue`: Floating toolbar for file uploads, STT engine selection, etc.
-   **`visualizations/`**: (If `useVoiceVisualization` and `VoiceVisualizationCanvas` are moved here)
    -   `VoiceVisualizationCanvas.vue`: Dedicated component for rendering voice visualizations.
    -   `useVoiceVisualization.ts`: Composable for managing voice visualization logic.
-   **`styles/`**: Contains SCSS files for styling the module:
    -   `voice-input.scss`: Main styles for `VoiceInput.vue` and its sub-components.
    -   May include partials like `_animations.scss`, `_effects.scss`, `_geometric-patterns.scss` if complexity grows.
-   **`types/`**: TypeScript type definitions specific to this module.
-   **`utils/`**: Utility functions or constants.
-   **`index.ts`**: Exports the main `VoiceInput.vue` component and any other necessary parts for easy import.

## Core Features

-   **Multi-Modal Input**: Supports Push-to-Talk (PTT), Continuous Listening, and Voice Activation (VAD) modes.
-   **Switchable STT Engines**: Allows dynamic switching between Browser Web Speech API and Whisper API.
-   **Dynamic Visual Feedback**:
    -   Subtle geometric background patterns that react to state.
    -   Dynamic background gradients reflecting the current operational state (idle, listening, processing).
    -   "Listening but ignoring" effect: When the main LLM is processing, incoming voice input is visually acknowledged (muted waveform, briefly shown then faded text) but not sent for transcription.
    -   Voice waveform/frequency visualization.
-   **Holographic Input Toolbar**: A floating toolbar for actions like file upload and STT engine selection.
-   **State Management**: Clear internal state management for different input modes and processing states.
-   **Event-Driven Communication**: Composables and handlers communicate via well-defined events.
-   **Customizable Styling**: Leverages SCSS and CSS custom properties for theme alignment.

## Usage

Import the main `VoiceInput` component from `frontend/src/components/voice-input` (or `frontend/src/components/voice-input/index.ts`).

```vue
<template>
    <VoiceInput
        :is-processing="isLLMProcessing"
        @transcription="handleNewTranscription"
        @permission-update="handleMicPermissionUpdate"
        @processing-audio="handleAudioProcessingState"
    />
</template>

<script setup lang="ts">
import VoiceInput from '@/components/voice-input/VoiceInput.vue'; // Or from './index.ts'
import { ref } from 'vue';

const isLLMProcessing = ref(false);

function handleNewTranscription(text: string) {
    console.log('New transcription:', text);
    // Send to LLM or handle as needed
}

function handleMicPermissionUpdate(status: string) {
    console.log('Mic permission status:', status);
}

function handleAudioProcessingState(isProcessing: boolean) {
    console.log('Voice input processing audio:', isProcessing);
}
</script>
```

Key Design Principles

    Modularity: Separating concerns into composables and sub-components for better maintainability and testability.
    Reactivity: Leveraging Vue 3's Composition API for reactive state management.
    User Experience: Providing clear visual feedback for all states and interactions, aligning with the "Ephemeral Harmony" design system.
    No Unwanted Panel Movement: Visual effects are confined to backgrounds, internal elements, or dedicated canvases, avoiding scaling or zooming of the main input panel.

Styling

The primary styling is handled by styles/voice-input.scss. It uses CSS custom properties defined in the global theme files for easy theming. Specific animations and effects might be in separate SCSS partials within the styles directory.
The geometric patterns are SVG-based and styled via CSS for theme adaptability.


```typescript
// File: frontend/src/components/voice-input/index.ts

/**
 * @file index.ts
 * @description Main export for the VoiceInput module.
 * This allows for cleaner imports of the VoiceInput component.
 */

import VoiceInput from './VoiceInput.vue';

export { VoiceInput };

export default VoiceInput;

// Optionally, if other components or types from this module need to be exposed publicly:
// export * from './types/voice-input.types';
// export { default as InputToolbar } from './components/InputToolbar.vue';
```
