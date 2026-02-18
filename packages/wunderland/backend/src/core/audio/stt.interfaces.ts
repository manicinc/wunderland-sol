// File: backend/src/core/audio/stt.interfaces.ts
/**
 * @file Defines interfaces for Speech-to-Text (STT) services.
 * @version 1.2.3 - Added ITranscriptionSegmentWord and refined segments in ITranscriptionResult.
 * @description This file contains type definitions for transcription results,
 * provider-specific responses, STT service options, and STT provider contracts.
 */

/**
 * @interface ITranscriptionSegmentWord
 * @description Represents a single word within a transcription segment, with timing.
 * Typically available when 'word' timestamp granularity is requested (e.g., Whisper).
 */
export interface ITranscriptionSegmentWord {
  /** * @property {string} word - The text of the transcribed word. 
   */
  word: string;
  /** * @property {number} start - Start time of the word in seconds from the beginning of the audio. 
   */
  start: number;
  /** * @property {number} end - End time of the word in seconds from the beginning of the audio. 
   */
  end: number;
  /** * @property {number} [confidence] - Confidence score for the word, if available (0.0 to 1.0). 
   * Not always provided by all STT engines or for all words.
   */
  confidence?: number;
}

/**
 * @interface ITranscriptionSegment
 * @description Represents a segment of transcribed audio, often with timing information.
 * This can be a sentence, a phrase, or a speaker-specific segment.
 */
export interface ITranscriptionSegment {
  /** * @property {string} text - The transcribed text of this segment. 
   */
  text: string;
  /** * @property {number} startTime - Start time of the segment in seconds from the beginning of the audio. 
   */
  startTime: number;
  /** * @property {number} endTime - End time of the segment in seconds from the beginning of the audio. 
   */
  endTime: number;
  /** * @property {number} [confidence] - Overall confidence score for this segment, if available (0.0 to 1.0). 
   */
  confidence?: number;
  /** * @property {(string | number)} [speaker] - Speaker ID or label, if speaker diarization is enabled and supported. 
   */
  speaker?: string | number;
  /**
   * @property {ITranscriptionSegmentWord[]} [words] - Array of individual words with their timings within this segment.
   * This is typically available if word-level timestamps were requested and are supported by the provider.
   */
  words?: ITranscriptionSegmentWord[];
  /**
   * @property {number} [id] - A unique identifier for the segment, often provided by the STT service.
   */
  id?: number;
   /**
   * @property {number} [seek] - Seek offset of the segment.
   */
  seek?: number;
  /**
   * @property {number[]} [tokens] - Array of token IDs for the segment.
   */
  tokens?: number[];
  /**
   * @property {number} [temperature] - Temperature used for decoding the segment.
   */
  temperature?: number;
  /**
   * @property {number} [avg_logprob] - Average log probability of the segment.
   */
  avg_logprob?: number;
  /**
   * @property {number} [compression_ratio] - Compression ratio of the segment.
   */
  compression_ratio?: number;
  /**
   * @property {number} [no_speech_prob] - Probability of the segment being speech vs. non-speech.
   */
  no_speech_prob?: number;
}

/**
 * @interface ITranscriptionResult
 * @description Represents the standardized result of a transcription operation from an STT provider.
 */
export interface ITranscriptionResult {
  /**
   * @property {string} text - The full transcribed text.
   */
  text: string;
  /**
   * @property {string} [language] - The language detected or used for transcription (e.g., 'en', 'es', 'auto').
   * This is often an ISO 639-1 code.
   */
  language?: string;
  /**
   * @property {number} [durationSeconds] - The duration of the transcribed audio in seconds. Optional.
   */
  durationSeconds?: number;
  /**
   * @property {number} cost - The calculated cost for this transcription in USD.
   */
  cost: number;
  /**
   * @property {ITranscriptionSegment[]} [segments] - Array of transcription segments.
   * Useful for detailed analysis, timestamped text, or speaker diarization. Provided by some STT services
   * like Whisper when `verbose_json` is used.
   */
  segments?: ITranscriptionSegment[];
  /**
   * @property {any} [providerResponse] - The raw, unparsed response from the STT provider.
   * Useful for debugging or accessing provider-specific information not mapped to this standardized interface.
   * Should be used with caution and type assertion.
   */
  providerResponse?: any;
  /**
   * @property {number} [confidence] - Overall confidence score for the entire transcription, if available (0.0 to 1.0).
   * Not all providers offer this at the full transcript level.
   */
  confidence?: number;
  /**
   * @property {boolean} [isFinal] - Indicates if the transcription is considered final or partial (e.g., for streaming STT).
   * Defaults to true for non-streaming services.
   */
  isFinal?: boolean;
  /**
   * @property {object} [usage] - Usage statistics for the STT operation.
   * @property {number} usage.durationMinutes - Duration of the audio in minutes.
   * @property {string} usage.modelUsed - Identifier of the STT model used.
   * @property {any} [usage.providerSpecific] - Any other provider-specific usage data.
   */
  usage?: {
    durationMinutes: number;
    modelUsed: string;
    providerSpecific?: { [key: string]: any };
  };
}

/**
 * @type SttResponseFormat
 * @description Defines the valid response formats for STT services, particularly for providers like OpenAI Whisper.
 * - `json`: Standard JSON object with the transcribed text.
 * - `text`: Plain text.
 * - `srt`: SubRip Subtitle format.
 * - `verbose_json`: JSON object with text, segments, and other details (like duration, language). Recommended for Whisper.
 * - `vtt`: WebVTT subtitle format.
 */
export type SttResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';


/**
 * @interface ISttOptions
 * @description Options for configuring an STT service request. This interface is expected by `ISttProvider.transcribe`.
 */
export interface ISttOptions {
  /**
   * @property {string} [language] - The language of the audio. Uses ISO 639-1 codes (e.g., 'en', 'es').
   * Providing this can improve accuracy. If omitted, providers like Whisper will auto-detect.
   * @example "en"
   */
  language?: string;
  /**
   * @property {string} [model] - The model to use for transcription, if the provider supports model selection.
   * @example "whisper-1"
   */
  model?: string;
  /**
   * @property {string} [prompt] - An optional text prompt to guide the STT model's transcription.
   * Can improve accuracy for specific jargon, names, or contexts.
   * For Whisper, this is a "previous transcript content" style prompt.
   */
  prompt?: string;
  /**
   * @property {SttResponseFormat} [responseFormat] - The desired format of the transcription response.
   * For OpenAI Whisper, `verbose_json` is recommended for detailed output including duration and segments.
   */
  responseFormat?: SttResponseFormat;
  /**
   * @property {number} [temperature] - For STT models like Whisper, controls randomness.
   * Higher values (e.g., 0.8) make output more random, lower (e.g., 0.2) more deterministic.
   * Default is typically 0.
   */
  temperature?: number;
  /**
   * @property {boolean} [enableSpeakerDiarization] - Whether to enable speaker diarization.
   * Support and implementation vary significantly by STT provider. Not directly supported by base Whisper API.
   */
  enableSpeakerDiarization?: boolean;
  /**
   * @property {number} [numSpeakers] - Expected number of speakers if diarization is enabled and supported.
   */
  numSpeakers?: number;
  /**
   * @property {object} [providerSpecificOptions] - Additional provider-specific options.
   * Use this to pass parameters unique to a certain STT service not covered by standard fields.
   * @example { "word_timestamps": true } // Example for a hypothetical provider
   * @example { "mimeType": "audio/webm" } // Can be used to pass MIME type if not in filename
   */
  providerSpecificOptions?: { [key: string]: any };
  /**
   * @property {string} [providerId] - Identifier for the target STT provider (e.g., 'whisper_api').
   */
  providerId?: string;
  /**
   * @property {boolean} [stream] - Whether streaming transcription is requested (if supported).
   */
  stream?: boolean;
}

/**
 * @interface ISttRequestOptions
 * @description Options received in an STT API request from the client (e.g., in `stt.routes.ts`).
 * This is slightly less strict than `ISttOptions` as it reflects raw client input before validation.
 */
export interface ISttRequestOptions {
  /**
   * @property {string} [language] - The language of the audio (ISO 639-1 code or BCP-47).
   */
  language?: string;
  /**
   * @property {string} [prompt] - Prompt/context for the STT service.
   */
  prompt?: string;
  /**
   * @property {string} [model] - Model to use for transcription.
   */
  model?: string;
  /**
   * @property {string} [responseFormat] - Client's preferred response format.
   * Needs validation to map to the stricter `SttResponseFormat`.
   */
  responseFormat?: string; // String to allow flexibility from client, validated in route
  /**
   * @property {string} [userId] - User ID for tracking or context, typically injected by auth middleware.
   */
  userId?: string; // Usually injected by middleware, but client might send for specific cases
  /**
   * @property {number} [temperature] - Temperature for the STT model (e.g., Whisper).
   * Client might send as string, needs conversion to number.
   */
  temperature?: number | string;
  /**
   * @property {string} [providerId] - Preferred STT provider identifier supplied by the client.
   */
  providerId?: string;
  /**
   * @property {boolean | string} [stream] - Whether streaming transcription is requested (string to allow form inputs).
   */
  stream?: boolean | string;
}

/**
 * @interface IAudioAnalysis
 * @description Represents the result of basic audio analysis, often performed pre-transcription.
 * This is a placeholder and can be expanded.
 */
export interface IAudioAnalysis {
  /** * @property {number} duration - Duration of the audio in seconds. 
   */
  duration: number;
  /** * @property {number} fileSize - File size in bytes. 
   */
  fileSize: number;
  /** * @property {number} estimatedCost - Estimated STT cost for this audio in USD. 
   */
  estimatedCost: number;
  /** * @property {boolean} isOptimal - Whether the audio is considered optimal for STT (e.g., format, clarity). 
   */
  isOptimal: boolean;
  /** * @property {string[]} recommendations - Recommendations for improving audio quality or reducing cost. 
   */
  recommendations: string[];
  /** * @property {string} [mimeType] - MIME type of the audio file (e.g., "audio/webm", "audio/mp3"). 
   */
  mimeType?: string;
}

/**
 * @interface ISttProvider
 * @description Defines the contract that all STT service provider implementations must adhere to.
 */
export interface ISttProvider {
  /**
   * Transcribes an audio buffer.
   * @param {Buffer} audioBuffer - The audio data to transcribe.
   * @param {string} originalFileName - The original name of the audio file, used for format hinting by the provider.
   * @param {ISttOptions} options - Configuration options for the transcription process.
   * @returns {Promise<ITranscriptionResult>} A promise that resolves with the standardized transcription result.
   * @throws {Error} If transcription fails due to API errors, configuration issues, unsupported formats, or other provider-specific problems.
   */
  transcribe(
    audioBuffer: Buffer,
    originalFileName: string,
    options: ISttOptions
  ): Promise<ITranscriptionResult>;

  /**
   * Gets the user-friendly name of the STT provider.
   * @returns {string} The provider's name (e.g., "OpenAI Whisper API", "Google Cloud Speech-to-Text").
   */
  getProviderName(): string;
}
