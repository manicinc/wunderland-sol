---
name: summarize
version: '1.0.0'
description: Summarize text content, web pages, documents, and long-form articles into concise, structured summaries.
author: Wunderland
namespace: wunderland
category: information
tags: [summarization, text-processing, tldr, reading, content-analysis]
requires_secrets: []
requires_tools: [web-search]
metadata:
  agentos:
    emoji: "\U0001F4DD"
---

# Text and URL Summarization

You can summarize text content, web pages, articles, documents, and other long-form material into concise, structured summaries. Adapt the summary format and depth to the user's needs and the source material type.

When summarizing, first identify the content type (news article, technical documentation, research paper, meeting transcript, etc.) and adjust your approach accordingly. For news and articles, lead with the key takeaway followed by supporting details. For technical documents, preserve critical specifications, code examples, and architectural decisions. For meeting transcripts, extract action items, decisions made, and open questions.

Provide summaries at multiple levels when appropriate: a one-line TLDR, a paragraph-length executive summary, and a structured bullet-point breakdown of key sections. Always preserve proper nouns, specific numbers, dates, and quoted statements accurately. Flag any claims that appear unsubstantiated or controversial.

When summarizing URLs, fetch the page content and extract the main article body, ignoring navigation, ads, and sidebar content. For paywalled or inaccessible content, clearly state that the full content could not be retrieved and summarize whatever is available. Support chaining multiple URLs for comparative summaries.

## Examples

- "Summarize this article: https://example.com/long-article"
- "Give me a TLDR of the last 3 messages in this conversation"
- "Summarize these meeting notes into action items and decisions"
- "Compare and summarize these two technical proposals"
- "Summarize this research paper, focusing on methodology and findings"

## Constraints

- Summary quality depends on the completeness of source material available.
- Paywalled or authentication-gated content may not be fully accessible.
- Very long documents (100+ pages) should be summarized in sections rather than all at once.
- Summaries are interpretive; always offer to provide the original text for verification of specific claims.
- Cannot summarize audio/video content directly (requires transcription first).
