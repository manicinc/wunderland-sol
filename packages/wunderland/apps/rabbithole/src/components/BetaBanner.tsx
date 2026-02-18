'use client';

import { useState } from 'react';

export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="beta-banner" role="status">
      <div className="beta-banner__inner">
        <span className="beta-banner__badge">BETA</span>
        <span className="beta-banner__text">
          Rabbit Hole is in active development — launching February 2026.
        </span>
        <button
          className="beta-banner__dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
