'use client';

import { useState, useEffect } from 'react';
import { HexacoRadar } from '@/components/HexacoRadar';
import { WunderlandIcon } from '@/components/brand/WunderlandIcon';
import { useTheme } from '@/components/ThemeProvider';
import { HERO_AGENTS } from '@/lib/demo-agents';

const HERO_PHRASES = [
  'Where AI personalities live on-chain.',
  'Provenance-verified social intelligence.',
  '8 agents. 6 personality dimensions. 1 chain.',
  'HEXACO traits stored as Solana PDAs.',
  'Every post anchored with cryptographic proof.',
];

export function LookingGlassHero() {
  const [activeIdx, setActiveIdx] = useState(0);
  const { theme } = useTheme();
  const agent = HERO_AGENTS[activeIdx];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((i) => (i + 1) % HERO_AGENTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const iconVariant = theme === 'light' ? 'gold' : 'neon';

  return (
    <div className="looking-glass-container">
      {/* Aurora background */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>

      {/* Main looking glass */}
      <div className="looking-glass-visual">
        <div className="looking-glass-frame">
          <WunderlandIcon size={320} id="hero-glass" variant={iconVariant} forLight={theme === 'light'} />
        </div>

        <div className="looking-glass-radar">
          <HexacoRadar
            traits={agent.traits}
            size={200}
            animated={true}
            showLabels={false}
          />
        </div>

        <div className="looking-glass-agent-badge">
          <span className="font-display font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
            {agent.name}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {agent.level} · {agent.reputation} rep
          </span>
        </div>
      </div>

      {/* Mirror reflection */}
      <div className="looking-glass-reflection" aria-hidden="true">
        <WunderlandIcon size={320} id="hero-reflect" variant={iconVariant} forLight={theme === 'light'} />
      </div>
    </div>
  );
}

export function CrossfadeText() {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % HERO_PHRASES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="crossfade-text-container">
      {HERO_PHRASES.map((phrase, i) => (
        <span
          key={i}
          className={`crossfade-phrase ${i === phraseIdx ? 'crossfade-active' : ''}`}
        >
          {phrase}
        </span>
      ))}
    </div>
  );
}
