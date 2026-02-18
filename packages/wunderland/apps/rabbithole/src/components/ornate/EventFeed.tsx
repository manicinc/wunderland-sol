'use client';

export interface AgentEvent {
  id: string;
  timestamp: string;
  agentName?: string;
  agentSeedId?: string;
  type: 'post_published' | 'status_change' | 'error' | 'integration' | 'system';
  description: string;
}

interface EventFeedProps {
  events: AgentEvent[];
  maxItems?: number;
  loading?: boolean;
  className?: string;
}

const EVENT_BADGE_CONFIG: Record<
  AgentEvent['type'],
  { label: string; bg: string; color: string }
> = {
  post_published: {
    label: 'Post',
    bg: 'rgba(16,255,176,0.12)',
    color: '#10ffb0',
  },
  status_change: {
    label: 'Status',
    bg: 'rgba(0,245,255,0.12)',
    color: '#00f5ff',
  },
  error: {
    label: 'Error',
    bg: 'rgba(255,107,107,0.12)',
    color: '#ff6b6b',
  },
  integration: {
    label: 'Integration',
    bg: 'rgba(167,139,250,0.12)',
    color: '#a78bfa',
  },
  system: {
    label: 'System',
    bg: 'rgba(160,160,180,0.12)',
    color: '#a0a0b4',
  },
};

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
      }}
    >
      {/* Timestamp skeleton */}
      <div
        style={{
          width: 48,
          height: 12,
          borderRadius: 4,
          background: 'rgba(160,160,180,0.12)',
          animation: 'eventFeedPulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }}
      />
      {/* Badge skeleton */}
      <div
        style={{
          width: 56,
          height: 18,
          borderRadius: 9,
          background: 'rgba(160,160,180,0.1)',
          animation: 'eventFeedPulse 1.5s ease-in-out 0.15s infinite',
          flexShrink: 0,
        }}
      />
      {/* Description skeleton */}
      <div
        style={{
          flex: 1,
          height: 12,
          borderRadius: 4,
          background: 'rgba(160,160,180,0.08)',
          animation: 'eventFeedPulse 1.5s ease-in-out 0.3s infinite',
        }}
      />
    </div>
  );
}

export function EventFeed({
  events,
  maxItems = 10,
  loading = false,
  className = '',
}: EventFeedProps) {
  const visibleEvents = events.slice(0, maxItems);

  return (
    <div className={className}>
      {/* Keyframe animation for skeleton pulse */}
      <style>{`
        @keyframes eventFeedPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* WebKit scrollbar styles */}
      <style>{`
        .event-feed-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .event-feed-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .event-feed-scroll::-webkit-scrollbar-thumb {
          background: rgba(201,162,39,0.25);
          border-radius: 3px;
        }
        .event-feed-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(201,162,39,0.4);
        }
      `}</style>

      <div
        className="event-feed-scroll"
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(201,162,39,0.25) transparent',
        }}
      >
        {/* Loading state */}
        {loading && (
          <div>
            <SkeletonRow />
            <div style={{ borderBottom: '1px solid rgba(160,160,180,0.08)' }} />
            <SkeletonRow />
            <div style={{ borderBottom: '1px solid rgba(160,160,180,0.08)' }} />
            <SkeletonRow />
          </div>
        )}

        {/* Empty state */}
        {!loading && visibleEvents.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              color: 'var(--color-text-dim, #6b6b7b)',
            }}
          >
            No recent events
          </div>
        )}

        {/* Event list */}
        {!loading &&
          visibleEvents.map((event, idx) => {
            const badge = EVENT_BADGE_CONFIG[event.type];
            const isLast = idx === visibleEvents.length - 1;

            return (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: isLast
                    ? 'none'
                    : '1px solid rgba(160,160,180,0.08)',
                }}
              >
                {/* Timestamp */}
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    color: 'var(--color-text-dim, #6b6b7b)',
                    flexShrink: 0,
                    minWidth: 48,
                    paddingTop: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatRelativeTime(event.timestamp)}
                </span>

                {/* Type badge */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 9,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.5625rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    background: badge.bg,
                    color: badge.color,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge.label}
                </span>

                {/* Description */}
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted, #9595a8)',
                    lineHeight: 1.4,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {event.agentName && (
                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text, #e0e0f0)',
                        marginRight: 4,
                      }}
                    >
                      {event.agentName}
                    </span>
                  )}
                  {event.description}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
