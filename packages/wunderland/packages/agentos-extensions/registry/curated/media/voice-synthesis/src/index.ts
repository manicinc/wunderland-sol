/**
 * Voice Synthesis Extension Pack — ElevenLabs TTS for agents.
 */

import { TextToSpeechTool } from './tools/textToSpeech.js';

export interface VoiceSynthesisExtensionOptions {
  elevenLabsApiKey?: string;
  priority?: number;
}

export function createExtensionPack(context: any) {
  const options = (context.options || {}) as VoiceSynthesisExtensionOptions;
  const apiKey = options.elevenLabsApiKey || context.getSecret?.('elevenlabs.apiKey') || process.env.ELEVENLABS_API_KEY;
  const tool = new TextToSpeechTool(apiKey);

  return {
    name: '@framers/agentos-ext-voice-synthesis',
    version: '1.0.0',
    descriptors: [
      // Keep descriptor id aligned with `tool.name` so ToolExecutor can find it.
      { id: tool.name, kind: 'tool' as const, priority: options.priority || 50, payload: tool, requiredSecrets: [{ id: 'elevenlabs.apiKey' }] },
    ],
    onActivate: async () => context.logger?.info('Voice Synthesis Extension activated'),
    onDeactivate: async () => context.logger?.info('Voice Synthesis Extension deactivated'),
  };
}

export { TextToSpeechTool };
export type { TTSInput, TTSOutput } from './tools/textToSpeech.js';
export default createExtensionPack;
