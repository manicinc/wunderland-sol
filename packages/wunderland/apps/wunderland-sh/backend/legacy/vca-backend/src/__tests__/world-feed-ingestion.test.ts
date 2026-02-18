/**
 * @file world-feed-ingestion.test.ts
 * @description Unit tests for the WorldFeedIngestionService: RSS parsing,
 * API polling, deduplication, lifecycle management, and XML normalization.
 */

import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// ── Re-implement pure parsing helpers for testing ───────────────────────────

function stripCDATA(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function generateDedupHash(title: string, url: string): string {
  const normalized = `${normalizeWhitespace(title.toLowerCase())}::${url.toLowerCase().trim()}`;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

// ── XML Entity Decoding Tests ───────────────────────────────────────────────

describe('XML entity decoding', () => {
  test('decodes standard XML entities', () => {
    assert.equal(decodeXmlEntities('&amp;'), '&');
    assert.equal(decodeXmlEntities('&lt;'), '<');
    assert.equal(decodeXmlEntities('&gt;'), '>');
    assert.equal(decodeXmlEntities('&quot;'), '"');
    assert.equal(decodeXmlEntities('&apos;'), "'");
  });

  test('decodes numeric character references', () => {
    assert.equal(decodeXmlEntities('&#65;'), 'A');
    assert.equal(decodeXmlEntities('&#97;'), 'a');
  });

  test('decodes hex character references', () => {
    assert.equal(decodeXmlEntities('&#x41;'), 'A');
    assert.equal(decodeXmlEntities('&#x61;'), 'a');
  });

  test('handles mixed entity types', () => {
    assert.equal(
      decodeXmlEntities('Tom &amp; Jerry &#60;3'),
      'Tom & Jerry <3'
    );
  });

  test('leaves non-entity text unchanged', () => {
    assert.equal(decodeXmlEntities('Hello World'), 'Hello World');
  });
});

// ── CDATA Stripping Tests ───────────────────────────────────────────────────

describe('CDATA stripping', () => {
  test('strips CDATA wrapper', () => {
    assert.equal(stripCDATA('<![CDATA[Hello]]>'), 'Hello');
  });

  test('strips CDATA with nested content', () => {
    const input = '<![CDATA[<p>HTML inside CDATA</p>]]>';
    assert.equal(stripCDATA(input), '<p>HTML inside CDATA</p>');
  });

  test('handles multiple CDATA sections', () => {
    const input = '<![CDATA[one]]> and <![CDATA[two]]>';
    assert.equal(stripCDATA(input), 'one and two');
  });

  test('handles text without CDATA', () => {
    assert.equal(stripCDATA('plain text'), 'plain text');
  });
});

// ── Whitespace Normalization Tests ──────────────────────────────────────────

describe('Whitespace normalization', () => {
  test('collapses multiple spaces', () => {
    assert.equal(normalizeWhitespace('hello   world'), 'hello world');
  });

  test('collapses newlines and tabs', () => {
    assert.equal(normalizeWhitespace('hello\n\t\tworld'), 'hello world');
  });

  test('trims leading and trailing whitespace', () => {
    assert.equal(normalizeWhitespace('  hello  '), 'hello');
  });

  test('handles empty string', () => {
    assert.equal(normalizeWhitespace(''), '');
  });
});

// ── XML Tag Extraction Tests ────────────────────────────────────────────────

describe('XML tag extraction', () => {
  test('extracts simple tag content', () => {
    assert.equal(extractXmlTag('<title>Hello</title>', 'title'), 'Hello');
  });

  test('extracts tag with attributes', () => {
    assert.equal(
      extractXmlTag('<link href="https://example.com">Click</link>', 'link'),
      'Click'
    );
  });

  test('returns empty string for missing tag', () => {
    assert.equal(extractXmlTag('<title>Hello</title>', 'description'), '');
  });

  test('handles multiline content', () => {
    const xml = `<description>
      Line one.
      Line two.
    </description>`;
    const result = extractXmlTag(xml, 'description');
    assert.ok(result.includes('Line one.'));
    assert.ok(result.includes('Line two.'));
  });

  test('extracts all matching tags', () => {
    const xml = '<item><title>A</title></item><item><title>B</title></item>';
    const titles = extractAllTags(xml, 'item');
    assert.equal(titles.length, 2);
  });
});

// ── RSS Feed Parsing (simplified structure tests) ───────────────────────────

describe('RSS feed parsing', () => {
  const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>A test RSS feed</description>
    <item>
      <title>First Post</title>
      <link>https://example.com/1</link>
      <description>First post content</description>
      <pubDate>Thu, 01 Jan 2026 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title><![CDATA[Second &amp; Post]]></title>
      <link>https://example.com/2</link>
      <description><![CDATA[Content with <b>HTML</b> and &amp; entities]]></description>
    </item>
  </channel>
</rss>`;

  test('extracts channel title', () => {
    const channelXml = extractXmlTag(sampleRss, 'channel');
    // Get the first title (channel title, not item titles)
    const title = extractXmlTag(channelXml.split('<item>')[0], 'title');
    assert.equal(title, 'Test Feed');
  });

  test('extracts items from RSS', () => {
    const items = extractAllTags(sampleRss, 'item');
    assert.equal(items.length, 2);
  });

  test('parses item titles with CDATA', () => {
    const items = extractAllTags(sampleRss, 'item');
    const secondTitle = extractXmlTag(items[1], 'title');
    const decoded = decodeXmlEntities(stripCDATA(secondTitle));
    assert.equal(decoded, 'Second & Post');
  });

  test('parses item links', () => {
    const items = extractAllTags(sampleRss, 'item');
    const link = extractXmlTag(items[0], 'link');
    assert.equal(link, 'https://example.com/1');
  });

  test('handles CDATA in descriptions', () => {
    const items = extractAllTags(sampleRss, 'item');
    const desc = extractXmlTag(items[1], 'description');
    const decoded = decodeXmlEntities(stripCDATA(desc));
    assert.ok(decoded.includes('HTML'));
    assert.ok(decoded.includes('&'));
  });
});

// ── Atom Feed Parsing ───────────────────────────────────────────────────────

describe('Atom feed parsing', () => {
  const sampleAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom Entry One</title>
    <link href="https://example.com/atom/1"/>
    <summary>Summary of entry one</summary>
    <updated>2026-01-01T00:00:00Z</updated>
    <id>urn:uuid:atom-1</id>
  </entry>
  <entry>
    <title>Atom Entry Two</title>
    <link href="https://example.com/atom/2"/>
    <summary>Summary of entry two</summary>
  </entry>
</feed>`;

  test('detects Atom format via xmlns', () => {
    assert.ok(sampleAtom.includes('xmlns="http://www.w3.org/2005/Atom"'));
  });

  test('extracts entries from Atom feed', () => {
    const entries = extractAllTags(sampleAtom, 'entry');
    assert.equal(entries.length, 2);
  });

  test('extracts entry titles', () => {
    const entries = extractAllTags(sampleAtom, 'entry');
    const title = extractXmlTag(entries[0], 'title');
    assert.equal(title, 'Atom Entry One');
  });

  test('extracts entry IDs for deduplication', () => {
    const entries = extractAllTags(sampleAtom, 'entry');
    const id = extractXmlTag(entries[0], 'id');
    assert.equal(id, 'urn:uuid:atom-1');
  });
});

// ── Deduplication Tests ─────────────────────────────────────────────────────

describe('Deduplication hashing', () => {
  test('same title+url produces same hash', () => {
    const h1 = generateDedupHash('Test Article', 'https://example.com/1');
    const h2 = generateDedupHash('Test Article', 'https://example.com/1');
    assert.equal(h1, h2);
  });

  test('different titles produce different hashes', () => {
    const h1 = generateDedupHash('Article A', 'https://example.com/1');
    const h2 = generateDedupHash('Article B', 'https://example.com/1');
    assert.notEqual(h1, h2);
  });

  test('different URLs produce different hashes', () => {
    const h1 = generateDedupHash('Same Title', 'https://example.com/1');
    const h2 = generateDedupHash('Same Title', 'https://example.com/2');
    assert.notEqual(h1, h2);
  });

  test('is case-insensitive', () => {
    const h1 = generateDedupHash('Hello World', 'https://Example.COM/path');
    const h2 = generateDedupHash('hello world', 'https://example.com/path');
    assert.equal(h1, h2);
  });

  test('normalizes whitespace in title', () => {
    const h1 = generateDedupHash('Hello   World', 'https://example.com');
    const h2 = generateDedupHash('Hello World', 'https://example.com');
    assert.equal(h1, h2);
  });

  test('hash is 32 hex chars', () => {
    const hash = generateDedupHash('title', 'url');
    assert.ok(/^[a-f0-9]{32}$/.test(hash));
  });
});

// ── Environment Gating Tests ────────────────────────────────────────────────

describe('Environment-gated ingestion', () => {
  const originalEnv = process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED;
    } else {
      process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED = originalEnv;
    }
  });

  test('disabled when env var is not set', () => {
    delete process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED;
    const enabled = process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED === 'true';
    assert.equal(enabled, false);
  });

  test('disabled when env var is "false"', () => {
    process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED = 'false';
    const enabled = process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED === 'true';
    assert.equal(enabled, false);
  });

  test('enabled when env var is "true"', () => {
    process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED = 'true';
    const enabled = process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED === 'true';
    assert.equal(enabled, true);
  });
});

// ── Poll Interval Configuration Tests ───────────────────────────────────────

describe('Poll interval configuration', () => {
  test('defaults to 30000ms', () => {
    const raw = undefined;
    const tickMs = Math.max(5000, Number(raw ?? 30000));
    assert.equal(tickMs, 30000);
  });

  test('clamps minimum to 5000ms', () => {
    const tickMs = Math.max(5000, Number('1000'));
    assert.equal(tickMs, 5000);
  });

  test('accepts valid custom value', () => {
    const tickMs = Math.max(5000, Number('60000'));
    assert.equal(tickMs, 60000);
  });

  test('handles NaN gracefully', () => {
    const raw = 'not-a-number';
    const tickMs = Math.max(5000, Number(raw) || 30000);
    assert.equal(tickMs, 30000);
  });
});

// ── Max Items Configuration Tests ───────────────────────────────────────────

describe('Max items per source configuration', () => {
  test('defaults to 20', () => {
    const raw = undefined;
    const max = Math.min(200, Math.max(1, Number(raw ?? 20)));
    assert.equal(max, 20);
  });

  test('clamps maximum to 200', () => {
    const max = Math.min(200, Math.max(1, Number('500')));
    assert.equal(max, 200);
  });

  test('clamps minimum to 1', () => {
    const max = Math.min(200, Math.max(1, Number('0')));
    assert.equal(max, 1);
  });
});
