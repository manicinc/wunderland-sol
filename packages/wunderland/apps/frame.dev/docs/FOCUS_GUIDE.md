# Meditation & Deep Focus Mode Guide

The Meditation page in Quarry is a powerful productivity workspace designed for deep focus sessions. It combines ambient soundscapes, beautiful backgrounds, floating widgets, and a Pomodoro timer to create the ultimate distraction-free environment.

## Getting Started

Navigate to the Focus page from the sidebar by clicking **Focus** in the quick menu, or go directly to `/quarry/focus`.

## Deep Focus Mode

Deep Focus Mode transforms your entire screen into a distraction-free workspace. All browser chrome, sidebars, and UI elements fade away, leaving only your focus tools.

### Entering Deep Focus Mode

- **Keyboard shortcut**: `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Windows/Linux)
- **Button**: Click the maximize icon in the bottom toolbar

### Exiting Deep Focus Mode

- Press `Escape`
- Click the minimize button in the overlay
- Use the same keyboard shortcut to toggle

### What Changes in Deep Focus

- Browser URL bar and tabs are hidden (if supported)
- Sidebar navigation disappears
- Toolbar minimizes to essential controls
- Background becomes more prominent
- Widgets remain accessible

## Ambient Soundscapes

The Meditation page includes 7 synthesized ambient soundscapes to enhance your focus:

| Soundscape | Description | Best For |
|------------|-------------|----------|
| 🌧️ Rain | Gentle rain on window with occasional droplets | Deep work, writing |
| ☕ Café | Coffee shop ambience with distant chatter | Creative tasks, ideation |
| 🌲 Forest | Wind through trees, bird chirps | Reading, learning |
| 🌊 Ocean | Waves on the shore with deep rumble | Meditation, relaxation |
| 🔥 Fireplace | Crackling fire with pops | Cozy work sessions |
| 🎵 Lo-fi | Soft ambient chords with vinyl crackle | Coding, design |
| 📻 White Noise | Warm static background | Blocking distractions |

### Soundscape Controls

1. **Play/Pause**: Click the play button or press `Space` when focused
2. **Volume**: Adjust with the volume slider (0-100%)
3. **Select Soundscape**: Click the soundscape dropdown to switch
4. **Spatial Audio**: Sounds use stereo positioning for immersion

### Sleep Timer

Set a timer to automatically fade out the soundscape:

1. Click the timer icon in the toolbar
2. Select duration (15, 30, 45, 60 minutes)
3. Sound will gracefully fade when time expires

## Background Slideshow

Beautiful stock images from Pexels, Unsplash, Pixabay, and Giphy create a calming backdrop.

### Features

- **Auto-rotation**: Images fade between each other (default: 30 seconds)
- **Matched to Soundscape**: Each soundscape has curated images
- **Blur on Interaction**: Background blurs when interacting with widgets
- **Manual Navigation**: Use arrow buttons to skip images

### Customization

Access background settings via the image icon in the toolbar:

- **Interval**: How often images change (15s - 5min)
- **Transition**: Crossfade, blur-fade, or slide
- **Shuffle**: Randomize or play in order
- **Select Images**: Choose which images appear for each soundscape

### Attribution

All images are properly licensed. Click the info icon on any background to see:

- Photographer name and profile
- Source website
- License information
- Download option

## Floating Widgets

Spawn terminal-like floating windows for various productivity tools. Drag, resize, and arrange them to create your ideal workspace.

### Available Widgets

| Widget | Description |
|--------|-------------|
| 🍅 Pomodoro | Full-featured Pomodoro timer |
| ⏰ Clock | Current time and date display |
| 📊 Stats | Session statistics and streaks |
| 🎵 Ambience | Detailed soundscape controls |
| ▶️ YouTube | YouTube video player |
| 📝 Quick Capture | Quickly jot down notes |
| 🤖 AI Copilot | Chat with AI for productivity tips |

### Widget Controls

- **Spawn**: Open the widget dock and click a widget
- **Move**: Drag the window header
- **Resize**: Drag the bottom-right corner
- **Focus**: Click a window to bring it to front
- **Close**: Click the × button

### Widget Persistence

Widget positions are saved locally and restored when you return.

## Pomodoro Timer

The Pomodoro technique helps maintain focus through timed work sessions.

### Timer Modes

| Mode | Duration | Purpose |
|------|----------|---------|
| Focus | 25 min | Deep work session |
| Short Break | 5 min | Quick rest |
| Long Break | 15 min | Extended rest (after 4 sessions) |

### Controls

- **Start/Pause**: Begin or pause the timer
- **Reset**: Restart the current session
- **Skip**: Move to the next phase
- **Mode Pills**: Switch between Focus/Short/Long

### Session Tracking

- Sessions completed counter
- Current streak tracking
- Total focus time accumulated
- Statistics visible in Stats widget

### Integration with Soundscape

When a session completes:

1. A subtle notification plays
2. Soundscape optionally fades for break
3. Timer auto-advances to next phase (if enabled)

## Quick Capture

Capture ideas without leaving your flow state.

### Usage

1. Open the Quick Capture widget
2. Type or dictate your note
3. Click Save (or press `Cmd+Enter`)

### Where Notes Go

- Saved to `inbox/` folder automatically
- Notes are unorganized until you click "Publish"
- Uses local storage for fast saving
- No AI processing until published

### Voice Capture

If voice is enabled:

1. Click the microphone icon
2. Speak your note
3. Transcription appears automatically
4. Edit and save

## AI Copilot

Get productivity tips and assistance without breaking focus.

### Sample Prompts

- "Give me a motivational quote"
- "Suggest a 5-minute stretch routine"
- "What's a good focus technique?"
- "Help me break down this task"

### Configuration

The AI Copilot uses your configured AI provider (Settings > AI).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+F` | Toggle deep focus mode |
| `Space` | Play/pause soundscape (when focused) |
| `Escape` | Exit deep focus / close overlay |
| `Cmd+Enter` | Save quick capture note |
| `+` | Open widget dock |

## Voice Providers

Voice features support multiple providers:

| Provider | TTS | STT | Notes |
|----------|-----|-----|-------|
| Browser | ✅ | ✅ | Free, works offline |
| ElevenLabs | ✅ | ✅ | Premium quality, requires API key |
| OpenAI | ✅ | ✅ | Whisper STT is industry-leading |

Configure in Settings > Voice.

## Settings

Access Meditation settings via the gear icon:

### General

- **Auto-start Soundscape**: Play automatically on page load
- **Show Toolbar in Deep Focus**: Keep toolbar visible
- **Background Blur Intensity**: How much blur on interaction

### Pomodoro

- **Focus Duration**: Default work session length
- **Short Break Duration**: Quick break length
- **Long Break Duration**: Extended break length
- **Long Break Interval**: Sessions before long break
- **Auto-start Breaks**: Automatically begin breaks
- **Sound Notifications**: Play sounds on transitions

### Background

- **Slideshow Interval**: Time between images
- **Transition Style**: How images change
- **Shuffle Order**: Randomize images

## Tips for Maximum Focus

1. **Start with 25 minutes**: The classic Pomodoro is proven effective
2. **Match soundscape to task**: Rain for writing, lo-fi for coding
3. **Use Quick Capture liberally**: Don't let ideas interrupt your flow
4. **Take real breaks**: Step away from the screen during breaks
5. **Track your stats**: Review progress to stay motivated

## Troubleshooting

### Soundscape Not Playing

- Click anywhere on the page first (browser audio policy)
- Check that volume is above 0
- Verify browser supports Web Audio API

### Background Not Loading

- Check internet connection for stock images
- Try refreshing the page
- Check browser console for errors

### Widget Won't Save Position

- Ensure localStorage is enabled
- Check for private/incognito mode restrictions
- Try clearing browser cache

---

For more help, visit our [FAQ](/faq) or join the [community discussions](https://github.com/framersai/discussions).





