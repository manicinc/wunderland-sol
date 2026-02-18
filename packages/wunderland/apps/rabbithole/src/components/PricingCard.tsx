'use client';

import Link from 'next/link';
import type { PricingTier } from '@/config/pricing';

interface PricingCardProps extends PricingTier {
  onSelect?: (id: string) => void;
}

export function PricingCard({
  id,
  name,
  price,
  period,
  description,
  features,
  cta,
  highlighted,
  badge,
  note,
  ctaType,
  ctaHref,
  onSelect,
}: PricingCardProps) {
  const cardClass = [
    'pricing-card',
    highlighted && 'pricing-card--highlighted',
    id === 'enterprise' && 'pricing-card--enterprise',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      {badge && <span className="badge badge--gold pricing-card__badge">{badge}</span>}
      <div className="pricing-card__name">{name}</div>
      <div className="pricing-card__price">
        {price}
        {period && <span className="pricing-card__period">{period}</span>}
      </div>
      <p className="pricing-card__description">{description}</p>
      <ul className="pricing-card__features">
        {features.map((feature) => (
          <li key={feature} className="pricing-card__feature">
            {feature}
          </li>
        ))}
      </ul>
      {ctaType === 'contact' && ctaHref ? (
        <Link
          href={ctaHref}
          className={`btn ${id === 'enterprise' ? 'btn--holographic' : 'btn--secondary'} btn--lg`}
        >
          {cta}
        </Link>
      ) : (
        <button
          className={`btn ${highlighted ? 'btn--primary' : 'btn--secondary'} btn--lg`}
          onClick={() => onSelect?.(id)}
        >
          {cta}
        </button>
      )}
      {note && <p className="pricing-card__note">{note}</p>}
    </div>
  );
}
