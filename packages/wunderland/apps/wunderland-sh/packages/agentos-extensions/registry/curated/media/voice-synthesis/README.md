# Voice Synthesis Extension for AgentOS

Text-to-speech synthesis using ElevenLabs with 8 predefined voices.

## Installation

```bash
npm install @framers/agentos-ext-voice-synthesis
```

## Configuration

Set `ELEVENLABS_API_KEY` environment variable or pass via options.

## Tool: text_to_speech

**Input:**
- `text` (string, required) — Text to convert (max 5000 chars)
- `voice` (string, default: rachel) — Voice: rachel, domi, bella, antoni, josh, arnold, adam, sam
- `model` (string, default: eleven_monolingual_v1) — ElevenLabs model
- `stability` (number, 0-1, default: 0.5) — Voice stability
- `similarity_boost` (number, 0-1, default: 0.75) — Voice similarity

**Output:** Base64-encoded MP3 audio with duration estimate.

## License

MIT - Frame.dev
