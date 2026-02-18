# Handwriting Transcription - User Guide

Automatically transcribe your handwritten notes into editable text on the infinite canvas.

## Overview

The handwriting transcription system uses AI to convert your handwritten notes into typed text. It works with three input methods:

1. **Canvas Drawing** - Draw directly on the canvas with real-time transcription
2. **Photo Upload** - Upload pictures of handwritten notes
3. **Camera Capture** - Take photos of notes with your device camera

## Getting Started

### Method 1: Canvas Drawing (Real-Time)

1. **Open the Canvas**
   - Navigate to the whiteboard/canvas view
   - Right-click (or long-press on mobile) to open the media menu

2. **Enable Handwriting Mode**
   - Click the "Handwriting Mode" toggle in the toolbar
   - Or select "Draw Handwriting" from the media menu

3. **Draw Your Note**
   - Use your mouse/trackpad or touch screen to write
   - The system will automatically detect when you pause

4. **Automatic Transcription**
   - After 2 seconds of inactivity, OCR begins automatically
   - A preview of the transcribed text appears below your drawing
   - Confidence score shows how accurate the transcription is

5. **Results**
   - **High confidence (≥85%)**: Text automatically creates a linked transcript card
   - **Medium confidence (60-84%)**: You'll see a suggestion to try Cloud AI
   - **Low confidence (<60%)**: Manual transcription or cloud mode recommended

### Method 2: Upload Image

1. **Upload a Photo**
   - Right-click on the canvas → "Upload Image"
   - Select a photo of your handwritten notes

2. **Automatic Detection**
   - System analyzes the image for handwriting
   - If detected, a confirmation modal appears

3. **Confirm Settings**
   - **Create as**: Choose "Handwriting Note" or "Image Attachment"
   - **Auto-transcribe**: Toggle automatic transcription on/off
   - **OCR Mode**: Select "Local OCR" (fast) or "Cloud AI" (accurate)

4. **Transcribe**
   - Click "Confirm" to create the handwriting shape
   - If auto-transcribe is on, OCR runs immediately
   - Results appear as a preview text and confidence score

### Method 3: Camera Capture

1. **Open Camera**
   - Right-click on canvas → "Take Photo"
   - Point camera at your handwritten note
   - Capture the image

2. **Same as Upload**
   - System detects handwriting automatically
   - Follow steps 2-4 from "Upload Image" above

## Transcription Modes

### Local OCR (Default)

**What it is:**
- Runs entirely in your browser using AI models
- No data sent to servers
- Works offline (after initial model download)

**When to use:**
- Privacy-sensitive notes
- Simple, clear handwriting
- Fast results needed
- No internet connection

**Characteristics:**
- Speed: 2-5 seconds (desktop), 5-8 seconds (mobile)
- Accuracy: 90-95% on clear print/block letters
- Model size: 50MB (downloaded once, cached)

### Cloud AI

**What it is:**
- Uses GPT-4 Vision or Claude Vision models
- Processed on OpenAI/Anthropic servers
- Requires API keys configured

**When to use:**
- Cursive or difficult handwriting
- Local confidence is low (<85%)
- Maximum accuracy needed
- Don't mind cloud processing

**Characteristics:**
- Speed: 1-3 seconds (network dependent)
- Accuracy: 95-99% on most handwriting
- Requires: Internet connection + API key

## Understanding Confidence Scores

The system shows how confident it is about the transcription:

### 🟢 High (85-100%)
- **Meaning**: Very accurate transcription
- **Action**: Automatically creates linked transcript
- **Display**: Green confidence badge
- **Recommendation**: Use as-is

### 🟡 Medium (60-84%)
- **Meaning**: Mostly accurate, may have errors
- **Action**: Shows "Enhance with Cloud AI" suggestion
- **Display**: Yellow/amber confidence badge
- **Recommendation**: Review text, consider cloud enhancement

### 🔴 Low (<60%)
- **Meaning**: Many errors likely
- **Action**: Requires cloud mode or manual transcription
- **Display**: Red confidence badge
- **Recommendation**: Use cloud mode or retype manually

## On-Demand Transcription

Already have a handwriting shape? Transcribe it anytime:

1. **Click "Transcribe" Button**
   - Located in the handwriting card header
   - Opens the transcription modal

2. **Choose Mode**
   - **Local OCR**: Fast, private, free
   - **Cloud AI**: Slower, accurate, requires API key

3. **View Results**
   - Transcribed text appears in modal
   - Confidence score displayed
   - Processing time shown

4. **Create Transcript**
   - Click "Create Transcript Card"
   - New text card appears linked to your handwriting
   - Arrow connects the two shapes

## Tips for Better Accuracy

### Writing Style

✅ **Do:**
- Write clearly in print/block letters
- Use dark ink on white/light paper
- Make letters distinct and well-spaced
- Keep lines straight and level

❌ **Avoid:**
- Overly cursive or stylized writing
- Light pencil on light paper
- Overlapping lines or heavy crossing-out
- Extremely small text (< 8pt equivalent)

### Image Quality

✅ **Do:**
- Use good lighting (bright, even)
- Hold camera/phone steady
- Fill frame with the text
- Use high resolution (≥ 1024px)

❌ **Avoid:**
- Shadows or glare on paper
- Blurry or out-of-focus images
- Extreme angles or perspective distortion
- Dark or low-contrast images

### Format

✅ **Supported:**
- PNG, JPEG, WebP formats
- Up to 10MB file size
- Any resolution (downscaled automatically)

❌ **Not Supported:**
- PDF files (extract images first)
- GIF animations
- Files larger than 10MB
- Heavily compressed/artifacted images

## Linked Transcripts

When transcription succeeds with high confidence, a linked transcript card is created:

### Features

- **Bidirectional Link**: Click either shape to navigate to the other
- **Arrow Connection**: Visual link shows relationship
- **Editable Text**: Transcript card text is fully editable
- **Tag Extraction**: Hashtags (#tag) auto-detected and extracted
- **Export Together**: Both shapes export together in markdown

### Navigation

- Click "View Transcript" button in handwriting card
- Canvas automatically zooms to the transcript
- Edit transcript text as needed
- Use tags for organization

## Privacy & Data

### Local Mode
- **Processing**: 100% in your browser
- **Data sent**: None
- **Storage**: Model cached locally (50MB)
- **Internet**: Required for initial download only

### Cloud Mode
- **Processing**: OpenAI or Anthropic servers
- **Data sent**: Image + OCR prompt
- **Storage**: Per provider's data policy
- **Internet**: Required for each request

### Caching
- **What's cached**: OCR results (text + confidence)
- **Where**: Browser localStorage
- **Duration**: 7 days
- **Clear**: Automatic expiry or manual clear in settings

## Troubleshooting

### "Model load failed"

**Problem**: Can't load local OCR model

**Solutions:**
1. Check internet connection
2. Clear browser cache and reload
3. Use Cloud AI mode instead
4. Try different browser (Chrome, Firefox, Safari)

### "Transcription failed"

**Problem**: OCR processing error

**Solutions:**
1. Retry with "Retry" button
2. Try Cloud AI mode
3. Check image quality and format
4. Reduce image size (< 5MB recommended)

### "Request timed out"

**Problem**: OCR took longer than 30 seconds

**Solutions:**
1. Reduce image resolution
2. Use smaller crop of handwriting
3. Check internet speed (cloud mode)
4. Try local mode instead of cloud

### "Cloud OCR is not available"

**Problem**: API keys not configured

**Solutions:**
1. Ask administrator to configure API keys
2. Use Local OCR mode instead
3. Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to environment

### Low accuracy on cursive writing

**Problem**: Cursive handwriting gets low confidence

**Solutions:**
1. Use Cloud AI mode (better at cursive)
2. Write in print/block letters instead
3. Break text into smaller sections
4. Manual transcription for very stylized writing

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open media menu | Right-click (desktop), Long-press (mobile) |
| Close modal | Esc |
| Confirm transcription | Enter (in modal) |
| Navigate to transcript | Click "View Transcript" |

## Best Practices

### For Maximum Accuracy

1. **Start with Local Mode**
   - Fast and private
   - Good for most handwriting
   - Free (no API costs)

2. **Use Cloud Enhancement When Suggested**
   - System suggests when confidence 60-84%
   - Significant accuracy improvement
   - Worth it for important notes

3. **Review Before Trusting**
   - Always check high-confidence results
   - AI can make mistakes
   - Edit transcript as needed

### Workflow Recommendation

```
Write/Upload → Local OCR (auto)
              ↓
         Confidence check
              ↓
    ≥85%: Use result
    60-84%: Cloud enhance
    <60%: Manual transcription
```

## Export & Integration

### Markdown Export

When you export the canvas to markdown:

```markdown
## Handwritten Note

![Handwriting](assets/handwriting-123.png)

**Transcription** (87% confidence):

> Hello world, this is a test of the
> handwriting recognition system.

*Created: 2025-01-15 • Source: upload • ⚡ Local OCR • 87% confidence*

Tags: #test #handwriting
```

### Export Includes

- Original handwriting image
- Transcribed text (if available)
- Confidence score
- OCR mode used (local/cloud)
- Creation date and source
- Extracted tags

## Advanced Features

### Manual Mode

Override automatic transcription:

1. Create handwriting shape
2. Don't enable auto-transcribe
3. Click "Transcribe" when ready
4. Choose mode and settings manually

### Batch Processing

Transcribe multiple images:

1. Upload all images at once
2. Enable auto-transcribe for all
3. System processes sequentially
4. Review results when complete

### Custom Confidence Thresholds

Currently fixed, but coming soon:
- Adjustable confidence thresholds
- Auto-enhance settings
- Custom preprocessing options

## FAQs

**Q: Is my handwriting data private?**
A: In Local mode, yes - everything runs in your browser. Cloud mode sends images to AI providers.

**Q: How much does it cost?**
A: Local mode is free. Cloud mode uses your OpenAI/Anthropic API credits.

**Q: Can it read cursive writing?**
A: Cloud AI mode handles cursive better than Local. Results vary by handwriting style.

**Q: What languages are supported?**
A: Currently English only. Multi-language support coming in future updates.

**Q: Can I edit transcriptions?**
A: Yes! Click the transcript card and edit text directly.

**Q: How do I delete a transcription?**
A: Select the transcript card and press Delete. Original handwriting remains.

**Q: Does it work offline?**
A: Local mode works offline after initial model download. Cloud mode requires internet.

**Q: How accurate is it really?**
A: Local: 90-95% on clear print. Cloud: 95-99% on most handwriting. Your mileage may vary.

## Feedback & Support

Found a bug or have a feature request?

- **GitHub Issues**: [Report here](https://github.com/anthropics/frame.dev/issues)
- **Documentation**: This guide and [developer docs](../../lib/ocr/README.md)
- **Community**: Discord server (link in main README)

## Version History

- **v1.0.0** (2025-01): Initial release
  - Local TrOCR support
  - Cloud GPT-4V/Claude fallback
  - Handwriting detection
  - Confidence scoring
  - Linked transcripts

## What's Next?

Planned features:

- [ ] Multi-language support (Spanish, French, Chinese, etc.)
- [ ] Math equation recognition (LaTeX output)
- [ ] Table/diagram recognition
- [ ] Batch export (all handwriting → single text file)
- [ ] Custom model fine-tuning
- [ ] Voice notes → handwriting → text pipeline

Stay tuned for updates!
