# AI Document Visualizer Guide

The AI Document Visualizer transforms your written content into visual stories. Generate illustrations, diagrams, and visual representations of your documents with AI.

## Features Overview

### Visualization Modes

#### Gallery Mode
- Extracts key concepts from your document
- Generates standalone memorable images
- Best for: Blog posts, articles, presentations

#### Timeline Mode
- Creates visual milestones from sequential content
- Best for: Historical narratives, project timelines, process documentation

#### Picture Book Mode
- Splits document into pages with accompanying illustrations
- Navigate page-by-page through your illustrated story
- Best for: Stories, narratives, creative writing

#### Diagrams Mode
- Generates visual representations of relationships and processes
- Best for: Technical documentation, system architecture, workflows

### Visual Styles
- **Illustration**: Vibrant digital art with clean lines
- **Watercolor**: Soft gradients and artistic brushstrokes
- **Sketch**: Hand-drawn pencil style with shading
- **Photorealistic**: High-quality photograph aesthetic
- **Diagram**: Clean technical style with minimal design
- **Storybook**: Whimsical children's book illustration
- **Graphic Novel**: Bold comic book aesthetic
- **Minimal**: Simple shapes with limited color palette

## How to Use

### Opening the Visualizer
1. Open any document in the editor
2. Click the **Visualizer** button in the toolbar (or press `Cmd/Ctrl + Shift + V`)
3. Select your preferred mode and style

### Picture Book Mode
1. Click **Picture Book** mode
2. Navigate between pages using the arrow buttons
3. Click on any page's image area to generate an illustration
4. Use the style selector to change visual styles
5. Download individual images or export the full book

### Generating Visualizations
1. The AI extracts key concepts from your text
2. For each concept, a visual prompt is generated
3. Images are created using your configured image generation API
4. Click any pending visualization to generate it

## Requirements

AI Visualizer requires two API keys:
1. **LLM API key** - For concept extraction and prompt generation
2. **Image Generation API key** - For creating visuals

Supported image generation providers:
- OpenAI DALL-E
- Stability AI
- Replicate
- FAL.ai

Configure in **Settings > AI Features > Image Generation**

## Best Practices

1. **Write descriptive paragraphs** for better visual results
2. **Use Picture Book mode** for narrative content
3. **Select "Storybook" style** for creative writing
4. **Use "Diagram" style** for technical documentation
5. **Generate images one at a time** to review quality

## Technical Details

### Architecture
- **Service**: `lib/ai/documentVisualizer.ts`
- **Panel Component**: `components/quarry/ui/AIVisualizerPanel.tsx`
- **Picture Book**: `components/quarry/ui/PictureBookView.tsx`

### API Usage
```typescript
import {
  extractKeyConceptsForVisualization,
  generateParagraphIllustration,
  splitIntoPictureBookPages,
} from '@/lib/ai/documentVisualizer'

// Extract concepts
const concepts = await extractKeyConceptsForVisualization(content, {
  maxConcepts: 5,
  mode: 'gallery',
})

// Generate illustration
const result = await generateParagraphIllustration(paragraphText, {
  style: 'storybook',
})
```

### Streaming Picture Book Generation
```typescript
import { generatePictureBookImages } from '@/lib/ai/documentVisualizer'

const pages = splitIntoPictureBookPages(content)

for await (const page of generatePictureBookImages(pages, 'storybook')) {
  // Handle each illustrated page
  console.log(page.imageUrl)
}
```

## Mobile Usage

The visualizer is fully responsive:
- **Desktop**: Split view with text and images side-by-side
- **Mobile**: Toggle between text and image views using the tab bar

## Troubleshooting

### "Configure image generation API key"
Add an image generation API key in Settings > AI Features > Image Generation

### Images not generating
- Check network connection
- Verify image generation API key is valid
- Ensure you have API credits remaining

### Poor quality images
- Try a different visual style
- Write more descriptive paragraphs
- Use longer text passages for better context

### Picture Book: Paragraphs skipped
Paragraphs under 30 characters are automatically skipped as they lack enough context for meaningful visualization.
