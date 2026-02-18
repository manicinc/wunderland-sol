import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import { Calendar, Clock, ArrowLeft, Bell, GripVertical, Repeat, CalendarDays, LayoutList, Zap } from 'lucide-react'
import { getBlogPost, getRelatedPosts } from '@/lib/blogPosts'

export const metadata: Metadata = {
  title: 'Introducing the Quarry Planner: Time Blocking Meets Knowledge Management',
  description:
    'Announcing the Quarry Planner—a premium day planning experience integrated with your knowledge base. Features include drag-drop rescheduling, browser notifications, recurrence patterns, and full offline support.',
}

export default function QuarryPlannerLaunchPage() {
  const post = getBlogPost('quarry-planner-launch')
  const relatedPosts = getRelatedPosts('quarry-planner-launch')

  if (!post) return null

  return (
    <PageLayout>
      <article className="container mx-auto px-4 max-w-3xl pt-20 pb-20">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-ink-600 dark:text-paper-400 hover:text-frame-green mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 heading-display">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-600 dark:text-paper-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
            <span>By {post.author}</span>
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="lead">
            We built Quarry to be more than a note-taking app. Today, we're excited to announce the <strong>Quarry Planner</strong>—a
            beautiful, timeline-based planning system that lives right inside your knowledge base. Tasks you capture in notes
            become events on your calendar. Everything stays local-first, works offline, and syncs seamlessly.
          </p>

          <h2>Why Planning Belongs in Your Knowledge Base</h2>
          <p>
            Most planners are separate apps. You take notes in one place, manage tasks in another, and track calendar events
            in a third. This fragmentation creates friction:
          </p>
          <ul>
            <li>Tasks from meeting notes never make it to your calendar</li>
            <li>Context about <em>why</em> you scheduled something gets lost</li>
            <li>You can't link a time block back to the source document</li>
          </ul>
          <p>
            The Quarry Planner eliminates this gap. When you create a task in a strand (our atomic knowledge unit),
            it can instantly appear on your timeline. Click the event and jump back to the original context.
          </p>

          {/* Feature highlight cards */}
          <div className="not-prose my-10 grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Streamlined Day View</h3>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                A premium vertical timeline with animated cards, current time indicator, and day phase icons (sunrise, sun, sunset, moon).
              </p>
            </div>
            <div className="p-5 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <GripVertical className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="font-semibold text-cyan-900 dark:text-cyan-100">Drag & Drop</h3>
              </div>
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                Reschedule events by dragging. Resize by pulling edges. Smooth animations with optional haptic feedback.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">Smart Reminders</h3>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Browser push notifications and sound alerts. Set reminders at 5, 10, 15, or 30 minutes before events.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Repeat className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="font-semibold text-violet-900 dark:text-violet-100">Recurrence Patterns</h3>
              </div>
              <p className="text-sm text-violet-700 dark:text-violet-300">
                Daily, weekly, monthly, yearly patterns. Weekday-only scheduling. Custom intervals with end dates.
              </p>
            </div>
          </div>

          <h2>Core Features</h2>

          <h3>Streamlined Day View</h3>
          <p>
            The flagship experience is a vertical timeline spine with events displayed on alternating sides:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
{`     9 AM ──●── [ Morning standup     ]
             │
    10 AM ──●──                       [ Code review ]
             │
    11 AM ──●── [ Team sync          ]
             │
    12 PM ──●── NOW ───────────────────`}
          </pre>
          <p>
            The current time indicator pulses gently with a "NOW" marker. Events animate in smoothly, and overlapping
            events are automatically staggered for clarity.
          </p>

          <h3>Time Block Editing</h3>
          <p>
            Click any event to open the <strong>EditTimeBlockModal</strong>—a comprehensive editor with:
          </p>
          <ul>
            <li><strong>50+ Lucide icons</strong> for visual categorization</li>
            <li><strong>Full color picker</strong> with preset palette</li>
            <li><strong>15-minute interval</strong> time pickers</li>
            <li><strong>Recurrence rules</strong>: daily, weekly, monthly, yearly, or custom</li>
            <li><strong>Calendar selection</strong> for Google Calendar integration</li>
          </ul>

          <h3>Week Strip Navigation</h3>
          <p>
            A horizontal scrollable strip shows the entire week. Activity dots indicate days with events.
            Today is highlighted. Click any day to jump instantly.
          </p>

          <h3>Drag & Drop + Resize</h3>
          <p>
            Reschedule events by dragging them to new time slots. Resize by pulling the top or bottom edge.
            Everything persists to your local database immediately—no save button required.
          </p>

          <h3>Multiple Views</h3>
          <p>
            Switch between Day, Week, Month, and Agenda views using the ViewSwitcher or keyboard shortcuts:
          </p>
          <ul>
            <li><code>D</code> – Day view</li>
            <li><code>W</code> – Week view</li>
            <li><code>M</code> – Month view</li>
            <li><code>A</code> – Agenda view</li>
          </ul>

          <h2>Reminders That Actually Work</h2>
          <p>
            The Quarry Planner includes a full reminder system built on the browser Notification API:
          </p>
          <ul>
            <li><strong>Push notifications</strong> even when the tab is in the background</li>
            <li><strong>Sound alerts</strong> using Web Audio API (configurable)</li>
            <li><strong>Multiple reminders per event</strong>: at time, 5/10/15/30 min before, 1 hour, 1 day</li>
            <li><strong>Background checking</strong> every 30 seconds</li>
          </ul>
          <p>
            All reminder logic runs locally. No server polling, no third-party services, no privacy concerns.
          </p>

          <h2>Google Calendar Sync</h2>
          <p>
            For those who need interoperability, the Quarry Planner syncs bidirectionally with Google Calendar:
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Direction</th>
                <th className="text-left">Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Google → Quarry</td>
                <td>Events appear within 5 minutes</td>
              </tr>
              <tr>
                <td>Quarry → Google</td>
                <td>Changes sync immediately on save</td>
              </tr>
              <tr>
                <td>Conflicts</td>
                <td>Most recent edit wins; conflicts logged</td>
              </tr>
            </tbody>
          </table>
          <p>
            The planner works fully offline. Changes save to your local SQLite database instantly
            and sync to Google when connection is restored.
          </p>

          <h2>Habit Tracking</h2>
          <p>
            Mark recurring tasks as "habits" to unlock streak tracking:
          </p>
          <ul>
            <li><strong>Current streak</strong>: Consecutive completions</li>
            <li><strong>Longest streak</strong>: All-time best</li>
            <li><strong>Completion rate</strong>: Percentage over time</li>
            <li><strong>Streak freezes</strong>: Protect your streak during vacations</li>
            <li><strong>Grace periods</strong>: Miss a day without breaking your streak</li>
          </ul>

          <h2>Settings & Customization</h2>
          <p>
            Configure everything in <strong>Settings → Planner Settings</strong>:
          </p>
          <ul>
            <li>Default view (Day, Week, Month, Agenda)</li>
            <li>Week starts on (Sunday, Monday, Saturday)</li>
            <li>Time format (12-hour or 24-hour)</li>
            <li>Work hours (highlight your productive window)</li>
            <li>Default event duration and reminder times</li>
            <li>Browser notifications and sound alerts</li>
            <li>Compact mode for dense schedules</li>
          </ul>

          <h2>Accessibility First</h2>
          <p>
            Every modal in the planner uses our <code>useModalAccessibility</code> hook:
          </p>
          <ul>
            <li><strong>Escape to close</strong></li>
            <li><strong>Click outside to close</strong></li>
            <li><strong>Focus trapping</strong></li>
            <li><strong>Scroll lock</strong></li>
            <li><strong>Full keyboard navigation</strong></li>
            <li><strong>ARIA labels throughout</strong></li>
          </ul>

          <div className="mt-12 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Try It Now</h3>
            </div>
            <p className="text-emerald-700 dark:text-emerald-300 mb-4">
              The Quarry Planner is available today for all users. Open Quarry, click the calendar icon in the sidebar,
              and start planning your day.
            </p>
            <Link
              href="/quarry"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              Open Quarry Planner
            </Link>
          </div>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-8 border-t border-ink-200 dark:border-paper-800">
            <h3 className="text-2xl font-bold mb-6">Related Posts</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="paper-card p-6 hover:shadow-xl transition-shadow"
                >
                  <h4 className="font-bold text-lg mb-2 text-ink-900 dark:text-paper-100">
                    {relatedPost.title}
                  </h4>
                  <p className="text-sm text-ink-600 dark:text-paper-400 mb-3">
                    {relatedPost.excerpt}
                  </p>
                  <span className="text-xs text-frame-green font-semibold">
                    Read more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PageLayout>
  )
}
