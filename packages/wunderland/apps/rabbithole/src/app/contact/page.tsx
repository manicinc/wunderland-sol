'use client';

import { useState } from 'react';
import Link from 'next/link';
import '@/styles/landing.scss';
import LandingNav from '@/components/LandingNav';
import { RabbitHoleLogo } from '@/components/brand';

type InquiryType = 'enterprise' | 'general';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [inquiryType, setInquiryType] = useState<InquiryType>('enterprise');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!name || !email) {
      setError('Name and email are required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: inquiryType,
          name,
          email,
          company: company || undefined,
          message: message || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Failed to send message');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing contact-page">
      <LandingNav />
      <div className="grid-bg" />
      <div className="glow-orb glow-orb--cyan" />
      <div className="glow-orb glow-orb--magenta" style={{ right: '10%', top: '30%' }} />

      <div className="panel panel--holographic contact-page__panel">
        <div className="contact-page__header">
          <div style={{ margin: '0 auto 1rem', display: 'flex', justifyContent: 'center' }}>
            <RabbitHoleLogo variant="compact" size="md" href="/" showTagline={false} />
          </div>
          <h1 className="heading-3" style={{ marginBottom: '0.5rem' }}>Contact Us</h1>
          <p className="text-label">Get in touch with the Rabbit Hole team</p>
        </div>

        {success ? (
          <div className="contact-page__success">
            <h2 className="heading-4 text-holographic">Thank You!</h2>
            <p>
              We&apos;ve received your message and will be in touch within 24 hours.
              {inquiryType === 'enterprise' && (
                <> Our enterprise team will reach out to discuss your deployment needs.</>
              )}
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/" className="btn btn--ghost">Back to Home</Link>
              <Link href="/pricing" className="btn btn--secondary">View Pricing</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="contact-page__field">
              <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="cta__input"
                style={{ width: '100%' }}
                required
              />
            </div>

            <div className="contact-page__field">
              <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Work Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="cta__input"
                style={{ width: '100%' }}
                required
              />
            </div>

            <div className="contact-page__field">
              <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className="cta__input"
                style={{ width: '100%' }}
              />
            </div>

            <div className="contact-page__field">
              <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Inquiry Type
              </label>
              <div className="contact-page__radio-group">
                <label className="contact-page__radio-label">
                  <input
                    type="radio"
                    name="inquiryType"
                    value="enterprise"
                    checked={inquiryType === 'enterprise'}
                    onChange={() => setInquiryType('enterprise')}
                  />
                  Enterprise / On-Site
                </label>
                <label className="contact-page__radio-label">
                  <input
                    type="radio"
                    name="inquiryType"
                    value="general"
                    checked={inquiryType === 'general'}
                    onChange={() => setInquiryType('general')}
                  />
                  General Inquiry
                </label>
              </div>
            </div>

            <div className="contact-page__field">
              <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  inquiryType === 'enterprise'
                    ? 'Tell us about your team size, deployment needs, and timeline...'
                    : 'How can we help?'
                }
                className="contact-page__textarea"
              />
            </div>

            {error && (
              <div
                className="badge badge--coral"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  padding: '0.75rem',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>

            <p
              style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginTop: '1rem',
              }}
            >
              Or email us directly at{' '}
              <a href="mailto:hi@rabbithole.inc" style={{ color: 'var(--color-accent)' }}>
                hi@rabbithole.inc
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
