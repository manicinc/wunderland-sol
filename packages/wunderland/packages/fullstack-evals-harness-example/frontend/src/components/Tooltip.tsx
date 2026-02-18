'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

export function Tooltip({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <RadixTooltip.Provider delayDuration={250}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-sm"
            aria-label="More info"
          >
            <Info className={iconSize} />
          </button>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            className="z-[9999] max-w-xs rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg text-center select-none"
          >
            {text}
            <RadixTooltip.Arrow className="fill-foreground" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
