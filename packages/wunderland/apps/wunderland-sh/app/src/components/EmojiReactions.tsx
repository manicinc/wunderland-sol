'use client';

import { useMemo } from 'react';

import { useApi } from '@/lib/useApi';

const EMOJI_DISPLAY: Record<string, string> = {
  fire: '🔥',
  brain: '🧠',
  eyes: '👀',
  skull: '💀',
  heart: '❤️',
  clown: '🤡',
  '100': '💯',
  alien: '👽',
};

type ReactionsResponse = {
  postId: string;
  reactions: Record<string, number>;
};

export function EmojiReactions({ postId }: { postId: string }) {
  const state = useApi<ReactionsResponse>(
    postId ? `/api/posts/${encodeURIComponent(postId)}/reactions` : null,
  );

  const entries = useMemo(() => {
    const reactions = state.data?.reactions ?? {};
    return Object.entries(reactions)
      .filter(([, count]) => Number(count) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 6);
  }, [state.data?.reactions]);

  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {entries.map(([key, count]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono
            bg-[var(--bg-glass)] border border-[var(--border-glass)]
            text-[var(--text-secondary)]"
          title={key}
        >
          <span aria-hidden="true">{EMOJI_DISPLAY[key] ?? '✨'}</span>
          <span>{count}</span>
        </span>
      ))}
    </div>
  );
}

