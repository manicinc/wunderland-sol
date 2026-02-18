import { getAllJobs, getJobBySlug } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { ChevronLeft, MapPin, Clock, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { locales } from '@/i18n';

interface Props {
  params: {
    locale: string;
    slug: string;
  };
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const jobs = getAllJobs();
  // Generate paths for every supported locale and every job
  return locales.flatMap((locale) =>
    jobs.map((job) => ({
      locale,
      slug: job.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = getJobBySlug(params.slug);
  if (!job) return {};

  return {
    title: `${job.title} - Careers | AgentOS`,
    description: job.excerpt,
    openGraph: {
      title: `We are hiring a ${job.title}`,
      description: job.excerpt,
      type: 'website',
    },
  };
}

export default function JobPostPage({ params }: Props) {
  const job = getJobBySlug(params.slug);

  if (!job) {
    notFound();
  }

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-background-primary)]">
      <article className="max-w-3xl mx-auto">
        <Link 
          href={`/${params.locale}/careers`}
          className="inline-flex items-center text-sm text-muted hover:text-accent-primary mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Careers
        </Link>

        <header className="mb-12 text-center holographic-card p-8 rounded-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6">
            {job.title}
          </h1>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-muted">
            <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-accent-primary" />
                {job.department}
            </div>
            <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent-primary" />
                {job.location}
            </div>
            <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-primary" />
                {job.type}
            </div>
          </div>
        </header>

        <div className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-a:text-accent-primary prose-li:marker:text-accent-primary">
          <ReactMarkdown>{job.content}</ReactMarkdown>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
             <a 
                href={`mailto:careers@frame.dev?subject=Application: ${job.title}`}
                className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
             >
                 Apply for this Position
             </a>
        </div>
      </article>
    </div>
  );
}
