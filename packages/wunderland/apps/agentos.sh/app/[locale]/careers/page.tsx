import Link from 'next/link';
import { getAllJobs } from '@/lib/markdown';
import { Metadata } from 'next';
import { MapPin, Clock, Briefcase, ArrowRight } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Careers at AgentOS - Build the Future of AI',
    description: 'Join the team building the world&apos;s first adaptive AI agent runtime. Remote-first, open source, and high impact.',
  };
}

export default async function CareersPage({ params: { locale } }: { params: { locale: string } }) {
  const jobs = getAllJobs();

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-background-primary)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 gradient-text">
            Join the Mission
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            We&apos;re building the operating system for the agentic web. If you love TypeScript, distributed systems, and open source, we want to hear from you.
          </p>
        </div>

        <div className="space-y-6">
          {jobs.length === 0 ? (
            <div className="text-center py-12 holographic-card">
              <p className="text-muted">No open positions at the moment. Check back soon!</p>
            </div>
          ) : (
            jobs.map((job) => (
              <Link
                key={job.slug}
                href={`/${locale}/careers/${job.slug}`}
                className="block group"
              >
                <div className="holographic-card p-6 sm:p-8 transition-all duration-300 hover:border-accent-primary/50 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-accent-primary transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4" />
                          {job.department}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {job.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm font-semibold text-accent-primary opacity-0 sm:opacity-100 sm:-translate-x-4 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                      View Role <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        
        <div className="mt-16 text-center">
            <p className="text-muted mb-4">Don&apos;t see a fit?</p>
            <a href="mailto:careers@frame.dev" className="text-accent-primary hover:underline">
                Email us your resume anyway
            </a>
        </div>
      </div>
    </div>
  );
}

