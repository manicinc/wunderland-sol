import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { TextToSpeechTool } = await import('../src/tools/textToSpeech.js');
const { createExtensionPack } = await import('../src/index.js');

describe('TextToSpeechTool', () => {
  let tool: InstanceType<typeof TextToSpeechTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = new TextToSpeechTool('test-api-key');
  });

  describe('metadata', () => {
    it('has correct id and name', () => {
      expect(tool.id).toBe('elevenlabs-tts-v1');
      expect(tool.name).toBe('text_to_speech');
    });

    it('has valid input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('text');
    });

    it('has no side effects', () => {
      expect(tool.hasSideEffects).toBe(false);
    });
  });

  describe('execute', () => {
    const ctx = {} as any;

    it('returns error when API key is missing', async () => {
      const noKeyTool = new TextToSpeechTool('');
      const result = await noKeyTool.execute({ text: 'Hello' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ELEVENLABS_API_KEY');
    });

    it('synthesizes speech successfully', async () => {
      const mockAudio = new ArrayBuffer(100);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockAudio,
      });

      const result = await tool.execute({ text: 'Hello world' }, ctx);
      expect(result.success).toBe(true);
      expect(result.output!.voice).toBe('rachel');
      expect(result.output!.contentType).toBe('audio/mpeg');
      expect(result.output!.audioBase64).toBeTruthy();
      expect(result.output!.durationEstimateMs).toBeGreaterThan(0);
    });

    it('uses correct voice ID for named voice', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(10) });
      await tool.execute({ text: 'Test', voice: 'josh' }, ctx);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('TxGEqnHWrfWFTfGW9XjX'),
        expect.any(Object)
      );
    });

    it('truncates text to 5000 chars', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(10) });
      const longText = 'a'.repeat(6000);
      const result = await tool.execute({ text: longText }, ctx);
      expect(result.success).toBe(true);
      expect(result.output!.text.length).toBe(5000);
    });

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' });
      const result = await tool.execute({ text: 'Test' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));
      const result = await tool.execute({ text: 'Test' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });
  });
});

describe('createExtensionPack', () => {
  it('creates pack with correct metadata', () => {
    const pack = createExtensionPack({ options: { elevenLabsApiKey: 'test' }, logger: { info: vi.fn() } });
    expect(pack.name).toBe('@framers/agentos-ext-voice-synthesis');
    expect(pack.descriptors).toHaveLength(1);
  });
});
