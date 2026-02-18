'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  SKILLS_CATALOG, CHANNEL_CATALOG, PROVIDER_CATALOG, TOOL_CATALOG,
  type SkillCatalogEntry, type ProviderRegistryEntry, type ExtensionInfo, type ChannelRegistryEntry,
} from '@/lib/catalog-data';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      type="button"
      className="catalog__copy-btn"
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}

// ============================================================================
// DERIVED DATA
// ============================================================================

type ChannelWithTier = ChannelRegistryEntry & { tier: string };

const CHANNELS: ChannelWithTier[] = CHANNEL_CATALOG.map((c) => ({
  ...c,
  tier: c.defaultPriority >= 50 ? 'P0' : c.defaultPriority >= 40 ? 'P1' : c.defaultPriority >= 30 ? 'P2' : 'P3',
}));

type TabId = 'skills' | 'channels' | 'providers' | 'tools';

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: 'skills', label: 'Skills', count: SKILLS_CATALOG.length },
  { id: 'channels', label: 'Channels', count: CHANNELS.length },
  { id: 'providers', label: 'Providers', count: PROVIDER_CATALOG.length },
  { id: 'tools', label: 'Tools', count: TOOL_CATALOG.length },
];

const SKILL_CATEGORIES = ['all', ...new Set(SKILLS_CATALOG.map((s) => s.category))];
const CHANNEL_TIERS = ['all', 'P0', 'P1', 'P2', 'P3'];
const TOOL_CATEGORIES = ['all', ...new Set(TOOL_CATALOG.map((t) => t.category))];

// ============================================================================
// HELPERS
// ============================================================================

function matchesSearch(query: string, ...fields: string[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(q));
}

function formatSecretEnv(secret: string): string {
  return secret.replace(/\./g, '_').toUpperCase();
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function UsagePanel({ type, item }: { type: TabId; item: SkillCatalogEntry | ChannelWithTier | ProviderRegistryEntry | ExtensionInfo }) {
  if (type === 'skills') {
    const skill = item as SkillCatalogEntry;
    return (
      <div className="catalog__usage">
        <div className="catalog__usage-section">
          <span className="catalog__usage-label">CLI</span>
          <div className="catalog__usage-wrap">
            <code className="catalog__usage-code">wunderland skills enable {skill.name}</code>
            <CopyButton text={`wunderland skills enable ${skill.name}`} />
          </div>
        </div>
        <div className="catalog__usage-section">
          <span className="catalog__usage-label">SDK</span>
          <div className="catalog__usage-wrap">
            <pre className="catalog__usage-pre">{`import { getSkillByName } from '@framers/agentos-skills-registry/catalog'

const skill = getSkillByName('${skill.name}')
// Load SKILL.md from: ${skill.skillPath}`}</pre>
            <CopyButton text={`import { getSkillByName } from '@framers/agentos-skills-registry/catalog'\n\nconst skill = getSkillByName('${skill.name}')`} />
          </div>
        </div>
        {skill.requiredTools.length > 0 && (
          <div className="catalog__usage-section">
            <span className="catalog__usage-label">Requires</span>
            <span className="catalog__usage-note">Tools: {skill.requiredTools.join(', ')}</span>
          </div>
        )}
      </div>
    );
  }

  if (type === 'channels') {
    const channel = item as ChannelWithTier;
    return (
      <div className="catalog__usage">
        <div className="catalog__usage-section">
          <span className="catalog__usage-label">SDK</span>
          <div className="catalog__usage-wrap">
            <pre className="catalog__usage-pre">{`import { createCuratedManifest } from '@framers/agentos-extensions-registry'

const manifest = await createCuratedManifest({
  channels: ['${channel.platform}'],
  tools: 'all',
})`}</pre>
            <CopyButton text={`import { createCuratedManifest } from '@framers/agentos-extensions-registry'\n\nconst manifest = await createCuratedManifest({\n  channels: ['${channel.platform}'],\n  tools: 'all',\n})`} />
          </div>
        </div>
        <div className="catalog__usage-section">
          <span className="catalog__usage-label">Install</span>
          <div className="catalog__usage-wrap">
            <code className="catalog__usage-code">npm install {channel.sdkPackage}</code>
            <CopyButton text={`npm install ${channel.sdkPackage}`} />
          </div>
        </div>
        {channel.requiredSecrets.length > 0 && (
          <div className="catalog__usage-section">
            <span className="catalog__usage-label">Env</span>
            <div className="catalog__usage-wrap">
              <pre className="catalog__usage-pre">{channel.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}</pre>
              <CopyButton text={channel.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'providers') {
    const provider = item as ProviderRegistryEntry;
    return (
      <div className="catalog__usage">
        {provider.requiredSecrets.length > 0 && (
          <div className="catalog__usage-section">
            <span className="catalog__usage-label">Env</span>
            <div className="catalog__usage-wrap">
              <pre className="catalog__usage-pre">{provider.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}</pre>
              <CopyButton text={provider.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')} />
            </div>
          </div>
        )}
        <div className="catalog__usage-section">
          <span className="catalog__usage-label">Config</span>
          <div className="catalog__usage-wrap">
            <pre className="catalog__usage-pre">{`// agent.config.json
{
  "llm": {
    "provider": "${provider.providerId}",
    "model": "${provider.defaultModel}"
  }
}`}</pre>
            <CopyButton text={`{\n  "llm": {\n    "provider": "${provider.providerId}",\n    "model": "${provider.defaultModel}"\n  }\n}`} />
          </div>
        </div>
        <div className="catalog__usage-section">
          <span className="catalog__usage-label">Models</span>
          <span className="catalog__usage-note">Default: {provider.defaultModel} | Small: {provider.smallModel}</span>
        </div>
      </div>
    );
  }

  // tools
  const tool = item as ExtensionInfo;
  return (
    <div className="catalog__usage">
      <div className="catalog__usage-section">
        <span className="catalog__usage-label">SDK</span>
        <div className="catalog__usage-wrap">
          <pre className="catalog__usage-pre">{`import { createCuratedManifest } from '@framers/agentos-extensions-registry'

const manifest = await createCuratedManifest({
  tools: ['${tool.name}'],
  channels: 'none',
})`}</pre>
          <CopyButton text={`import { createCuratedManifest } from '@framers/agentos-extensions-registry'\n\nconst manifest = await createCuratedManifest({\n  tools: ['${tool.name}'],\n  channels: 'none',\n})`} />
        </div>
      </div>
      <div className="catalog__usage-section">
        <span className="catalog__usage-label">Install</span>
        <div className="catalog__usage-wrap">
          <code className="catalog__usage-code">npm install {tool.packageName}</code>
          <CopyButton text={`npm install ${tool.packageName}`} />
        </div>
      </div>
      {tool.requiredSecrets.length > 0 && (
        <div className="catalog__usage-section">
          <span className="catalog__usage-label">Env</span>
          <div className="catalog__usage-wrap">
            <pre className="catalog__usage-pre">{tool.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}</pre>
            <CopyButton text={tool.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CatalogBrowser() {
  const [activeTab, setActiveTab] = useState<TabId>('skills');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearch('');
    setCategoryFilter('all');
    setExpanded(null);
  };

  const filterCategories = activeTab === 'skills'
    ? SKILL_CATEGORIES
    : activeTab === 'channels'
      ? CHANNEL_TIERS
      : activeTab === 'tools'
        ? TOOL_CATEGORIES
        : [];

  const filteredItems = useMemo(() => {
    if (activeTab === 'skills') {
      return SKILLS_CATALOG.filter((s) => {
        if (search && !matchesSearch(search, s.name, s.displayName, s.description, ...s.tags)) return false;
        if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
        return true;
      });
    }
    if (activeTab === 'channels') {
      return CHANNELS.filter((c) => {
        if (search && !matchesSearch(search, c.platform, c.displayName, c.description, c.sdkPackage)) return false;
        if (categoryFilter !== 'all' && c.tier !== categoryFilter) return false;
        return true;
      });
    }
    if (activeTab === 'providers') {
      return PROVIDER_CATALOG.filter((p) => {
        if (search && !matchesSearch(search, p.providerId, p.displayName, p.description, p.defaultModel)) return false;
        return true;
      });
    }
    return TOOL_CATALOG.filter((t) => {
      if (search && !matchesSearch(search, t.name, t.displayName, t.description)) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      return true;
    });
  }, [activeTab, search, categoryFilter]);

  const getItemKey = (item: any): string => item.name || item.platform || item.providerId;
  const getItemName = (item: any): string => item.displayName;
  const getItemDesc = (item: any): string => item.description;
  const getItemCategory = (item: any): string => activeTab === 'channels' ? item.tier : (item.category || '');
  const getItemSecrets = (item: any): string[] => item.requiredSecrets || [];

  const getNpmUrl = (item: any): string | null => {
    const pkg = item.packageName;
    if (!pkg) return null;
    return `https://www.npmjs.com/package/${pkg}`;
  };

  const getGithubUrl = (item: any): string => {
    if (activeTab === 'skills') return `https://github.com/framersai/agentos-skills/tree/main/${item.skillPath}`;
    return 'https://github.com/framersai/agentos-extensions';
  };

  return (
    <div className="catalog">
      {/* Tabs */}
      <div className="catalog__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`catalog__tab ${activeTab === tab.id ? 'catalog__tab--active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
            <span className="catalog__tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="catalog__controls">
        <input
          type="text"
          className="catalog__search"
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {filterCategories.length > 0 && (
          <div className="catalog__filters">
            {filterCategories.map((cat) => (
              <button
                key={cat}
                className={`catalog__filter ${categoryFilter === cat ? 'catalog__filter--active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="catalog__count">
        {filteredItems.length} {activeTab} found
      </div>

      {/* Card Grid */}
      <div className="catalog__grid">
        {filteredItems.map((item) => {
          const key = getItemKey(item);
          const isExpanded = expanded === key;
          return (
            <div key={key} className="catalog__card">
              <div className="catalog__card-header">
                <span className="catalog__card-name">{getItemName(item)}</span>
                <span className="catalog__card-badge">{getItemCategory(item)}</span>
              </div>
              <p className="catalog__card-desc">{getItemDesc(item)}</p>

              {getItemSecrets(item).length > 0 && (
                <div className="catalog__card-secrets">
                  {getItemSecrets(item).map((s: string) => (
                    <span key={s} className="catalog__card-secret">{s}</span>
                  ))}
                </div>
              )}

              <div className="catalog__card-links">
                {getNpmUrl(item) && (
                  <a href={getNpmUrl(item)!} target="_blank" rel="noopener noreferrer" className="catalog__card-link">
                    NPM
                  </a>
                )}
                <a href={getGithubUrl(item)} target="_blank" rel="noopener noreferrer" className="catalog__card-link">
                  GitHub
                </a>
                <button
                  className="catalog__card-link catalog__card-link--usage"
                  onClick={() => setExpanded(isExpanded ? null : key)}
                >
                  {isExpanded ? 'Hide' : 'How to Use'}
                </button>
              </div>

              {isExpanded && <UsagePanel type={activeTab} item={item} />}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="catalog__empty">
          No {activeTab} match your search. Try a different query or filter.
        </div>
      )}
    </div>
  );
}
