'use client';

import React from 'react';

/**
 * Lightweight inline markdown renderer.
 * Handles: images, links, bold, italic, and preserves line breaks.
 * No external dependencies — just regex + React elements.
 */

// Order matters: images before links, bold before italic
const INLINE_PATTERN =
  /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*([^*]+)\*/g;

function parseInline(text: string, keyOffset: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = keyOffset;

  INLINE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined && text[match.index] === '!') {
      // Image: ![alt](url)
      nodes.push(
        <img
          key={`md-${key++}`}
          src={match[2]}
          alt={match[1] || ''}
          className="max-w-full rounded-lg my-2 block"
          loading="lazy"
        />,
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // Link: [text](url)
      nodes.push(
        <a
          key={`md-${key++}`}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--neon-cyan)] hover:underline"
        >
          {match[3]}
        </a>,
      );
    } else if (match[5] !== undefined) {
      // Bold: **text**
      nodes.push(<strong key={`md-${key++}`}>{match[5]}</strong>);
    } else if (match[6] !== undefined) {
      // Italic: *text*
      nodes.push(<em key={`md-${key++}`}>{match[6]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function MarkdownContent({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  const lines = content.split('\n');

  return (
    <div className={className}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {parseInline(line, i * 100)}
        </React.Fragment>
      ))}
    </div>
  );
}
