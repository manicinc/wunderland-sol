import Link from 'next/link';
import { BookOpen, ChevronRight, Clock, Layers, Cpu, Database, Settings, Sparkles, FileText } from 'lucide-react';
import { getAllGuides, getGuideCategories } from '../../../lib/guides';

const categoryIcons: Record<string, typeof BookOpen> = {
  Core: Layers,
  Features: Sparkles,
  Integration: Database,
  Operations: Settings,
  Advanced: Cpu,
  Reference: FileText,
  Other: BookOpen
};

const categoryColors: Record<string, string> = {
  Core: 'from-violet-500 to-purple-600',
  Features: 'from-pink-500 to-rose-600',
  Integration: 'from-blue-500 to-cyan-600',
  Operations: 'from-amber-500 to-orange-600',
  Advanced: 'from-emerald-500 to-teal-600',
  Reference: 'from-slate-500 to-gray-600',
  Other: 'from-gray-500 to-slate-600'
};

export const metadata = {
  title: 'Guides | AgentOS Documentation',
  description: 'Comprehensive guides for building with AgentOS - architecture, features, integration, and more.'
};

type Props = {
  params: {
    locale: string;
  };
};

export default function GuidesPage({ params }: Props) {
  const guides = getAllGuides();
  const categories = getGuideCategories();

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-morphism mb-6">
            <BookOpen className="w-4 h-4 text-accent-primary" />
            <span className="text-sm font-semibold text-text-secondary">Documentation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">Guides & Tutorials</h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            In-depth guides covering architecture, features, integrations, and best practices for building with AgentOS.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="holographic-card p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-accent-primary)]">{guides.length}</div>
            <div className="text-sm text-[var(--color-text-secondary)]">Total Guides</div>
          </div>
          <div className="holographic-card p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-accent-primary)]">{categories.length}</div>
            <div className="text-sm text-[var(--color-text-secondary)]">Categories</div>
          </div>
          <div className="holographic-card p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-accent-primary)]">126KB</div>
            <div className="text-sm text-[var(--color-text-secondary)]">Architecture Doc</div>
          </div>
          <div className="holographic-card p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-accent-primary)]">TypeDoc</div>
            <div className="text-sm text-[var(--color-text-secondary)]">API Reference</div>
          </div>
        </div>

        {/* Guides by Category */}
        {categories.map(category => {
          const categoryGuides = guides.filter(g => g.category === category);
          const Icon = categoryIcons[category] || BookOpen;
          const colorClass = categoryColors[category] || categoryColors.Other;

          return (
            <section key={category} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClass} text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{category}</h2>
                <span className="text-sm text-[var(--color-text-muted)]">({categoryGuides.length} guides)</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {categoryGuides.map(guide => (
                  <Link
                    key={guide.slug}
                    href={`/${params.locale}/guides/${guide.slug}`}
                    className="group holographic-card p-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors mb-2">
                          {guide.title}
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
                          {guide.description}
                        </p>
                        {guide.lastModified && (
                          <div className="flex items-center gap-1 mt-3 text-xs text-[var(--color-text-muted)]">
                            <Clock className="w-3 h-3" />
                            <span>Updated {new Date(guide.lastModified).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-primary)] group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {/* API Reference CTA */}
        <div className="mt-16 holographic-card p-8 text-center">
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">Looking for API Reference?</h3>
          <p className="text-[var(--color-text-secondary)] mb-6 max-w-xl mx-auto">
            Check out our auto-generated TypeDoc documentation for complete API reference including all classes, interfaces, types, and methods.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="https://docs.agentos.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white font-semibold hover:brightness-110 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              API Reference
            </a>
            <a
              href="https://github.com/framersai/agentos/tree/master/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-[var(--color-border-primary)] text-[var(--color-text-primary)] font-semibold hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] transition-all"
            >
              View on GitHub
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
