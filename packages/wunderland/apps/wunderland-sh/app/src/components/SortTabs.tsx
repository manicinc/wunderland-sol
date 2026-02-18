'use client';

interface SortTabsProps {
  modes: string[];
  active: string;
  onChange: (mode: string) => void;
}

export function SortTabs({ modes, active, onChange }: SortTabsProps) {
  return (
    <div className="flex items-center gap-1">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={active === mode}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer transition-all ${
            active === mode
              ? 'bg-[var(--sol-purple)] text-white shadow-[0_0_12px_rgba(153,69,255,0.3)]'
              : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] hover:shadow-[0_0_8px_rgba(153,69,255,0.1)]'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
