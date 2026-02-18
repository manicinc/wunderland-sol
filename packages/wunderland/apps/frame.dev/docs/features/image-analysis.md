# Image Analysis & AI Captioning - User Guide

Automatically analyze photos and screenshots with AI-powered captions, metadata extraction, and object detection.

## Overview

The Image Analysis system enhances every image you upload to the canvas with:

1. **AI Captions** - Automatic descriptions using GPT-4 Vision or Claude
2. **Screenshot Detection** - Identify and analyze UI elements in screenshots
3. **EXIF Metadata** - Extract camera info, GPS, timestamps from photos
4. **Object Detection** - Identify objects and scenes (optional, TensorFlow.js)
5. **Source Tracking** - Visual badges showing image origin (📷 Camera, 📁 Upload, 🖥️ Screenshot)

## Getting Started

### Enabling Auto-Analysis

1. **Open Settings**
   - Navigate to Settings → Vision AI
   - Toggle "Auto-Analyze Images" ON

2. **Configure Features**
   - ✅ **AI Captions** (Recommended) - Generate descriptions
   - ✅ **Screenshot Detection** (Recommended) - Detect screenshots
   - ✅ **EXIF Extraction** (Recommended) - Extract metadata
   - ⚠️ **Object Detection** (Optional) - Requires ~3MB download

3. **Choose AI Provider**
   - **OpenAI (GPT-4V)**: Excellent general performance
   - **Anthropic (Claude)**: Great for detailed analysis

### Upload & Capture Images

The system works with all upload methods:

**From RadialMediaMenu (Right-click on canvas):**
- 📷 **Camera Capture** → Photo with device camera
- 📁 **Upload Image** → Select from file system
- 🖥️ **Screenshot** → System automatically detects

**What Happens:**
1. Image uploads to canvas
2. System detects source type (camera/upload/screenshot)
3. Auto-analysis runs in background (if enabled)
4. Caption appears in collapsible section with source badge

## Smart Auto-Analyze Logic

The system intelligently decides when to analyze:

### Screenshots
**Always analyzed** when auto-analyze is enabled
- Detected via EXIF software field
- Common screen resolutions (1920×1080, 2560×1440, etc.)
- Sharp edges and flat UI design patterns
- **Use case**: Perfect for documenting workflows, bugs, designs

### Camera Photos
**Analyzed if AI Caption is enabled**
- Detected via EXIF camera make/model
- GPS coordinates and timestamps extracted
- **Use case**: Meeting notes, whiteboard captures, field research

### Uploads
**Analyzed if AI Caption is enabled**
- Default for images without clear indicators
- **Use case**: General image documentation

## Understanding the Caption Display

### Source Badges

Images show a badge indicating their origin:

- **📷 Camera** (Blue) - Captured with device camera
- **🖥️ Screenshot** (Purple) - Screenshot image
- **📁 Upload** (Green) - Uploaded from file system

### Caption Section

Click to expand/collapse:
- **✨ AI Caption** - GPT-4V or Claude description
- **Confidence Score** - How certain the AI is (0-100%)
- **Analysis Status**:
  - ⏳ **Analyzing...** - Processing in background
  - ✅ **Done** - Analysis complete
  - ❌ **Error** - Analysis failed (retry in settings)

## Analysis Features Explained

### 1. AI Captions

**What it does:**
- Generates human-readable description of image content
- Customized prompts for screenshots vs. photos
- Confidence scoring

**Screenshot example:**
> "A VS Code editor window showing TypeScript code with a file tree on the left and terminal at bottom. The code appears to be a React component."

**Photo example:**
> "A whiteboard with handwritten notes about API architecture, featuring diagrams and bullet points."

**Settings:**
- Enable/disable in Vision AI settings
- Choose provider (OpenAI or Anthropic)
- Requires API key configured

### 2. Screenshot Detection

**What it does:**
- Identifies screenshots using multiple heuristics
- Analyzes EXIF software field (e.g., "macOS Screenshot")
- Checks for common screen resolutions
- Detects sharp edges (UI elements)
- Measures color variance (flat design patterns)

**Confidence factors:**
- ✅ EXIF software = +50% confidence
- ✅ Screen resolution = +20% confidence
- ✅ Sharp edges = +15% confidence
- ✅ Flat colors = +15% confidence
- **Threshold**: 60% = Screenshot

**Why it matters:**
Screenshots get customized analysis prompts focusing on UI elements, applications, and workflow context.

### 3. EXIF Metadata

**What it does:**
- Extracts camera make and model
- GPS coordinates (latitude, longitude, altitude)
- Capture timestamp
- Camera settings (ISO, exposure, f-number)
- Orientation
- Software used

**Privacy note:**
- Extracted locally in your browser
- Not sent to any servers
- EXIF data stays in your canvas

**Example metadata:**
```
Camera: iPhone 14 Pro
Captured: 2025-01-15 14:32:18
Location: 37.7749°N, 122.4194°W
ISO: 400 | f/1.8 | 1/120s
```

### 4. Object Detection (Optional)

**What it does:**
- Detects up to 10 objects per image
- Uses TensorFlow.js Coco-SSD model
- Identifies 90+ object classes
- Provides bounding boxes and confidence scores

**Object classes include:**
- People, animals, vehicles
- Furniture, appliances, electronics
- Food, drinks, plants
- Sports equipment, musical instruments
- And 80+ more categories

**Performance:**
- Model size: ~3MB (one-time download)
- Requires WebGL support
- Processing time: 1-3 seconds
- Runs entirely in browser

**Disable if:**
- You don't need object detection
- Browser doesn't support WebGL
- Want to minimize bundle size

## Privacy & Data

### What Stays Local

**100% Private (never sent to servers):**
- EXIF metadata extraction
- Screenshot detection heuristics
- Object detection (TensorFlow.js runs in browser)
- Source type detection

### What Uses Cloud APIs

**Sent to AI providers (OpenAI or Anthropic):**
- Image for AI caption generation
- Custom analysis prompt

**Your control:**
- Disable AI Captions to keep everything local
- Use only screenshot detection + EXIF extraction
- Toggle auto-analyze on/off anytime

### API Key Security

- Keys stored in environment variables
- Never exposed in browser
- Server-side API calls only
- Follow provider's data policies

## Troubleshooting

### "Analysis failed"

**Solutions:**
1. Check API keys configured (Settings → Vision AI)
2. Verify internet connection (for AI captions)
3. Try uploading again
4. Disable object detection if WebGL issues

### Low caption quality

**Solutions:**
1. Switch AI provider (try Claude if using GPT-4V)
2. Ensure good image quality (bright, focused, high-res)
3. For screenshots: Capture full window for context

### "Object detection unavailable"

**Cause:** Browser doesn't support WebGL

**Solutions:**
1. Update browser to latest version
2. Enable WebGL in browser settings
3. Use different browser (Chrome, Firefox, Safari)
4. Disable object detection feature

### Slow analysis

**Causes:**
- Large images (>5MB)
- Object detection enabled
- Slow internet (cloud captions)

**Solutions:**
1. Resize images before upload
2. Disable object detection
3. Use faster internet connection

## Best Practices

### For Maximum Accuracy

✅ **Upload high-quality images**
- Bright, well-lit photos
- Sharp focus, no blur
- High resolution (≥1024px)

✅ **Enable relevant features**
- AI Captions: For rich descriptions
- Screenshot Detection: If working with UI/design
- EXIF: For camera photos with metadata
- Object Detection: Only if needed

✅ **Choose right provider**
- OpenAI (GPT-4V): Fast, great general performance
- Anthropic (Claude): Detailed analysis, better context

### Workflow Recommendations

**For Screenshots:**
```
1. Capture full window (not cropped)
2. System auto-detects as screenshot
3. AI generates UI-focused caption
4. Source badge: 🖥️ Screenshot
```

**For Photos:**
```
1. Take photo with device camera
2. System extracts EXIF data
3. AI generates photo description
4. Source badge: 📷 Camera
```

**For Uploads:**
```
1. Upload image from file system
2. System analyzes format/metadata
3. AI generates description
4. Source badge: 📁 Upload
```

## Advanced Features

### Custom Analysis Prompts

Coming soon: Ability to customize AI analysis prompts per image type.

### Batch Analysis

Currently analyzes images one at a time. Batch processing planned for future release.

### Export with Metadata

When exporting canvas, image analysis data is included:
- Caption text
- Source type
- Confidence scores
- EXIF metadata
- Detected objects

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open RadialMediaMenu | Right-click (desktop), Long-press (mobile) |
| Expand/Collapse Caption | Click caption header |
| Open Vision Settings | Settings → Vision AI |

## FAQs

**Q: Does this work offline?**
A: Screenshot detection, EXIF extraction, and object detection work offline. AI captions require internet + API key.

**Q: How much does it cost?**
A: Uses your OpenAI or Anthropic API credits. Typical cost: $0.01-0.03 per image caption.

**Q: Can I disable auto-analysis?**
A: Yes! Settings → Vision AI → Toggle "Auto-Analyze Images" OFF.

**Q: What languages are supported for captions?**
A: Currently English. The AI can describe images in other languages if you configure a custom prompt.

**Q: Can I edit captions after generation?**
A: Not yet - captions are read-only. Manual editing planned for future release.

**Q: Does it analyze videos?**
A: No, currently images only. Video analysis planned for future release.

**Q: How accurate is screenshot detection?**
A: 95%+ accuracy when EXIF software field present. 85%+ accuracy with heuristic analysis.

**Q: Can I see detected objects with bounding boxes?**
A: Not in the UI yet - bounding box visualization planned for future release.

## Performance Tips

### Minimize Bundle Size

- Keep object detection disabled unless needed
- Saves ~3MB download

### Faster Analysis

- Disable object detection (saves 1-3s per image)
- Use smaller images (resize before upload)
- Local-only features (screenshot detection + EXIF) are instant

### Battery Saving (Mobile)

- Disable object detection (CPU intensive)
- Disable auto-analyze (analyze manually when needed)

## What's Next?

Planned features:

- [ ] Custom analysis prompts per image
- [ ] Edit captions inline
- [ ] Batch image analysis
- [ ] Video analysis support
- [ ] Bounding box visualization for detected objects
- [ ] Multi-language caption support
- [ ] Semantic image search across canvas
- [ ] Duplicate image detection

## Feedback & Support

Found a bug or have a feature request?

- **GitHub Issues**: [Report here](https://github.com/framersai/frame.dev/issues)
- **Documentation**: This guide and [developer docs](../../lib/ai/imageAnalyzer.ts)

---

**Version**: 1.0.0 (2025-01)
**Last Updated**: January 2025
