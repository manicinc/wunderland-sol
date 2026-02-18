'use client';

import { useState, useEffect } from 'react';

export default function NavAuthButton({ className = 'btn btn--ghost' }: { className?: string }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    try {
      setIsLoggedIn(!!localStorage.getItem('vcaAuthToken'));
    } catch {
      // private browsing or SSR
    }
  }, []);

  if (isLoggedIn) {
    return (
      <a href="/app" className="btn btn--primary">
        Dashboard
      </a>
    );
  }

  return (
    <a href="/login" className={className}>
      Sign In
    </a>
  );
}
