'use client';

import { useState, useMemo } from 'react';
import { SKILLS, SKILL_CATEGORIES } from '@/data/catalog-data';

interface SkillsPickerProps {
  selected: string[];
  suggested: string[];
  onToggle: (name: string) => void;
}

export default function SkillsPicker({ selected, suggested, onToggle }: SkillsPickerProps) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return SKILLS.filter((s) => {
      if (filter !== 'all' && s.category !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) &&
            !s.displayName.toLowerCase().includes(q) &&
            !s.description.toLowerCase().includes(q) &&
            !s.tags.some((t) => t.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });
  }, [filter, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Skills ({selected.length} selected)
        </div>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{SKILLS.length} available</span>
      </div>

      <input
        type="text"
        placeholder="Search skills..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-primary)] text-xs font-mono placeholder-[var(--text-tertiary)] outline-none focus:border-[rgba(0,245,255,0.4)] transition-colors mb-3"
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {SKILL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`px-2 py-1 rounded-full border text-[0.6rem] uppercase tracking-wider transition-all ${
              filter === cat
                ? 'border-[var(--neon-cyan)] bg-[rgba(0,245,255,0.1)] text-[var(--neon-cyan)]'
                : 'border-[var(--border-glass)] text-[var(--text-tertiary)] hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((skill) => {
          const isSelected = selected.includes(skill.name);
          const isSuggested = suggested.includes(skill.name);

          return (
            <button
              key={skill.name}
              type="button"
              onClick={() => onToggle(skill.name)}
              className={`text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-[rgba(0,245,255,0.06)] border-[rgba(0,245,255,0.25)] shadow-[0_0_8px_rgba(0,245,255,0.08)]'
                  : 'bg-[var(--bg-glass)] border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:border-[rgba(0,245,255,0.15)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold ${isSelected ? 'text-[var(--neon-cyan)]' : 'text-[var(--text-primary)]'}`}>
                  {skill.displayName}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isSuggested && (
                    <span className="text-[0.5rem] font-mono px-1.5 py-0.5 rounded bg-[rgba(153,69,255,0.1)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.2)]">
                      Suggested
                    </span>
                  )}
                  <span className={`text-[0.55rem] font-mono px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-[rgba(0,245,255,0.15)] text-[var(--neon-cyan)]'
                      : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)]'
                  }`}>
                    {skill.category}
                  </span>
                </div>
              </div>
              <p className="text-[0.65rem] text-[var(--text-tertiary)] mt-1 line-clamp-2 leading-relaxed">
                {skill.description}
              </p>
              {skill.requiredSecrets.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {skill.requiredSecrets.map((s) => (
                    <span key={s} className="text-[0.5rem] font-mono px-1 py-0.5 rounded bg-[rgba(255,215,0,0.08)] text-[var(--deco-gold)] border border-[rgba(255,215,0,0.12)]">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-6 text-[var(--text-tertiary)] text-xs">
          No skills match your search.
        </div>
      )}
    </div>
  );
}
