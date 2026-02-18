'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/styles/landing.scss';

function AdminLoginForm() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/admin';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push(redirect);
            } else {
                const data = await res.json();
                setError(data.error || 'Authentication failed');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel panel--holographic" style={{ width: '100%', maxWidth: 400, padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div className="nav__logo" style={{ margin: '0 auto 1rem', width: 56, height: 56 }}>
                    <span style={{ fontSize: '1.5rem' }}>R</span>
                </div>
                <h1 className="heading-3" style={{ marginBottom: '0.5rem' }}>Admin Access</h1>
                <p className="text-label">Enter password to continue</p>
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="cta__input"
                    style={{ width: '100%', marginBottom: '1rem' }}
                    autoFocus
                />

                {error && (
                    <div className="badge badge--coral" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem', padding: '0.75rem' }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn--primary"
                    style={{ width: '100%' }}
                    disabled={loading || !password}
                >
                    {loading ? 'Authenticating...' : 'Enter'}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <a href="/" className="text-label" style={{ color: 'var(--color-text-muted)' }}>
                    ← Back to Home
                </a>
            </div>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="panel panel--holographic" style={{ width: '100%', maxWidth: 400, padding: '2.5rem', textAlign: 'center' }}>
            <div className="text-label">Loading...</div>
        </div>
    );
}

export default function AdminLogin() {
    return (
        <div className="landing" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="grid-bg" />
            <div className="glow-orb glow-orb--cyan" />

            <Suspense fallback={<LoadingFallback />}>
                <AdminLoginForm />
            </Suspense>
        </div>
    );
}
