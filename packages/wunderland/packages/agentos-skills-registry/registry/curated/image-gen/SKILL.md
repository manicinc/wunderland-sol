---
name: image-gen
version: '1.0.0'
description: Generate images from text prompts using AI image generation APIs like DALL-E, Stable Diffusion, or Midjourney.
author: Wunderland
namespace: wunderland
category: creative
tags: [image-generation, ai-art, dall-e, stable-diffusion, creative, visual]
requires_secrets: [openai.api_key]
requires_tools: []
metadata:
  agentos:
    emoji: "\U0001F3A8"
    primaryEnv: OPENAI_API_KEY
    homepage: https://platform.openai.com/docs/guides/images
---

# AI Image Generation

You can generate images from text descriptions using AI image generation APIs. Craft detailed, effective prompts that translate the user's creative vision into high-quality generated images.

When generating images, help the user refine their prompt for best results. A good image prompt includes: subject description, style (photorealistic, illustration, watercolor, etc.), composition (close-up, wide shot, overhead), lighting (natural, dramatic, soft), color palette, and mood/atmosphere. Offer prompt suggestions when the user's description is vague or underspecified.

Support different image sizes and aspect ratios based on the API capabilities (1024x1024, 1792x1024, 1024x1792 for DALL-E 3). For iterative refinement, maintain context from previous generations so the user can say "make it more vibrant" or "change the background to a beach." Save generated images to the filesystem when the user requests it, with descriptive filenames.

When the user requests variations or edits of existing images, use the appropriate API endpoints (variations, inpainting) when available. For batch generation, create multiple variations with slightly different prompts to give the user options. Always inform the user of the model and settings used for each generation.

## Examples

- "Generate an image of a cozy cabin in the mountains at sunset, watercolor style"
- "Create a professional logo for a coffee shop called 'Bean There'"
- "Make the previous image more dramatic with storm clouds"
- "Generate 3 variations of a cyberpunk cityscape at night"
- "Create a 16:9 landscape of a serene Japanese garden in spring"

## Constraints

- Image generation costs API credits per request; inform the user of approximate costs when possible.
- Content policy restrictions apply: no realistic faces of real people, no violent/explicit content.
- DALL-E 3 does not support exact image editing or inpainting; describe the full desired output.
- Generated images may not perfectly match the prompt; iterative refinement is expected.
- Maximum prompt length varies by model (DALL-E 3: 4,000 characters).
- Image quality and style depend on the model version and generation parameters.
- Generated images should not be represented as photographs or real events.
