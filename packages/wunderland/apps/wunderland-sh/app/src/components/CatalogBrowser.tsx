'use client';

import { useState, useMemo } from 'react';
import {
  SKILLS, CHANNELS, PROVIDERS, TOOLS,
  SKILL_CATEGORIES, CHANNEL_TIERS, TOOL_CATEGORIES,
  formatSecretEnv,
  type CatalogSkill, type CatalogChannel, type CatalogProvider, type CatalogTool,
} from '@/data/catalog-data';

// ============================================================================
// HELPERS
// ============================================================================

type TabId = 'skills' | 'channels' | 'providers' | 'tools';

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: 'skills', label: 'Skills', count: SKILLS.length },
  { id: 'channels', label: 'Channels', count: CHANNELS.length },
  { id: 'providers', label: 'Providers', count: PROVIDERS.length },
  { id: 'tools', label: 'Tools', count: TOOLS.length },
];

function matchesSearch(query: string, ...fields: string[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(q));
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function UsagePanel({ type, item }: { type: TabId; item: CatalogSkill | CatalogChannel | CatalogProvider | CatalogTool }) {
  if (type === 'skills') {
    const skill = item as CatalogSkill;
    return (
      <div className="mt-4 pt-4 border-t border-[var(--border-glass)] space-y-3">
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">CLI</span>
          <code className="block font-mono text-xs text-[var(--neon-green)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)]">
            wunderland skills enable {skill.name}
          </code>
        </div>
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">SDK</span>
          <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{`import { getSkillByName } from '@framers/agentos-skills-registry/catalog'

const skill = getSkillByName('${skill.name}')
// Load SKILL.md from: ${skill.skillPath}`}
          </pre>
        </div>
        {skill.requiredTools.length > 0 && (
          <div>
            <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Requires</span>
            <span className="text-xs text-[var(--text-tertiary)]">Tools: {skill.requiredTools.join(', ')}</span>
          </div>
        )}
      </div>
    );
  }

  if (type === 'channels') {
    const channel = item as CatalogChannel;
    return (
      <div className="mt-4 pt-4 border-t border-[var(--border-glass)] space-y-3">
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">SDK</span>
          <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{`import { createCuratedManifest } from '@framers/agentos-extensions-registry'

const manifest = await createCuratedManifest({
  channels: ['${channel.platform}'],
  tools: 'all',
})`}
          </pre>
        </div>
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Install</span>
          <code className="block font-mono text-xs text-[var(--neon-green)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)]">
            npm install {channel.sdkPackage}
          </code>
        </div>
        {channel.requiredSecrets.length > 0 && (
          <div>
            <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Env</span>
            <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{channel.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (type === 'providers') {
    const provider = item as CatalogProvider;
    return (
      <div className="mt-4 pt-4 border-t border-[var(--border-glass)] space-y-3">
        {provider.requiredSecrets.length > 0 && (
          <div>
            <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Env</span>
            <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{provider.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}
            </pre>
          </div>
        )}
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Config</span>
          <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{`// agent.config.json
{
  "llm": {
    "provider": "${provider.providerId}",
    "model": "${provider.defaultModel}"
  }
}`}
          </pre>
        </div>
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Models</span>
          <span className="text-xs text-[var(--text-tertiary)]">Default: {provider.defaultModel} | Small: {provider.smallModel}</span>
        </div>
      </div>
    );
  }

  // tools
  const tool = item as CatalogTool;
  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-glass)] space-y-3">
      <div>
        <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">SDK</span>
        <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{`import { createCuratedManifest } from '@framers/agentos-extensions-registry'

const manifest = await createCuratedManifest({
  tools: ['${tool.name}'],
  channels: 'none',
})`}
        </pre>
      </div>
      <div>
        <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Install</span>
        <code className="block font-mono text-xs text-[var(--neon-green)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)]">
          npm install {tool.packageName}
        </code>
      </div>
      {tool.requiredSecrets.length > 0 && (
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Env</span>
          <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{tool.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}
          </pre>
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
      return SKILLS.filter((s) => {
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
      return PROVIDERS.filter((p) => {
        if (search && !matchesSearch(search, p.providerId, p.displayName, p.description, p.defaultModel)) return false;
        return true;
      });
    }
    return TOOLS.filter((t) => {
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
    <div className="mt-12">
      <h3 className="font-display font-bold text-lg mb-6">
        <span className="neon-glow-cyan">Browse All Extensions &amp; Skills</span>
      </h3>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-[var(--neon-cyan)] bg-[rgba(0,245,255,0.08)] text-[var(--text-primary)] shadow-[0_0_12px_rgba(0,245,255,0.15)]'
                : 'border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            <span className="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-glass)] text-[var(--text-tertiary)]">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3 mb-4">
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-primary)] text-sm font-mono placeholder-[var(--text-tertiary)] outline-none focus:border-[rgba(0,245,255,0.4)] transition-colors"
        />
        {filterCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-full border text-[0.65rem] uppercase tracking-wider cursor-pointer transition-all ${
                  categoryFilter === cat
                    ? 'border-[var(--neon-cyan)] bg-[rgba(0,245,255,0.1)] text-[var(--neon-cyan)]'
                    : 'border-[var(--border-glass)] text-[var(--text-tertiary)] hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-[var(--text-tertiary)] font-mono mb-4">
        {filteredItems.length} {activeTab} found
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const key = getItemKey(item);
          const isExpanded = expanded === key;
          return (
            <div key={key} className="holo-card p-5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-[var(--text-primary)]">{getItemName(item)}</span>
                <span className="badge badge-level text-[0.55rem]">{getItemCategory(item)}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3 line-clamp-2">{getItemDesc(item)}</p>

              {getItemSecrets(item).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {getItemSecrets(item).map((s: string) => (
                    <span key={s} className="text-[0.55rem] font-mono px-1.5 py-0.5 rounded bg-[rgba(255,215,0,0.08)] text-[var(--deco-gold)] border border-[rgba(255,215,0,0.15)]">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {getNpmUrl(item) && (
                  <a
                    href={getNpmUrl(item)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.65rem] font-mono px-2.5 py-1 rounded border border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)] no-underline hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--neon-cyan)] transition-all"
                  >
                    NPM
                  </a>
                )}
                <a
                  href={getGithubUrl(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.65rem] font-mono px-2.5 py-1 rounded border border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)] no-underline hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--neon-cyan)] transition-all"
                >
                  GitHub
                </a>
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className={`text-[0.65rem] font-mono px-2.5 py-1 rounded border cursor-pointer transition-all ${
                    isExpanded
                      ? 'border-[var(--neon-green)] bg-[rgba(16,255,176,0.08)] text-[var(--neon-green)]'
                      : 'border-[rgba(16,255,176,0.2)] text-[var(--neon-green)] hover:bg-[rgba(16,255,176,0.08)] hover:border-[rgba(16,255,176,0.4)]'
                  }`}
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
        <div className="text-center py-12 text-[var(--text-tertiary)] text-sm">
          No {activeTab} match your search. Try a different query or filter.
        </div>
      )}
    </div>
  );
}
