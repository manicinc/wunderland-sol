/**
 * Vision AI API Route
 * @module api/ai/vision
 * 
 * @description
 * Proxies vision analysis requests to OpenAI or Anthropic.
 * Handles image encoding and response parsing.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, image, mimeType, prompt } = body
    
    if (!image || !prompt) {
      return NextResponse.json(
        { error: 'Image and prompt are required' },
        { status: 400 }
      )
    }
    
    const startTime = Date.now()
    
    if (provider === 'openai') {
      return await analyzeWithOpenAI(image, mimeType, prompt, startTime)
    }
    
    if (provider === 'anthropic') {
      return await analyzeWithAnthropic(image, mimeType, prompt, startTime)
    }
    
    return NextResponse.json(
      { error: 'Invalid provider. Use "openai" or "anthropic"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Vision API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    )
  }
}

async function analyzeWithOpenAI(
  base64: string,
  mimeType: string,
  prompt: string,
  startTime: number
) {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    )
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${prompt}\n\nRespond in JSON format with these fields:
{
  "description": "detailed description",
  "imageType": "diagram|chart|screenshot|photo|illustration|other",
  "elements": ["key element 1", "key element 2"],
  "structure": { "type": "flowchart|graph|table|etc", "nodes": ["node1", "node2"], "relationships": ["A->B", "B->C"] },
  "confidence": 0.0-1.0
}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('[Vision API] OpenAI error:', error)
    return NextResponse.json(
      { error: `OpenAI API error: ${response.statusText}` },
      { status: response.status }
    )
  }
  
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  
  if (!content) {
    return NextResponse.json(
      { error: 'No response from OpenAI' },
      { status: 500 }
    )
  }
  
  try {
    const parsed = JSON.parse(content)
    return NextResponse.json({
      ...parsed,
      provider: 'openai',
      latency: Date.now() - startTime,
    })
  } catch {
    // If JSON parsing fails, return as description
    return NextResponse.json({
      description: content,
      imageType: 'other',
      confidence: 0.7,
      provider: 'openai',
      latency: Date.now() - startTime,
    })
  }
}

async function analyzeWithAnthropic(
  base64: string,
  mimeType: string,
  prompt: string,
  startTime: number
) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured' },
      { status: 500 }
    )
  }
  
  // Map MIME type to Anthropic's supported types
  const mediaType = mimeType.includes('png') ? 'image/png' 
    : mimeType.includes('gif') ? 'image/gif'
    : mimeType.includes('webp') ? 'image/webp'
    : 'image/jpeg'
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `${prompt}\n\nRespond in JSON format with these fields:
{
  "description": "detailed description",
  "imageType": "diagram|chart|screenshot|photo|illustration|other",
  "elements": ["key element 1", "key element 2"],
  "structure": { "type": "flowchart|graph|table|etc", "nodes": ["node1", "node2"], "relationships": ["A->B", "B->C"] },
  "confidence": 0.0-1.0
}`
            }
          ],
        }
      ],
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('[Vision API] Anthropic error:', error)
    return NextResponse.json(
      { error: `Anthropic API error: ${response.statusText}` },
      { status: response.status }
    )
  }
  
  const data = await response.json()
  const content = data.content?.[0]?.text
  
  if (!content) {
    return NextResponse.json(
      { error: 'No response from Anthropic' },
      { status: 500 }
    )
  }
  
  try {
    // Extract JSON from response (Claude sometimes wraps in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] || content)
    return NextResponse.json({
      ...parsed,
      provider: 'anthropic',
      latency: Date.now() - startTime,
    })
  } catch {
    // If JSON parsing fails, return as description
    return NextResponse.json({
      description: content,
      imageType: 'other',
      confidence: 0.7,
      provider: 'anthropic',
      latency: Date.now() - startTime,
    })
  }
}



