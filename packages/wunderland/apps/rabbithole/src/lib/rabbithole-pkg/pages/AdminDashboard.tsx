/**
 * Admin Dashboard Page
 *
 * Main dashboard view with stats overview and quick actions.
 */

import React from 'react';
import { Card, StatCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { Table, type TableColumn } from '../ui/Table';
import { StatusBadge, RiskBadge, PriorityBadge } from '../ui/Badge';
import { colors } from '../ui/tokens';
import type { TaskQueueItem, QueueStats, RiskStats } from '../admin/types';

// ============================================================================
// Types
// ============================================================================

export interface DashboardProps {
  stats: QueueStats;
  riskStats: RiskStats;
  recentTasks: TaskQueueItem[];
  onRefresh?: () => void;
  onViewQueue?: () => void;
  onTaskClick?: (task: TaskQueueItem) => void;
}

// ============================================================================
// Icons (inline SVG)
// ============================================================================

const QueueIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ============================================================================
// Dashboard Component
// ============================================================================

export function AdminDashboard({
  stats,
  riskStats,
  recentTasks,
  onRefresh,
  onViewQueue,
  onTaskClick,
}: DashboardProps) {
  const containerStyle: React.CSSProperties = {
    padding: '1.5rem',
    minHeight: '100vh',
    background: colors.bg.primary,
    color: colors.text.primary,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: 0,
    background: `linear-gradient(135deg, ${colors.neon.cyan}, ${colors.neon.magenta})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '2rem',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: colors.text.primary,
    margin: 0,
  };

  // Table columns for recent tasks
  const taskColumns: TableColumn<TaskQueueItem>[] = [
    {
      key: 'title',
      header: 'Task',
      render: (task) => (
        <div>
          <div style={{ fontWeight: 500 }}>{task.title}</div>
          <div style={{ fontSize: '0.75rem', color: colors.text.muted }}>{task.clientId}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (task) => <StatusBadge status={task.status} size="sm" />,
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '100px',
      render: (task) => <PriorityBadge priority={task.priority} size="sm" />,
    },
    {
      key: 'riskScore',
      header: 'PII Risk',
      width: '120px',
      render: (task) => <RiskBadge score={task.riskScore ?? 0} size="sm" showScore={false} />,
    },
    {
      key: 'estimatedHours',
      header: 'Est.',
      width: '80px',
      align: 'right',
      render: (task) => `${task.estimatedHours}h`,
    },
  ];

  return (
    <div style={containerStyle} className="rh-root">
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>RabbitHole Admin</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} icon={<RefreshIcon />}>
              Refresh
            </Button>
          )}
          {onViewQueue && (
            <Button variant="primary" size="sm" onClick={onViewQueue}>
              View Queue
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div style={statsGridStyle}>
        <StatCard
          title="Pending Tasks"
          value={stats.pending}
          icon={<QueueIcon />}
          color={colors.neon.yellow}
          trend={stats.pending > 5 ? { value: stats.pending - 5, label: 'vs avg' } : undefined}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<ClockIcon />}
          color={colors.neon.purple}
        />
        <StatCard
          title="Avg Wait Time"
          value={`${(stats.avgWaitHours ?? 0).toFixed(1)}h`}
          subtitle="average queue wait"
          icon={<UsersIcon />}
          color={colors.neon.cyan}
        />
        <StatCard
          title="High Risk Tasks"
          value={riskStats.highRisk + riskStats.criticalRisk}
          subtitle={`${riskStats.criticalRisk} critical`}
          icon={<ShieldIcon />}
          color={riskStats.criticalRisk > 0 ? colors.neon.red : colors.neon.orange}
        />
      </div>

      {/* Risk Distribution */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Risk Distribution</h2>
        </div>
        <Card variant="default" padding="md">
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <RiskIndicator label="Low Risk" count={riskStats.lowRisk} color={colors.risk.low} />
            <RiskIndicator label="Medium" count={riskStats.mediumRisk} color={colors.risk.medium} />
            <RiskIndicator label="High Risk" count={riskStats.highRisk} color={colors.risk.high} />
            <RiskIndicator
              label="Critical"
              count={riskStats.criticalRisk}
              color={colors.risk.critical}
            />
          </div>
        </Card>
      </div>

      {/* Recent Tasks */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Recent Tasks</h2>
          {onViewQueue && (
            <Button variant="ghost" size="sm" onClick={onViewQueue}>
              View All →
            </Button>
          )}
        </div>
        <Table
          columns={taskColumns}
          data={recentTasks}
          keyExtractor={(task) => task.id}
          onRowClick={onTaskClick}
          emptyMessage="No tasks in queue"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface RiskIndicatorProps {
  label: string;
  count: number;
  color: string;
}

function RiskIndicator({ label, count, color }: RiskIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}50`,
        }}
      />
      <span style={{ color: colors.text.secondary, fontSize: '0.875rem' }}>{label}:</span>
      <span
        style={{
          color: color,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {count}
      </span>
    </div>
  );
}

export default AdminDashboard;
