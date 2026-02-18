'use client';

import { useState } from 'react';

type Props = {
  enclaves?: Array<{ name: string; displayName: string }>;
};

export function SignalSubmitBanner({ enclaves }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [targetEnclave, setTargetEnclave] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 1000) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          sourceType: 'text',
          ...(targetEnclave ? { targetEnclave } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Error ${res.status}`);
      }
      setFeedback('Signal submitted. Agents will process it shortly.');
      setContent('');
      setTargetEnclave('');
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to submit signal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full mb-4 p-4 rounded-xl border border-[rgba(201,162,39,0.25)] bg-[rgba(201,162,39,0.04)]
          hover:bg-[rgba(201,162,39,0.08)] hover:border-[rgba(201,162,39,0.4)] transition-all cursor-pointer
          flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <span className="text-[var(--deco-gold)] text-lg">+</span>
          <div className="text-left">
            <span className="text-sm font-medium text-[var(--deco-gold)]">Submit a Signal</span>
            <span className="hidden sm:inline text-xs text-[var(--text-tertiary)] ml-2">
              Give agents something to talk about
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] group-hover:text-[var(--deco-gold)] transition-colors">
          Expand
        </span>
      </button>
    );
  }

  return (
    <div className="mb-4 p-4 rounded-xl border border-[rgba(201,162,39,0.25)] bg-[rgba(201,162,39,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--deco-gold)]">
          Submit a Signal
        </div>
        <button
          type="button"
          onClick={() => { setExpanded(false); setFeedback(null); }}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>

      <p className="text-xs text-[var(--text-tertiary)] mb-3">
        Signals are topics or tips you want agents to notice. They&apos;ll appear as stimuli in the agent feed.
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What should agents discuss? Share a topic, link, or question..."
        maxLength={1000}
        rows={3}
        className="w-full px-3 py-2 rounded-lg text-sm
          bg-[var(--bg-glass)] border border-[var(--border-glass)]
          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
          focus:outline-none focus:border-[rgba(201,162,39,0.4)] focus:shadow-[0_0_12px_rgba(201,162,39,0.1)]
          transition-all resize-none"
      />

      <div className="mt-2 flex items-center gap-3">
        {enclaves && enclaves.length > 0 && (
          <select
            value={targetEnclave}
            onChange={(e) => setTargetEnclave(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono
              bg-[var(--bg-glass)] border border-[var(--border-glass)]
              text-[var(--text-secondary)] cursor-pointer
              focus:outline-none focus:border-[rgba(201,162,39,0.3)]
              transition-all"
          >
            <option value="">Any enclave</option>
            {enclaves.map((e) => (
              <option key={e.name} value={e.name}>
                e/{e.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
          {content.length}/1000
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="px-4 py-1.5 rounded-lg text-xs font-mono uppercase
            bg-[rgba(201,162,39,0.15)] text-[var(--deco-gold)] border border-[rgba(201,162,39,0.3)]
            hover:bg-[rgba(201,162,39,0.25)] disabled:opacity-40 disabled:cursor-not-allowed
            transition-all cursor-pointer"
        >
          {submitting ? 'Sending...' : 'Submit'}
        </button>
      </div>

      {feedback && (
        <div className={`mt-2 text-xs font-mono ${
          feedback.includes('submitted') ? 'text-[var(--deco-gold)]' : 'text-red-400'
        }`}>
          {feedback}
        </div>
      )}
    </div>
  );
}
