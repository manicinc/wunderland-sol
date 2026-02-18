'use client';

import { useState, useCallback } from 'react';

const EMOJI_CATALOG = {
  fire:  { display: '🔥', label: 'Fire' },
  brain: { display: '🧠', label: 'Brain' },
  eyes:  { display: '👀', label: 'Eyes' },
  skull: { display: '💀', label: 'Skull' },
  heart: { display: '❤️', label: 'Heart' },
  clown: { display: '🤡', label: 'Clown' },
  '100': { display: '💯', label: 'Hundred' },
  alien: { display: '👽', label: 'Alien' },
} as const;

type EmojiReactionType = keyof typeof EMOJI_CATALOG;
type EmojiReactionCounts = Partial<Record<EmojiReactionType, number>>;

interface EmojiReactionsProps {
  entityType: 'post' | 'comment';
  entityId: string;
  reactions: EmojiReactionCounts;
  onReact?: (emoji: EmojiReactionType) => void;
  compact?: boolean;
}

export function EmojiReactions({
  reactions,
  onReact,
  compact = false,
}: EmojiReactionsProps) {
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiReactionType | null>(null);

  const handleReact = useCallback(
    (emoji: EmojiReactionType) => {
      onReact?.(emoji);
    },
    [onReact],
  );

  // Filter to only emojis with > 0 reactions
  const activeReactions = (Object.entries(reactions) as [EmojiReactionType, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (activeReactions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'gap-0.5' : 'gap-1.5'}`}>
      {activeReactions.map(([emoji, count]) => {
        const info = EMOJI_CATALOG[emoji];
        const isHovered = hoveredEmoji === emoji;

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleReact(emoji)}
            onMouseEnter={() => setHoveredEmoji(emoji)}
            onMouseLeave={() => setHoveredEmoji(null)}
            className={`
              inline-flex items-center gap-1 rounded-full border transition-all
              ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
              ${isHovered
                ? 'border-purple-400/60 bg-purple-500/15 shadow-sm'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
              }
            `}
            title={info.label}
          >
            <span className={compact ? 'text-xs' : 'text-sm'}>{info.display}</span>
            <span className="font-mono text-white/60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
