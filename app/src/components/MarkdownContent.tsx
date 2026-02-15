'use client';

import React from 'react';

/**
 * Lightweight markdown renderer — no external dependencies.
 * Handles: headers, code blocks, inline code, lists, blockquotes,
 * horizontal rules, images, links, bold, italic, and line breaks.
 */

// Inline patterns: inline code, images, links, bold, italic
const INLINE_PATTERN =
  /`([^`]+)`|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*([^*]+)\*/g;

function parseInline(text: string, keyOffset: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = keyOffset;

  INLINE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Inline code: `code`
      nodes.push(
        <code
          key={`md-${key++}`}
          className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[var(--neon-cyan)] text-[0.9em] font-mono"
        >
          {match[1]}
        </code>,
      );
    } else if (match[3] !== undefined && text[match.index] === '!') {
      // Image: ![alt](url)
      nodes.push(
        <img
          key={`md-${key++}`}
          src={match[3]}
          alt={match[2] || ''}
          className="max-w-full rounded-lg my-2 block"
          loading="lazy"
        />,
      );
    } else if (match[4] !== undefined && match[5] !== undefined) {
      // Link: [text](url)
      nodes.push(
        <a
          key={`md-${key++}`}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--neon-cyan)] hover:underline"
        >
          {match[4]}
        </a>,
      );
    } else if (match[6] !== undefined) {
      // Bold: **text**
      nodes.push(<strong key={`md-${key++}`}>{match[6]}</strong>);
    } else if (match[7] !== undefined) {
      // Italic: *text*
      nodes.push(<em key={`md-${key++}`}>{match[7]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; lang: string; lines: string[] }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'hr' }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'paragraph'; lines: string[] };

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', lang, lines: codeLines });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1]!.length, text: headingMatch[2]! });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ') || line === '>') {
      const bqLines: string[] = [];
      while (i < lines.length && (lines[i]!.startsWith('> ') || lines[i] === '>')) {
        bqLines.push(lines[i]!.replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: bqLines });
      continue;
    }

    // Unordered list
    if (/^[\-\*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^[\-\*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !lines[i]!.match(/^```/) &&
      !lines[i]!.match(/^#{1,6}\s/) &&
      !lines[i]!.match(/^(-{3,}|\*{3,}|_{3,})\s*$/) &&
      !lines[i]!.startsWith('> ') &&
      !lines[i]!.match(/^[\-\*]\s+/) &&
      !lines[i]!.match(/^\d+\.\s+/)
    ) {
      paraLines.push(lines[i]!);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: paraLines });
    }
  }

  return blocks;
}

const HEADING_STYLES: Record<number, string> = {
  1: 'text-xl font-display font-bold mt-5 mb-3 text-[var(--text-primary)]',
  2: 'text-lg font-display font-semibold mt-4 mb-2 text-[var(--text-primary)]',
  3: 'text-base font-display font-semibold mt-3 mb-2 text-[var(--text-primary)]',
  4: 'text-sm font-display font-semibold mt-3 mb-1 text-[var(--text-secondary)]',
  5: 'text-xs font-display font-semibold mt-2 mb-1 text-[var(--text-secondary)]',
  6: 'text-xs font-display font-medium mt-2 mb-1 text-[var(--text-tertiary)]',
};

function renderBlock(block: Block, idx: number): React.ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return (
        <Tag key={idx} className={HEADING_STYLES[block.level] || HEADING_STYLES[3]}>
          {parseInline(block.text, idx * 1000)}
        </Tag>
      );
    }

    case 'code':
      return (
        <pre
          key={idx}
          className="my-3 p-4 rounded-lg bg-[rgba(0,0,0,0.4)] border border-[var(--border-glass)] overflow-x-auto"
        >
          <code className="text-xs font-mono text-[var(--text-secondary)] leading-relaxed whitespace-pre">
            {block.lines.join('\n')}
          </code>
        </pre>
      );

    case 'blockquote':
      return (
        <blockquote
          key={idx}
          className="my-3 pl-4 border-l-2 border-[var(--neon-cyan)] text-[var(--text-secondary)] italic"
        >
          {block.lines.map((line, li) => (
            <React.Fragment key={li}>
              {li > 0 && <br />}
              {parseInline(line, idx * 1000 + li * 100)}
            </React.Fragment>
          ))}
        </blockquote>
      );

    case 'hr':
      return (
        <hr key={idx} className="my-4 border-t border-[var(--border-glass)]" />
      );

    case 'ul':
      return (
        <ul key={idx} className="my-2 ml-5 list-disc space-y-1">
          {block.items.map((item, li) => (
            <li key={li} className="text-sm text-[var(--text-primary)]">
              {parseInline(item, idx * 1000 + li * 100)}
            </li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol key={idx} className="my-2 ml-5 list-decimal space-y-1">
          {block.items.map((item, li) => (
            <li key={li} className="text-sm text-[var(--text-primary)]">
              {parseInline(item, idx * 1000 + li * 100)}
            </li>
          ))}
        </ol>
      );

    case 'paragraph':
      return (
        <p key={idx} className="my-2">
          {block.lines.map((line, li) => (
            <React.Fragment key={li}>
              {li > 0 && <br />}
              {parseInline(line, idx * 1000 + li * 100)}
            </React.Fragment>
          ))}
        </p>
      );
  }
}

export function MarkdownContent({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseBlocks(content);

  return (
    <div className={className}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
