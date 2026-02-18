'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRICING_TIERS } from '@/config/pricing';
import { PricingCard } from './PricingCard';

export function PricingSection() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (planId: string) => {
    const tier = PRICING_TIERS.find((t) => t.id === planId);
    if (tier?.ctaType === 'contact') {
      router.push(tier.ctaHref || '/contact');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
    if (!token) {
      router.push(`/signup?plan=${planId}`);
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.push(`/login?plan=${planId}`);
          return;
        }
        alert(body.error || 'Failed to start checkout. Please try again.');
        return;
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <div className="features__header">
          <h2 className="features__title">
            <span className="text-holographic">Simple</span> Pricing
          </h2>
          <p className="features__subtitle">
            Pay for the control plane. Bring your own VPS and LLM keys.
          </p>
        </div>

        <div className="pricing__grid">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.id}
              {...tier}
              cta={loading === tier.id ? 'Loading...' : tier.cta}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
