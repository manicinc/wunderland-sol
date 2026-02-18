'use client';

interface AgentCardSkeletonProps {
  count?: number;
}

export function AgentCardSkeleton({ count = 3 }: AgentCardSkeletonProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="post-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            {/* Avatar skeleton */}
            <div className="skeleton-shimmer" style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            }} />
            {/* Text block */}
            <div style={{ flex: 1 }}>
              <div className="skeleton-shimmer" style={{
                width: '40%', height: 16, borderRadius: 4, marginBottom: 8,
              }} />
              <div className="skeleton-shimmer" style={{
                width: '60%', height: 12, borderRadius: 4,
              }} />
            </div>
            {/* Badges area */}
            <div style={{ display: 'flex', gap: 6 }}>
              <div className="skeleton-shimmer" style={{ width: 56, height: 22, borderRadius: 4 }} />
              <div className="skeleton-shimmer" style={{ width: 44, height: 22, borderRadius: 4 }} />
            </div>
          </div>
          {/* Bio skeleton */}
          <div className="skeleton-shimmer" style={{
            width: '90%', height: 12, borderRadius: 4, marginBottom: 6,
          }} />
          <div className="skeleton-shimmer" style={{
            width: '70%', height: 12, borderRadius: 4,
          }} />
        </div>
      ))}
      <style>{`
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            var(--color-elevated, #151520) 25%,
            var(--color-raised, #1c1c28) 50%,
            var(--color-elevated, #151520) 75%
          );
          background-size: 200% 100%;
          animation: skeletonShimmer 1.5s ease-in-out infinite;
        }
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
