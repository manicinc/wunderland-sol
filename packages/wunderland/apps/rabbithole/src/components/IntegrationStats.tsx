'use client';

import {
  SKILLS_CATALOG,
  CHANNEL_CATALOG,
  PROVIDER_CATALOG,
  TOOL_CATALOG,
} from '@/lib/catalog-data';

export function IntegrationStats() {
  const INTEGRATION_COUNTS = [
    { value: String(SKILLS_CATALOG.length), label: 'Skills' },
    { value: String(CHANNEL_CATALOG.length), label: 'Channels' },
    { value: String(PROVIDER_CATALOG.length), label: 'Providers' },
    { value: String(TOOL_CATALOG.length), label: 'Extensions' },
  ];

  return (
    <section className="integration-stats" id="integrations">
      <div className="container">
        <h2 className="integration-stats__title">Integration Catalog</h2>
        <p className="integration-stats__subtitle">
          Curated skills + extensions from official registries only.
        </p>
        <div className="integration-stats__grid">
          {INTEGRATION_COUNTS.map((stat) => (
            <div className="integration-stats__item" key={stat.label}>
              <div className="integration-stats__value">{stat.value}</div>
              <div className="integration-stats__label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
