import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, BookOpen, ChevronRight, Github } from 'lucide-react';
import { getAllGuides, getGuideBySlug } from '../../../../lib/guides';
import { MarkdownRenderer } from '../../../../components/markdown-renderer';

type Props = {
  params: {
    locale: string;
    slug: string;
  };
};

export async function generateStaticParams() {
  const guides = getAllGuides();
  const locales = ['en'];

  // Return all locale/slug combinations for static export
  // If no guides found (e.g., in CI), return empty array
  if (guides.length === 0) {
    return [];
  }

  return locales.flatMap((locale) =>
    guides.map((guide) => ({
      locale,
      slug: guide.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props) {
  const guide = getGuideBySlug(params.slug);
  if (!guide) return { title: 'Guide Not Found' };

  return {
    title: `${guide.title} | AgentOS Guides`,
    description: guide.description,
  };
}

export default function GuidePage({ params }: Props) {
  const guide = getGuideBySlug(params.slug);

  if (!guide) {
    notFound();
  }

  const allGuides = getAllGuides();
  const currentIndex = allGuides.findIndex(g => g.slug === guide.slug);
  const prevGuide = currentIndex > 0 ? allGuides[currentIndex - 1] : null;
  const nextGuide = currentIndex < allGuides.length - 1 ? allGuides[currentIndex + 1] : null;

  // Generate table of contents from content
  const headings = guide.content.match(/^#{1,3}\s+.+$/gm) || [];
  const toc = headings.map(h => {
    const level = h.match(/^#+/)?.[0].length || 1;
    const text = h.replace(/^#+\s+/, '');
    const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    return { level, text, id };
  }).filter(h => h.level <= 3);

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Link href={`/${params.locale}/docs`} className="hover:text-[var(--color-accent-primary)] transition-colors">
            Docs
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/${params.locale}/guides`} className="hover:text-[var(--color-accent-primary)] transition-colors">
            Guides
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-[var(--color-text-secondary)]">{guide.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Main Content */}
          <main>
            {/* Header */}
            <header className="mb-8 pb-8 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]">
                  {guide.category}
                </span>
                {guide.lastModified && (
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                    <Clock className="w-3 h-3" />
                    Updated {new Date(guide.lastModified).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
                {guide.title}
              </h1>
              <p className="text-lg text-[var(--color-text-secondary)]">
                {guide.description}
              </p>
            </header>

            {/* Content */}
            <MarkdownRenderer content={guide.content} />

            {/* Navigation */}
            <nav className="mt-12 pt-8 border-t border-[var(--color-border-subtle)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prevGuide && (
                  <Link
                    href={`/${params.locale}/guides/${prevGuide.slug}`}
                    className="group holographic-card p-4 transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-1">
                      <ArrowLeft className="w-4 h-4" />
                      Previous
                    </div>
                    <div className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                      {prevGuide.title}
                    </div>
                  </Link>
                )}
                {nextGuide && (
                  <Link
                    href={`/${params.locale}/guides/${nextGuide.slug}`}
                    className="group holographic-card p-4 transition-all hover:scale-[1.02] sm:text-right sm:ml-auto"
                  >
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-1 sm:justify-end">
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                      {nextGuide.title}
                    </div>
                  </Link>
                )}
              </div>
            </nav>
          </main>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6">
              {/* Table of Contents */}
              {toc.length > 0 && (
                <div className="holographic-card p-5">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    On this page
                  </h3>
                  <nav className="space-y-2">
                    {toc.slice(0, 15).map((item, i) => (
                      <a
                        key={i}
                        href={`#${item.id}`}
                        className={`block text-sm transition-colors hover:text-[var(--color-accent-primary)] ${
                          item.level === 1
                            ? 'text-[var(--color-text-primary)] font-medium'
                            : item.level === 2
                            ? 'text-[var(--color-text-secondary)] pl-3'
                            : 'text-[var(--color-text-muted)] pl-6'
                        }`}
                      >
                        {item.text}
                      </a>
                    ))}
                    {toc.length > 15 && (
                      <span className="block text-xs text-[var(--color-text-muted)] pl-3">
                        +{toc.length - 15} more sections
                      </span>
                    )}
                  </nav>
                </div>
              )}

              {/* Quick Links */}
              <div className="holographic-card p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <a
                    href={`https://github.com/framersai/agentos/blob/master/packages/agentos/docs/${guide.slug.toUpperCase()}.md`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    Edit on GitHub
                  </a>
                  <Link
                    href="/guides"
                    className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    All Guides
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
