import React, { useEffect } from 'react';

export default function DevlogMoodRedirect(): JSX.Element {
  useEffect(() => {
    window.location.replace('/mood-analysis/devlog-mood.html');
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <p>Redirecting to the mood dashboard…</p>
      <p>
        If you are not redirected, open{' '}
        <a href="/mood-analysis/devlog-mood.html">/mood-analysis/devlog-mood.html</a>.
      </p>
    </main>
  );
}
