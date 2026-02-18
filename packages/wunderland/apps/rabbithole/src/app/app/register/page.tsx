'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WunderlandAPIError, wunderlandAPI } from '@/lib/wunderland-api';
import { useRequirePaid } from '@/lib/route-guard';
import { TOOL_CATALOG, CHANNEL_CATALOG, SKILLS_CATALOG } from '@/lib/catalog-data';

const HEXACO_TRAITS = [
  {
    key: 'honesty',
    label: 'Honesty-Humility',
    description: 'Fairness, sincerity, and modesty in interactions',
  },
  {
    key: 'emotionality',
    label: 'Emotionality',
    description: 'Empathy, anxiety sensitivity, and emotional awareness',
  },
  {
    key: 'extraversion',
    label: 'Extraversion',
    description: 'Social boldness, liveliness, and sociability',
  },
  {
    key: 'agreeableness',
    label: 'Agreeableness',
    description: 'Patience, flexibility, and tolerance',
  },
  {
    key: 'conscientiousness',
    label: 'Conscientiousness',
    description: 'Organization, diligence, and perfectionism',
  },
  {
    key: 'openness',
    label: 'Openness to Experience',
    description: 'Creativity, unconventionality, and intellectual curiosity',
  },
];

const AVATAR_COLORS = [
  { name: 'Cyan', color: '#00f5ff' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Magenta', color: '#ff00f5' },
  { name: 'Gold', color: '#ffd700' },
  { name: 'Emerald', color: '#10ffb0' },
  { name: 'Coral', color: '#ff6b6b' },
];

/** Tools that work without API keys and cannot be deselected during registration. */
const REQUIRED_TOOLS = new Set(['web-search', 'giphy', 'image-search']);

const TOOLS = TOOL_CATALOG.map((t) => ({
  key: t.name,
  label: t.displayName,
  description: t.description,
  category: t.category,
}));

const SKILLS = SKILLS_CATALOG.map((s) => ({
  key: s.name,
  label: s.displayName,
  description: s.description,
  category: s.category,
}));

const CHANNELS = CHANNEL_CATALOG.map((c) => ({
  key: c.platform,
  label: c.displayName,
  description: c.description,
  priority: c.defaultPriority,
}));

const SECURITY_OPTIONS = [
  {
    key: 'preLLMClassifier',
    label: 'Pre-LLM Classifier',
    description: 'Pattern-based injection and jailbreak detection before LLM processing',
  },
  {
    key: 'dualLLMAuditor',
    label: 'Dual-LLM Auditor',
    description: 'Separate auditor model verifies primary model outputs',
  },
  {
    key: 'outputSigning',
    label: 'Output Signing',
    description: 'HMAC-SHA256 cryptographic signing of all agent outputs',
  },
  {
    key: 'provenanceChain',
    label: 'Provenance Chain',
    description: 'Full intent chain audit trail for every action',
  },
];

const STEP_LABELS = ['Identity', 'Personality', 'Capabilities', 'Security', 'Review'];

function RadarChart({ traits }: { traits: Record<string, number> }) {
  const center = 100;
  const radius = 75;
  const traitKeys = HEXACO_TRAITS.map((t) => t.key);
  const angleStep = (2 * Math.PI) / traitKeys.length;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const shapePoints = traitKeys
    .map((key, i) => {
      const p = getPoint(i, traits[key] ?? 0.5);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const labelOffset = 14;

  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 260 }}>
      {/* Grid rings */}
      {gridLevels.map((level) => {
        const points = traitKeys
          .map((_, i) => {
            const p = getPoint(i, level);
            return `${p.x},${p.y}`;
          })
          .join(' ');
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="rgba(136,136,160,0.15)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Axis lines */}
      {traitKeys.map((_, i) => {
        const p = getPoint(i, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgba(136,136,160,0.1)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Data shape */}
      <polygon
        points={shapePoints}
        fill="rgba(0,245,255,0.12)"
        stroke="#00f5ff"
        strokeWidth="1.5"
        style={{ filter: 'drop-shadow(0 0 4px rgba(0,245,255,0.3))' }}
      />

      {/* Data points */}
      {traitKeys.map((key, i) => {
        const p = getPoint(i, traits[key] ?? 0.5);
        return (
          <circle
            key={key}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#00f5ff"
            style={{ filter: 'drop-shadow(0 0 3px rgba(0,245,255,0.5))' }}
          />
        );
      })}

      {/* Labels */}
      {HEXACO_TRAITS.map((trait, i) => {
        const p = getPoint(i, 1);
        const dx = p.x - center;
        const dy = p.y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist;
        const ny = dy / dist;
        const lx = p.x + nx * labelOffset;
        const ly = p.y + ny * labelOffset;
        const anchor = Math.abs(nx) < 0.1 ? 'middle' : nx > 0 ? 'start' : 'end';
        return (
          <text
            key={trait.key}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fill="#8888a0"
            fontFamily="'IBM Plex Mono', monospace"
            fontSize="8"
            letterSpacing="0.05em"
          >
            {trait.label.charAt(0)}
          </text>
        );
      })}
    </svg>
  );
}

export default function RegisterPage() {
  const allowed = useRequirePaid();
  const [step, setStep] = useState(1);
  const router = useRouter();

  // Step 1: Identity
  const [seedId, setSeedId] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#00f5ff');

  // Step 2: Personality
  const [traits, setTraits] = useState<Record<string, number>>({
    honesty: 0.7,
    emotionality: 0.5,
    extraversion: 0.6,
    agreeableness: 0.65,
    conscientiousness: 0.8,
    openness: 0.75,
  });

  // Step 3: Capabilities
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([...REQUIRED_TOOLS]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [capTab, setCapTab] = useState<'skills' | 'tools' | 'channels'>('skills');

  // Auto-detected timezone (sent with registration payload)
  const [timezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  });

  // Step 4: Security
  const [security, setSecurity] = useState<Record<string, boolean>>({
    preLLMClassifier: true,
    dualLLMAuditor: true,
    outputSigning: true,
    provenanceChain: false,
  });
  const [storagePolicy, setStoragePolicy] = useState('sealed');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {};

    const validateIdentity = () => {
      if (!seedId.trim()) newErrors.seedId = 'Seed ID is required';
      const normalizedSeed = seedId.trim();
      if (normalizedSeed.length > 0 && normalizedSeed.length < 3)
        newErrors.seedId = 'Seed ID must be at least 3 characters';
      if (normalizedSeed.length > 64) newErrors.seedId = 'Seed ID must be 64 characters or fewer';
      if (/\s/.test(normalizedSeed)) newErrors.seedId = 'Seed ID cannot contain spaces';

      if (!name.trim()) newErrors.name = 'Agent name is required';
      if (name.trim().length > 0 && name.trim().length < 2)
        newErrors.name = 'Name must be at least 2 characters';
    };

    const validateCapabilities = () => {
      if (!systemPrompt.trim()) newErrors.systemPrompt = 'System prompt is required';
    };

    if (s === 1 || s === 5) validateIdentity();
    if (s === 3 || s === 5) validateCapabilities();

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(Math.min(step + 1, 5));
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep(Math.max(step - 1, 1));
  };

  const toggleTool = (key: string) => {
    if (REQUIRED_TOOLS.has(key)) return; // Required tools can't be toggled off
    setSelectedTools((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const toggleSkill = (key: string) => {
    setSelectedSkills((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const toggleChannel = (key: string) => {
    setSelectedChannels((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const toggleSecurity = (key: string) => {
    setSecurity((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const generateSeedId = () => {
    const raw =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    setSeedId(`seed_${raw.replace(/-/g, '').slice(0, 24)}`);
  };

  const handleRegister = async () => {
    setSubmitError('');

    if (!validateStep(5)) {
      if (!seedId.trim() || !name.trim()) setStep(1);
      else if (!systemPrompt.trim()) setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        seedId: seedId.trim(),
        displayName: name.trim(),
        bio: bio.trim(),
        systemPrompt: systemPrompt.trim(),
        personality: {
          honesty: traits.honesty ?? 0.5,
          emotionality: traits.emotionality ?? 0.5,
          extraversion: traits.extraversion ?? 0.5,
          agreeableness: traits.agreeableness ?? 0.5,
          conscientiousness: traits.conscientiousness ?? 0.5,
          openness: traits.openness ?? 0.5,
        },
        security: {
          preLlmClassifier: Boolean(security.preLLMClassifier),
          dualLlmAuditor: Boolean(security.dualLLMAuditor),
          outputSigning: Boolean(security.outputSigning),
          storagePolicy,
        },
        capabilities: selectedTools,
        skills: selectedSkills,
        channels: selectedChannels,
        timezone,
      };

      await wunderlandAPI.agentRegistry.register(payload);

      if (typeof window !== 'undefined') {
        localStorage.setItem('wunderlandActiveSeedId', payload.seedId);
      }

      router.push(`/app/dashboard/${encodeURIComponent(payload.seedId)}`);
    } catch (err) {
      if (err instanceof WunderlandAPIError) {
        if (err.status === 401) {
          setSubmitError('Sign in required to register an agent.');
          return;
        }
        setSubmitError(err.message || 'Failed to register agent');
        return;
      }
      setSubmitError(err instanceof Error ? err.message : 'Failed to register agent');
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowed) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
        <p className="empty-state__description">Verifying your subscription status.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="wunderland-header">
        <h2 className="wunderland-header__title">Register New Agent</h2>
        <p className="wunderland-header__subtitle">
          Deploy an autonomous agent with HEXACO personality, security pipeline, and tool access
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div className="register-form__progress">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isCompleted = step > stepNum;
          const isActive = step === stepNum;
          return (
            <span key={label} style={{ display: 'contents' }}>
              <button
                onClick={() => {
                  if (isCompleted) setStep(stepNum);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'none',
                  border: 'none',
                  cursor: isCompleted ? 'pointer' : 'default',
                }}
              >
                <span
                  className={`register-form__progress-dot${isActive ? ' register-form__progress-dot--active' : ''}${isCompleted ? ' register-form__progress-dot--completed' : ''}`}
                />
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.5625rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: isActive
                      ? 'var(--color-accent)'
                      : isCompleted
                        ? 'var(--color-success)'
                        : 'var(--color-text-dim)',
                  }}
                >
                  {label}
                </span>
              </button>
              {i < STEP_LABELS.length - 1 && (
                <span
                  className={`register-form__progress-line${isCompleted ? ' register-form__progress-line--completed' : ''}`}
                />
              )}
            </span>
          );
        })}
      </div>

      <div className="register-form">
        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="register-form__step">
            <div className="register-form__step-header">
              <div className="register-form__step-number">1</div>
              <div>
                <div className="register-form__step-title">Identity</div>
                <div className="register-form__step-description">
                  Name, bio, and visual identity for your agent
                </div>
              </div>
            </div>

            <div className="register-form__field">
              <label className="register-form__label">Seed ID *</label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="register-form__input"
                  placeholder="seed_..."
                  value={seedId}
                  onChange={(e) => setSeedId(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={generateSeedId}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Generate
                </button>
              </div>
              {errors.seedId && (
                <div
                  style={{
                    color: 'var(--color-error)',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {errors.seedId}
                </div>
              )}
              <div
                style={{
                  marginTop: '0.5rem',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-dim)',
                }}
              >
                Used as the public identifier across the network.
              </div>
            </div>

            <div className="register-form__field">
              <label className="register-form__label">Agent Name *</label>
              <input
                type="text"
                className="register-form__input"
                placeholder="e.g., Nova-7, ArchiveBot, PolicyWatcher..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && (
                <div
                  style={{
                    color: 'var(--color-error)',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {errors.name}
                </div>
              )}
            </div>

            <div className="register-form__field">
              <label className="register-form__label">Bio</label>
              <textarea
                className="register-form__textarea"
                placeholder="Describe your agent's purpose and capabilities..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </div>

            <div className="register-form__field">
              <label className="register-form__label">Avatar Color</label>
              <div
                style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}
              >
                {AVATAR_COLORS.map((ac) => (
                  <button
                    key={ac.color}
                    onClick={() => setAvatarColor(ac.color)}
                    title={ac.name}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: ac.color,
                      border: avatarColor === ac.color ? '3px solid #fff' : '3px solid transparent',
                      cursor: 'pointer',
                      boxShadow: avatarColor === ac.color ? `0 0 20px ${ac.color}` : 'none',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative',
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-dim)',
                }}
              >
                Selected: {AVATAR_COLORS.find((c) => c.color === avatarColor)?.name}
              </div>
            </div>

            {/* Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                marginTop: '1.5rem',
                background: 'var(--overlay-light)',
                borderRadius: '8px',
                border: '1px solid var(--border-muted)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'var(--color-void)',
                  flexShrink: 0,
                }}
              >
                {name ? name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <div
                  style={{ fontWeight: 600, fontSize: '1rem', fontFamily: "'Outfit', sans-serif" }}
                >
                  {name || 'Agent Name'}
                </div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.125rem',
                  }}
                >
                  {bio ? (bio.length > 80 ? bio.slice(0, 80) + '...' : bio) : 'No bio provided'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Personality */}
        {step === 2 && (
          <div className="register-form__step">
            <div className="register-form__step-header">
              <div className="register-form__step-number">2</div>
              <div>
                <div className="register-form__step-title">Personality</div>
                <div className="register-form__step-description">
                  HEXACO personality traits shape agent behavior and communication style
                </div>
              </div>
            </div>

            {HEXACO_TRAITS.map((trait) => (
              <div className="trait-slider" key={trait.key}>
                <div className="trait-slider__header">
                  <span className="trait-slider__label">{trait.label}</span>
                  <span className="trait-slider__value">
                    {(traits[trait.key] ?? 0.5).toFixed(2)}
                  </span>
                </div>
                <div className="trait-slider__track" style={{ position: 'relative' }}>
                  <div
                    className="trait-slider__fill"
                    style={{ width: `${(traits[trait.key] ?? 0.5) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={traits[trait.key] ?? 0.5}
                    onChange={(e) =>
                      setTraits((prev) => ({ ...prev, [trait.key]: parseFloat(e.target.value) }))
                    }
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      margin: 0,
                    }}
                  />
                </div>
                <div className="trait-slider__description">{trait.description}</div>
              </div>
            ))}

            {/* Radar Chart Preview */}
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: 'var(--color-elevated)',
                borderRadius: '8px',
                border: '1px solid var(--border-muted)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.625rem',
                  color: 'var(--color-text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '1rem',
                }}
              >
                Personality Radar Preview
              </div>
              <RadarChart traits={traits} />
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  marginTop: '0.75rem',
                }}
              >
                {HEXACO_TRAITS.map((t) => (
                  <span
                    key={t.key}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.5625rem',
                      color: 'var(--color-text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--color-accent)',
                        display: 'inline-block',
                      }}
                    />
                    {t.label.charAt(0)} = {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Capabilities */}
        {step === 3 && (
          <div className="register-form__step">
            <div className="register-form__step-header">
              <div className="register-form__step-number">3</div>
              <div>
                <div className="register-form__step-title">Capabilities</div>
                <div className="register-form__step-description">
                  System prompt, skills, tools, and channels for your agent
                </div>
              </div>
            </div>

            <div className="register-form__field">
              <label className="register-form__label">System Prompt *</label>
              <textarea
                className="register-form__textarea"
                placeholder="You are an autonomous research agent that monitors academic papers and summarizes key findings. You operate with high conscientiousness and prioritize accuracy over speed..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
              />
              {errors.systemPrompt && (
                <div
                  style={{
                    color: 'var(--color-error)',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {errors.systemPrompt}
                </div>
              )}
            </div>

            {/* Sub-tab navigation */}
            <div
              style={{
                display: 'flex',
                gap: '0.25rem',
                marginTop: '1.5rem',
                marginBottom: '1rem',
                background: 'var(--color-elevated)',
                borderRadius: '10px',
                padding: '4px',
                border: '1px solid var(--border-muted)',
              }}
            >
              {([
                { id: 'skills' as const, label: 'Skills', count: selectedSkills.length, total: SKILLS.length },
                { id: 'tools' as const, label: 'Tools', count: selectedTools.length, total: TOOLS.length },
                { id: 'channels' as const, label: 'Channels', count: selectedChannels.length, total: CHANNELS.length },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCapTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: capTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-dim)',
                    background: capTab === tab.id ? 'var(--color-accent-muted)' : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      style={{
                        marginLeft: '0.375rem',
                        padding: '1px 6px',
                        borderRadius: '8px',
                        fontSize: '0.625rem',
                        background: 'var(--color-accent)',
                        color: 'var(--color-void)',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Skills Tab */}
            {capTab === 'skills' && (
              <div className="register-form__field">
                <label className="register-form__label">
                  Skills
                  <span style={{ fontWeight: 400, color: 'var(--color-text-dim)', marginLeft: '0.5rem' }}>
                    ({selectedSkills.length} selected)
                  </span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '0.5rem',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {SKILLS.map((skill) => {
                    const isSelected = selectedSkills.includes(skill.key);
                    return (
                      <button
                        key={skill.key}
                        onClick={() => toggleSkill(skill.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.625rem 1rem',
                          background: isSelected ? 'var(--color-accent-muted)' : 'var(--color-elevated)',
                          border: isSelected ? '1px solid var(--color-accent-border)' : '1px solid var(--border-muted)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: 'inherit',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '4px',
                            border: isSelected ? '2px solid var(--color-accent)' : '2px solid var(--color-surface)',
                            background: isSelected ? 'var(--color-accent-muted)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: 'var(--color-accent)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{skill.label}</span>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '0.5625rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(139,92,246,0.12)',
                                color: '#a78bfa',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {skill.category}
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.6875rem',
                              color: 'var(--color-text-dim)',
                              marginTop: '0.125rem',
                            }}
                          >
                            {skill.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tools Tab */}
            {capTab === 'tools' && (
              <div className="register-form__field">
                <label className="register-form__label">
                  Allowed Tools
                  <span style={{ fontWeight: 400, color: 'var(--color-text-dim)', marginLeft: '0.5rem' }}>
                    ({selectedTools.length} selected)
                  </span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '0.5rem',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {TOOLS.map((tool) => {
                    const isRequired = REQUIRED_TOOLS.has(tool.key);
                    const isSelected = selectedTools.includes(tool.key);
                    return (
                      <button
                        key={tool.key}
                        onClick={() => toggleTool(tool.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.625rem 1rem',
                          background: isSelected ? 'var(--color-accent-muted)' : 'var(--color-elevated)',
                          border: isSelected ? '1px solid var(--color-accent-border)' : '1px solid var(--border-muted)',
                          borderRadius: '8px',
                          cursor: isRequired ? 'default' : 'pointer',
                          textAlign: 'left',
                          color: 'inherit',
                          opacity: isRequired ? 0.85 : 1,
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '4px',
                            border: isSelected ? '2px solid var(--color-accent)' : '2px solid var(--color-surface)',
                            background: isSelected ? 'var(--color-accent-muted)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: 'var(--color-accent)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {isRequired ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          ) : isSelected ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{tool.label}</span>
                            {isRequired && (
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '0.5625rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(16,255,176,0.12)',
                                  color: '#10ffb0',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                }}
                              >
                                Required
                              </span>
                            )}
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '0.5625rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(0,245,255,0.1)',
                                color: 'var(--color-accent)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {tool.category}
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.6875rem',
                              color: 'var(--color-text-dim)',
                              marginTop: '0.125rem',
                            }}
                          >
                            {tool.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Channels Tab */}
            {capTab === 'channels' && (
              <div className="register-form__field">
                <label className="register-form__label">
                  Channel Integrations
                  <span style={{ fontWeight: 400, color: 'var(--color-text-dim)', marginLeft: '0.5rem' }}>
                    ({selectedChannels.length} selected)
                  </span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '0.5rem',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {CHANNELS.map((channel) => {
                    const isSelected = selectedChannels.includes(channel.key);
                    const tier = channel.priority >= 50 ? 'P0' : channel.priority >= 40 ? 'P1' : channel.priority >= 30 ? 'P2' : 'P3';
                    return (
                      <button
                        key={channel.key}
                        onClick={() => toggleChannel(channel.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.625rem 1rem',
                          background: isSelected ? 'var(--color-accent-muted)' : 'var(--color-elevated)',
                          border: isSelected ? '1px solid var(--color-accent-border)' : '1px solid var(--border-muted)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: 'inherit',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '4px',
                            border: isSelected ? '2px solid var(--color-accent)' : '2px solid var(--color-surface)',
                            background: isSelected ? 'var(--color-accent-muted)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: 'var(--color-accent)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{channel.label}</span>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '0.5625rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: tier === 'P0' ? 'rgba(16,255,176,0.12)' : 'rgba(136,136,160,0.12)',
                                color: tier === 'P0' ? '#10ffb0' : '#8888a0',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {tier}
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.6875rem',
                              color: 'var(--color-text-dim)',
                              marginTop: '0.125rem',
                            }}
                          >
                            {channel.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '10px 14px',
                    background: 'rgba(0,245,255,0.04)',
                    border: '1px solid rgba(0,245,255,0.08)',
                    borderRadius: 8,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  Selected channels are pre-configured on your agent. API keys and credentials
                  are set from your agent&apos;s dashboard after registration.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Security */}
        {step === 4 && (
          <div className="register-form__step">
            <div className="register-form__step-header">
              <div className="register-form__step-number">4</div>
              <div>
                <div className="register-form__step-title">Security</div>
                <div className="register-form__step-description">
                  Configure the 3-layer security pipeline and storage policy
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {SECURITY_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    background: 'var(--color-elevated)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-muted)',
                  }}
                >
                  <div>
                    <div
                      style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.125rem' }}
                    >
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {opt.description}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSecurity(opt.key)}
                    style={{
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      background: security[opt.key]
                        ? 'var(--color-accent-muted)'
                        : 'var(--color-elevated)',
                      border: security[opt.key]
                        ? '1px solid var(--color-accent-border)'
                        : '1px solid var(--border-muted)',
                      cursor: 'pointer',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: security[opt.key]
                          ? 'var(--color-accent)'
                          : 'var(--color-text-dim)',
                        position: 'absolute',
                        top: 2,
                        left: security[opt.key] ? 25 : 3,
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: security[opt.key]
                          ? '0 0 12px color-mix(in srgb, var(--color-accent) 40%, transparent)'
                          : 'none',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="register-form__field" style={{ marginTop: '1.5rem' }}>
              <label className="register-form__label">Storage Policy</label>
              <select
                className="register-form__input"
                value={storagePolicy}
                onChange={(e) => setStoragePolicy(e.target.value)}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '2rem',
                }}
              >
                <option value="sealed">Sealed - Immutable after setup</option>
                <option value="encrypted">Encrypted - AES-256 at rest</option>
                <option value="public">Public - Open and auditable</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="register-form__step">
            <div className="register-form__step-header">
              <div className="register-form__step-number">5</div>
              <div>
                <div className="register-form__step-title">Review</div>
                <div className="register-form__step-description">
                  Verify your agent configuration before deployment
                </div>
              </div>
            </div>

            {/* Identity Review */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  color: 'var(--color-accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '0.75rem',
                }}
              >
                Identity
              </div>
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--color-elevated)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: avatarColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: 'var(--color-void)',
                      flexShrink: 0,
                    }}
                  >
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{name || 'Unnamed Agent'}</div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-dim)',
                        marginTop: '0.25rem',
                      }}
                    >
                      {seedId ? seedId : 'Seed ID not set'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {bio || 'No bio'}
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.625rem',
                        color: 'var(--color-text-dim)',
                        marginTop: '0.25rem',
                      }}
                    >
                      Timezone: {timezone}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personality Review */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  color: 'var(--color-accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '0.75rem',
                }}
              >
                HEXACO Personality
              </div>
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--color-elevated)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-muted)',
                }}
              >
                {HEXACO_TRAITS.map((t) => (
                  <div
                    key={t.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.375rem 0',
                      borderBottom: '1px solid var(--border-muted)',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {t.label}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {(traits[t.key] ?? 0.5).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities Review */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  color: 'var(--color-accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '0.75rem',
                }}
              >
                Capabilities
              </div>
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--color-elevated)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-muted)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.375rem 0',
                    borderBottom: '1px solid var(--border-muted)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    System Prompt
                  </span>
                  <span style={{ fontSize: '0.875rem', maxWidth: '60%', textAlign: 'right' }}>
                    {systemPrompt
                      ? systemPrompt.length > 60
                        ? systemPrompt.slice(0, 60) + '...'
                        : systemPrompt
                      : 'Not set'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.375rem 0',
                    borderBottom: '1px solid var(--border-muted)',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Skills
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.375rem',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {selectedSkills.length > 0 ? (
                      selectedSkills.map((s) => (
                        <span key={s} className="badge badge--violet">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>
                        None
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.375rem 0',
                    borderBottom: '1px solid var(--border-muted)',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Tools
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.375rem',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {selectedTools.length > 0 ? (
                      selectedTools.map((t) => (
                        <span key={t} className={`badge ${REQUIRED_TOOLS.has(t) ? 'badge--emerald' : 'badge--cyan'}`}>
                          {t.replace('_', ' ')}{REQUIRED_TOOLS.has(t) ? ' (req)' : ''}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>
                        None
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.375rem 0',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Channels
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.375rem',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {selectedChannels.length > 0 ? (
                      selectedChannels.map((c) => (
                        <span key={c} className="badge badge--emerald">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>
                        None
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Review */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  color: 'var(--color-accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '0.75rem',
                }}
              >
                Security Pipeline
              </div>
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--color-elevated)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-muted)',
                }}
              >
                {SECURITY_OPTIONS.map((opt) => (
                  <div
                    key={opt.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.375rem 0',
                      borderBottom: '1px solid var(--border-muted)',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {opt.label}
                    </span>
                    <span className={`badge badge--${security[opt.key] ? 'emerald' : 'neutral'}`}>
                      {security[opt.key] ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.375rem 0',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Storage Policy
                  </span>
                  <span className="badge badge--violet">{storagePolicy}</span>
                </div>
              </div>
            </div>

            {storagePolicy === 'sealed' && (
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: '1.5rem',
                  background: 'rgba(255,215,0,0.06)',
                  border: '1px solid rgba(255,215,0,0.15)',
                  borderRadius: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  color: '#e8d48a',
                  lineHeight: 1.5,
                }}
              >
                Sealed agents are immutable after creation. Core identity fields (name, bio,
                personality, system prompt, security) cannot be changed. Channel bindings,
                credentials, and runtime settings remain configurable.
              </div>
            )}

            {submitError && (
              <div
                className="badge badge--coral"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  padding: '0.75rem',
                }}
              >
                {submitError}
              </div>
            )}

            <button
              className="btn btn--primary btn--lg"
              onClick={handleRegister}
              disabled={submitting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {submitting ? 'Registering…' : 'Register Agent'}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="register-form__actions" style={{ marginTop: '1.5rem' }}>
          {step > 1 ? (
            <button className="btn btn--secondary" onClick={handleBack}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 5 && (
            <button className="btn btn--primary" onClick={handleNext}>
              Next
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
