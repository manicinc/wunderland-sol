'use client';

import { useState } from 'react';

export interface RecommendationItem {
  id: string;
  category: 'skill' | 'tool' | 'channel';
  itemId: string;
  displayName: string;
  reasoning: string;
  confidence: number;
  accepted: boolean;
}

interface RecommendationCardProps {
  item: RecommendationItem;
  onToggle: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  skill: '#8b5cf6',
  tool: '#00f5ff',
  channel: '#10ffb0',
};

export function RecommendationCard({ item, onToggle }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORY_COLORS[item.category] ?? '#8888a0';
  const confidencePct = Math.round(item.confidence * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 12px',
        borderRadius: 8,
        border: `1px solid ${item.accepted ? color : 'rgba(255,255,255,0.08)'}`,
        background: item.accepted ? `${color}10` : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        opacity: item.accepted ? 1 : 0.5,
      }}
      onClick={() => onToggle(item.id)}
      title={`Click to ${item.accepted ? 'remove' : 'add'}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Toggle indicator */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            border: `2px solid ${color}`,
            background: item.accepted ? color : 'transparent',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.accepted && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Name */}
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.8125rem',
            color: 'var(--color-text)',
            flex: 1,
          }}
        >
          {item.displayName}
        </span>

        {/* Confidence badge */}
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            color: confidencePct >= 80 ? '#10ffb0' : confidencePct >= 60 ? '#ffd700' : '#ff6b6b',
            opacity: 0.8,
          }}
        >
          {confidencePct}%
        </span>

        {/* Expand arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.75rem',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
          aria-label={expanded ? 'Collapse reasoning' : 'Expand reasoning'}
        >
          ▼
        </button>
      </div>

      {/* Reasoning (expandable) */}
      {expanded && (
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.75rem',
            color: 'var(--color-text-dim)',
            lineHeight: 1.4,
            paddingLeft: 24,
            paddingTop: 4,
          }}
        >
          {item.reasoning}
        </div>
      )}
    </div>
  );
}
