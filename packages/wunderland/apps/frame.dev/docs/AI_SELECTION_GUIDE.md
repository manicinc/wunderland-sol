# AI Selection Actions Guide

AI Selection Actions enable intelligent text transformation directly within the editor. Select any text and apply AI-powered enhancements with a single click.

## Features Overview

### Transform Actions
- **Improve Writing**: Enhance clarity, flow, and readability
- **Make Shorter**: Condense text while preserving meaning
- **Make Longer**: Expand with additional detail and examples
- **Fix Grammar**: Correct grammar, spelling, and punctuation
- **Summarize**: Create concise summaries
- **Expand**: Elaborate with supporting details

### Tone Changes
- **Formal Tone**: Academic or business-appropriate style
- **Casual Tone**: Friendly, conversational style
- **Professional Tone**: Clear business communication

### Analysis Actions
- **Explain**: Break down complex concepts in simple terms
- **Define**: Provide definitions for technical terms

### Translation
- Translate to: Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Russian, Arabic

## How to Use

1. **Select text** in the editor
2. **Click the AI button** (sparkles icon) in the floating toolbar
3. **Choose an action** from the dropdown menu
4. **Review the result** in the preview panel
5. **Accept or reject** the transformation

### Keyboard Shortcuts
- `Cmd/Ctrl + Shift + A` - Open AI actions menu (when text selected)
- `Cmd/Ctrl + Enter` - Accept transformation
- `Esc` - Reject and close

## Requirements

AI Selection Actions require a configured LLM API key:
- OpenAI API key
- Anthropic API key
- OpenRouter API key
- Or any compatible LLM provider

Configure in **Settings > AI Features > API Keys**

## Best Practices

1. **Select complete sentences or paragraphs** for best results
2. **Use Grammar fix** for quick error corrections (uses lower temperature for accuracy)
3. **Translate longer passages** for better context understanding
4. **Review before accepting** - AI suggestions may need minor adjustments

## Technical Details

### Architecture
- **Service**: `lib/ai/selectionActions.ts`
- **Menu Component**: `components/quarry/ui/AISelectionMenu.tsx`
- **Preview Component**: `components/quarry/ui/AISelectionPreview.tsx`

### API
```typescript
import { performSelectionAction } from '@/lib/ai/selectionActions'

const result = await performSelectionAction({
  selectedText: 'Text to transform',
  action: 'improve',
  context: {
    textBefore: 'Optional context before',
    textAfter: 'Optional context after',
  },
})

if (result.success) {
  console.log(result.transformed)
}
```

### Streaming Support
For longer operations, use the streaming API:
```typescript
import { streamSelectionAction } from '@/lib/ai/selectionActions'

for await (const chunk of streamSelectionAction(options)) {
  // Handle streaming chunks
}
```

## Troubleshooting

### "No AI provider configured"
Add an LLM API key in Settings > AI Features > API Keys

### Transformation not appearing
- Check network connection
- Verify API key is valid
- Try a shorter text selection

### Results not as expected
- Provide more context by selecting surrounding text
- Try a different action (e.g., use "Professional Tone" instead of "Improve")
- For technical content, results may vary
