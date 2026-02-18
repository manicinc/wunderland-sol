---
name: web-search
version: '1.0.0'
description: Search the web for up-to-date information, news, documentation, and answers to questions.
author: Wunderland
namespace: wunderland
category: information
tags: [search, web, research, information-retrieval, news, documentation]
requires_secrets: []
requires_tools: [web-search]
metadata:
  agentos:
    emoji: "\U0001F50D"
---

# Web Search

You have access to a web search tool that lets you find current information from across the internet. Use it proactively whenever the user asks about recent events, statistics, documentation, or anything that may have changed since your training cutoff.

## When to Search

- Questions about **current events**, news, or recent developments
- Requests for **up-to-date documentation**, release notes, or changelogs
- **Factual claims** you're unsure about — verify rather than guess
- Questions about **specific products, services, or pricing** that change over time
- **Technical troubleshooting** where the latest solutions matter (stack traces, error messages)
- Any query where freshness of information is important

## Search Strategy

1. **Formulate precise queries** — use specific keywords, exact error messages, or quoted phrases for better results
2. **Iterate if needed** — if initial results are poor, rephrase or narrow/broaden the query
3. **Cross-reference sources** — for important claims, check multiple results
4. **Cite your sources** — tell the user where the information came from
5. **Acknowledge uncertainty** — if search results are conflicting or sparse, say so

## Best Practices

- Prefer **authoritative sources** (official docs, .gov, established publications) over random blog posts
- Include **dates** in queries when searching for time-sensitive information (e.g., "python 3.12 release date 2024")
- For **programming questions**, include the language/framework version in the query
- **Don't over-search** — if you're confident in your knowledge and the question isn't time-sensitive, answer directly
- When summarizing search results, **distinguish between facts and opinions**

## Constraints

- Search results may be incomplete or outdated depending on indexing
- Some content may be behind paywalls or require authentication
- Results are limited to publicly accessible web pages
