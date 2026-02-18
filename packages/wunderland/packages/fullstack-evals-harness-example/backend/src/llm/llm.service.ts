import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SettingsService, LlmSettings } from '../settings/settings.service';

/**
 * LLM provider types supported by the harness.
 */
export type LlmProvider = 'openai' | 'anthropic' | 'ollama';

/**
 * Options for completion requests.
 * Provider/model/apiKey/baseUrl allow per-candidate overrides of global settings.
 */
export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  provider?: LlmProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * LLM service provides a unified interface for text completion and embeddings.
 * Reads configuration from database settings (live updates from Settings page).
 *
 * Supports OpenAI, Anthropic, and Ollama (local).
 */
@Injectable()
export class LlmService {
  constructor(
    @Inject(forwardRef(() => SettingsService))
    private settingsService: SettingsService
  ) {}

  /**
   * Get current LLM settings from database.
   */
  private async getSettings(): Promise<LlmSettings> {
    return this.settingsService.getLlmSettings();
  }

  /**
   * Generate a text completion using the configured provider.
   * Per-candidate overrides (provider, model, apiKey, baseUrl) take precedence over global settings.
   */
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const globalSettings = await this.getSettings();

    // Merge per-candidate overrides with global settings
    const settings: LlmSettings = {
      ...globalSettings,
      ...(options.provider && { provider: options.provider }),
      ...(options.model && { model: options.model }),
      ...(options.apiKey && { apiKey: options.apiKey }),
      ...(options.baseUrl && { baseUrl: options.baseUrl }),
    };

    const temperature = options.temperature ?? settings.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? settings.maxTokens ?? 1024;
    const systemPrompt = options.systemPrompt;

    if (settings.provider === 'ollama') {
      return this.completeOllama(settings, prompt, { temperature, maxTokens, systemPrompt });
    } else if (settings.provider === 'anthropic') {
      return this.completeAnthropic(settings, prompt, { temperature, maxTokens, systemPrompt });
    } else {
      return this.completeOpenAI(settings, prompt, { temperature, maxTokens, systemPrompt });
    }
  }

  /**
   * Generate embeddings for text. Used by semantic similarity grader.
   */
  async embed(text: string): Promise<number[]> {
    const settings = await this.getSettings();

    if (settings.provider === 'ollama') {
      return this.embedOllama(settings, text);
    } else if (settings.provider === 'anthropic') {
      // Anthropic doesn't have embeddings, use a fallback LLM-based approach
      return this.embedViaLlm(settings, text);
    } else {
      return this.embedOpenAI(settings, text);
    }
  }

  /**
   * Get current provider info for debugging/display.
   */
  async getProviderInfo(): Promise<{ provider: string; model: string; baseUrl?: string }> {
    const settings = await this.getSettings();
    return {
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
    };
  }

  /**
   * Get full LLM settings for graders that need provider config.
   */
  async getFullSettings(): Promise<LlmSettings> {
    return this.getSettings();
  }

  // OpenAI implementation
  private async completeOpenAI(
    settings: LlmSettings,
    prompt: string,
    options: { temperature: number; maxTokens: number; systemPrompt?: string }
  ): Promise<string> {
    if (!settings.apiKey) {
      throw new Error('OpenAI API key not configured. Go to Settings to add your API key.');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4.1',
        messages,
        temperature: options.temperature,
        // GPT-5.x and o-series models require max_completion_tokens
        ...(/^(gpt-5|o[1-9])/.test(settings.model || '')
          ? { max_completion_tokens: options.maxTokens }
          : { max_tokens: options.maxTokens }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async embedOpenAI(settings: LlmSettings, text: string): Promise<number[]> {
    if (!settings.apiKey) {
      throw new Error('OpenAI API key not configured. Go to Settings to add your API key.');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  // Anthropic implementation
  private async completeAnthropic(
    settings: LlmSettings,
    prompt: string,
    options: { temperature: number; maxTokens: number; systemPrompt?: string }
  ): Promise<string> {
    if (!settings.apiKey) {
      throw new Error('Anthropic API key not configured. Go to Settings to add your API key.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings.model || 'claude-sonnet-4-5-20250929',
        max_tokens: options.maxTokens,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic error: ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Fallback embedding via LLM for providers without native embedding support.
   * Uses LLM to generate a fixed-length numerical representation.
   */
  private async embedViaLlm(settings: LlmSettings, text: string): Promise<number[]> {
    const prompt = `Generate a semantic fingerprint for the following text as a JSON array of exactly 64 numbers between -1 and 1.
The numbers should capture the semantic meaning of the text.
Respond with ONLY the JSON array, no other text.

Text: "${text.substring(0, 500)}"`;

    const response = await this.completeAnthropic(settings, prompt, {
      temperature: 0,
      maxTokens: 500,
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      const embedding = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(embedding) || embedding.length !== 64) {
        throw new Error('Invalid embedding format');
      }
      return embedding.map((n: unknown) => (typeof n === 'number' ? n : 0));
    } catch {
      // Return a simple hash-based embedding as fallback
      return this.simpleHashEmbedding(text, 64);
    }
  }

  /**
   * Simple hash-based embedding fallback.
   */
  private simpleHashEmbedding(text: string, dimensions: number): number[] {
    const embedding = new Array(dimensions).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const index = (charCode * (i + 1)) % dimensions;
      embedding[index] += (charCode - 96) / 26;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  // Ollama implementation
  private async completeOllama(
    settings: LlmSettings,
    prompt: string,
    options: { temperature: number; maxTokens: number; systemPrompt?: string }
  ): Promise<string> {
    const baseUrl = settings.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.model || 'dolphin-llama3:8b',
        prompt: options.systemPrompt ? `${options.systemPrompt}\n\n${prompt}` : prompt,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${error}`);
    }

    const data = await response.json();
    return data.response;
  }

  private async embedOllama(settings: LlmSettings, text: string): Promise<number[]> {
    const baseUrl = settings.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.model || 'dolphin-llama3:8b',
        prompt: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embedding error: ${error}`);
    }

    const data = await response.json();
    return data.embedding;
  }
}
