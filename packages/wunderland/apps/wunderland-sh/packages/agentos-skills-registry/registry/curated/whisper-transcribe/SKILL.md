---
name: whisper-transcribe
version: '1.0.0'
description: Transcribe audio and video files to text using OpenAI Whisper or compatible speech-to-text APIs.
author: Wunderland
namespace: wunderland
category: media
tags: [transcription, whisper, speech-to-text, audio, stt, voice]
requires_secrets: [openai.api_key]
requires_tools: [filesystem]
metadata:
  agentos:
    emoji: "\U0001F399\uFE0F"
    primaryEnv: OPENAI_API_KEY
    homepage: https://platform.openai.com/docs/guides/speech-to-text
    requires:
      anyBins: ['ffmpeg', 'ffprobe']
    install:
      - id: brew-ffmpeg
        kind: brew
        formula: ffmpeg
        bins: ['ffmpeg', 'ffprobe']
        label: 'Install ffmpeg (brew)'
      - id: apt-ffmpeg
        kind: apt
        package: ffmpeg
        bins: ['ffmpeg', 'ffprobe']
        os: ['linux']
        label: 'Install ffmpeg (apt)'
---

# Audio Transcription with Whisper

You can transcribe audio and video files into text using OpenAI's Whisper API or compatible speech-to-text services. Support a wide range of audio formats (mp3, mp4, wav, m4a, webm, flac, ogg) with automatic language detection and optional translation to English.

When transcribing, first check the file format and size. If the file exceeds the API's size limit (25MB for OpenAI Whisper), use `ffmpeg` to split it into smaller segments or compress it. For video files, extract the audio track with `ffmpeg` before sending to the transcription API. Always inform the user of the detected language and confidence level.

Present transcription results in a clean, readable format. For long recordings, add timestamps at regular intervals or at natural paragraph breaks. Support different output formats: plain text, SRT subtitles, VTT captions, and timestamped segments. When the user requests a summary alongside the transcription, provide both the full transcript and a concise summary.

For multi-speaker recordings, attempt speaker diarization when the API supports it, or offer to label speakers manually based on context. Handle background noise and poor audio quality gracefully -- flag low-confidence segments rather than silently producing incorrect text. Support batch transcription of multiple files in a directory.

## Examples

- "Transcribe this meeting recording: /path/to/meeting.mp3"
- "Create SRT subtitles for this video file"
- "Transcribe and summarize this 2-hour podcast episode"
- "Transcribe all .wav files in the interviews/ directory"
- "Translate this Spanish audio recording to English text"

## Constraints

- Maximum file size for OpenAI Whisper API: 25MB per request. Use ffmpeg to split larger files.
- Supported audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, flac, ogg.
- Transcription accuracy depends on audio quality, background noise, and speaker clarity.
- Speaker diarization (who said what) is not natively supported by all APIs and may require post-processing.
- Real-time/streaming transcription is not supported; only file-based transcription.
- API costs apply per minute of audio transcribed.
- ffmpeg is required for audio conversion, splitting, and video audio extraction.
