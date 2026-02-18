/**
 * @fileoverview TTS Module Exports
 * @module @framers/rabbithole/tts
 */

// Types
export type {
    TTSProvider,
    TTSAudioFormat,
    TTSQualityTier,
    TTSVoice,
    TTSSpeechOptions,
    TTSProviderConfig,
    OpenAITTSConfig,
    ElevenLabsConfig,
    EdgeTTSConfig,
    BrowserTTSConfig,
    MockTTSConfig,
    TTSConfig,
    TTSResult,
    TTSStreamChunk,
    ITTSService,
    TTSProviderPriority,
    TTSManagerConfig,
    TTSEvents,
} from './types.js';

// Constants
export {
    OPENAI_VOICES,
    EDGE_TTS_VOICES,
    DEFAULT_FORMAT_BY_PROVIDER,
} from './types.js';

// Service implementations
export {
    BaseTTSProvider,
    OpenAITTSProvider,
    MockTTSProvider,
    TTSService,
    createOpenAITTSService,
    createMockTTSService,
} from './TTSService.js';
