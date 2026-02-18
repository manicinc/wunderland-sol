# Text-to-Speech (Read Aloud) Guide

Quarry Codex now includes free, client-side text-to-speech functionality! Listen to your knowledge base read aloud with beautiful retro-futuristic audio controls.

## Features

### 🎙️ Core Capabilities
- **Read Entire Files**: Click play to hear the full content of any markdown file
- **Smart Text Processing**: Automatically removes markdown syntax, URLs, and formatting for natural speech
- **Multiple Voices**: Choose from system voices (availability depends on your OS/browser)
- **Speed Control**: Adjust reading speed from 0.5x to 2x
- **Pitch Control**: Modify voice pitch from 0 to 2
- **Volume Control**: Full volume control with mute/unmute
- **Progress Tracking**: Visual progress ring shows how far through the content you are

### 🎨 Beautiful Controls
- **Radial Progress Ring**: Animated circular progress indicator around play button
- **Theme Support**: Matches all Codex themes (Terminal, Sepia, Light, Dark)
- **Settings Panel**: Expandable panel for voice selection and fine-tuning
- **Keyboard Accessible**: All controls keyboard-navigable

### 🔒 Privacy & Performance
- **100% Client-Side**: Uses browser's Web Speech API
- **No API Keys**: Completely free, no accounts needed
- **Works Offline**: Once the page loads, TTS works without internet
- **No Tracking**: Zero external requests, all processing in-browser
- **Zero Cost**: No usage limits or quotas

## How to Use

### Basic Usage

1. **Open any file** in Quarry Codex
2. **Click the Play button** in the toolbar (circular button with play icon)
3. **Listen** as the content is read aloud
4. **Use pause/stop** controls to manage playback

### Advanced Controls

1. **Click the Settings icon** (gear) next to the audio controls
2. **Select a voice** from the dropdown (options vary by system)
3. **Adjust speed** using the speed slider (0.5x = slower, 2x = faster)
4. **Adjust volume** using the volume slider or click mute/unmute
5. **Adjust pitch** to make the voice higher or lower

### Keyboard Shortcuts

While the TTS is playing:
- **Space**: Pause/Resume (when TTS panel is focused)
- **Esc**: Stop reading
- **Tab**: Navigate through TTS controls

## Browser Support

Text-to-Speech works in most modern browsers:

| Browser | Support | Voices |
|---------|---------|--------|
| **Chrome/Edge** | ✅ Excellent | 50+ voices (varies by OS) |
| **Firefox** | ✅ Good | 10-20 voices |
| **Safari** | ✅ Good | 30+ voices (macOS/iOS) |
| **Opera** | ✅ Good | Similar to Chrome |

### Voice Availability by Operating System

- **Windows 10/11**: Microsoft voices (David, Zira, Mark, etc.)
- **macOS**: Apple voices (Alex, Samantha, Victoria, etc.)
- **Linux**: espeak voices (varies by distribution)
- **Android**: Google TTS voices
- **iOS**: Siri voices (various languages)

## Tips & Tricks

### Get Better Audio Quality

1. **Choose high-quality voices**: Look for "Premium" or "HD" in voice names
2. **Adjust speed carefully**: Too fast (>1.5x) can reduce clarity
3. **Use headphones**: For longer listening sessions

### Reading Long Documents

- TTS automatically handles very long content
- Progress ring shows approximate position
- You can pause and resume at any time
- Content is chunked automatically for smooth playback

### Multiple Languages

If you have non-English content:
1. Open Settings panel
2. Select a voice that matches the content language
3. Most systems include voices for major languages

## Technical Details

### Web Speech API

Quarry Codex uses the browser's native `SpeechSynthesis` API:
- No external dependencies
- Hardware-accelerated on supported devices
- Uses system TTS engine

### Text Processing

Before reading, content is automatically cleaned:
- Markdown syntax removed (`**bold**` → bold)
- Links extracted (`[text](url)` → text)
- Code blocks skipped
- List markers removed
- YAML frontmatter excluded

### Performance

- **Initial load**: < 100ms to initialize
- **Voice loading**: 0-2 seconds (system-dependent)
- **Start latency**: < 500ms from click to speech
- **Memory usage**: Minimal (~5-10 MB)

## Troubleshooting

### "Text-to-speech not supported"
- **Solution**: Update your browser to the latest version
- **Fallback**: Try Chrome/Edge which have best support

### No voices available
- **Windows**: Install additional voices in Settings > Time & Language > Speech
- **macOS**: Install voices in System Preferences > Accessibility > Spoken Content
- **Linux**: Install espeak or festival packages

### Voice sounds robotic
- **Try**: Select a different voice from the settings
- **Tip**: "Premium" or "Neural" voices sound more natural
- **Adjust**: Lower the speed to 0.8x or 0.9x for clearer pronunciation

### Pausing doesn't work
- **Refresh**: Some browsers require page refresh after first use
- **Click stop then play**: Restart the reading

### Reading stops mid-content
- **Long content**: Some browsers limit utterance length
- **Automatic**: The hook handles this automatically by chunking
- **If persists**: Try a different browser

## Examples

### Read Selection
```typescript
// You can also programmatically read selected text
const { readSelection } = useTextToSpeech()
readSelection() // Reads currently selected text
```

### Read Specific Element
```typescript
// Read content of a specific element
const { readElement } = useTextToSpeech()
readElement('my-content-div')
```

### Custom Integration
```typescript
import { useTextToSpeech } from '@/components/quarry/hooks/useTextToSpeech'

function MyComponent() {
  const tts = useTextToSpeech()
  
  return (
    <button onClick={() => tts.speak("Hello, Quarry Codex!")}>
      Say Hello
    </button>
  )
}
```

## Future Enhancements

Planned improvements:
- [ ] Highlight current sentence being read
- [ ] Skip forward/backward by paragraph
- [ ] Save voice preferences
- [ ] Export as audio file (MP3)
- [ ] Queue multiple files
- [ ] Speed presets (slow, normal, fast)

---

**Enjoy hands-free knowledge exploration!** 🎧

For questions or feedback, visit [Quarry Codex](https://frame.dev/codex) or open an issue on GitHub.

