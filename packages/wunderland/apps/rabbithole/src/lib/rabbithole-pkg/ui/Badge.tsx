/**
 * Badge Component
 *
 * Status and role badges with neumorphic styling.
 * Based on hackbase-next Badge patterns.
 */

import React from 'react';
import type { TaskStatus, TaskPriority, AssistantStatus, UserRole } from '../admin/types';
import { colors } from './tokens';

// ============================================================================
// Types
// ============================================================================

export type BadgeVariant = 'default' | 'status' | 'priority' | 'risk' | 'role' | 'assistant';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: string;
  icon?: React.ReactNode;
  className?: string;
}

// ============================================================================
// Status Badge Helper
// ============================================================================

export interface StatusBadgeProps {
  status: TaskStatus;
  size?: BadgeSize;
  className?: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: colors.status.pending },
  approved: { label: 'Approved', color: colors.status.approved },
  assigned: { label: 'Assigned', color: colors.status.assigned },
  in_progress: { label: 'In Progress', color: colors.status.inProgress },
  review: { label: 'In Review', color: colors.status.review },
  completed: { label: 'Completed', color: colors.status.completed },
  rejected: { label: 'Rejected', color: colors.status.rejected },
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="status" size={size} color={config.color} className={className}>
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Priority Badge Helper
// ============================================================================

export interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: BadgeSize;
  className?: string;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: colors.text.muted },
  normal: { label: 'Normal', color: colors.neon.cyan },
  high: { label: 'High', color: colors.neon.orange },
  rush: { label: 'Rush', color: colors.neon.red },
};

export function PriorityBadge({ priority, size = 'md', className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge variant="priority" size={size} color={config.color} className={className}>
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Risk Badge Helper
// ============================================================================

export interface RiskBadgeProps {
  score: number;
  size?: BadgeSize;
  showScore?: boolean;
  className?: string;
}

function getRiskConfig(score: number): { label: string; color: string } {
  if (score <= 25) return { label: 'Low Risk', color: colors.risk.low };
  if (score <= 50) return { label: 'Medium', color: colors.risk.medium };
  if (score <= 75) return { label: 'High Risk', color: colors.risk.high };
  return { label: 'Critical', color: colors.risk.critical };
}

export function RiskBadge({ score, size = 'md', showScore = true, className }: RiskBadgeProps) {
  const config = getRiskConfig(score);
  return (
    <Badge variant="risk" size={size} color={config.color} className={className}>
      {config.label}
      {showScore && ` (${score})`}
    </Badge>
  );
}

// ============================================================================
// Role Badge Helper
// ============================================================================

export interface RoleBadgeProps {
  role: UserRole;
  size?: BadgeSize;
  className?: string;
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  superadmin: { label: 'Super Admin', color: colors.role.superadmin },
  admin: { label: 'Admin', color: colors.role.admin },
  assistant: { label: 'Assistant', color: colors.role.assistant },
  client: { label: 'Client', color: colors.role.client },
};

export function RoleBadge({ role, size = 'md', className }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  return (
    <Badge variant="role" size={size} color={config.color} className={className}>
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Assistant Status Badge
// ============================================================================

export interface AssistantStatusBadgeProps {
  status: AssistantStatus;
  size?: BadgeSize;
  className?: string;
}

const ASSISTANT_STATUS_CONFIG: Record<AssistantStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: colors.neon.green },
  busy: { label: 'Busy', color: colors.neon.orange },
  offline: { label: 'Offline', color: colors.text.muted },
  on_break: { label: 'On Break', color: colors.neon.yellow },
};

export function AssistantStatusBadge({
  status,
  size = 'md',
  className,
}: AssistantStatusBadgeProps) {
  const config = ASSISTANT_STATUS_CONFIG[status];
  return (
    <Badge variant="assistant" size={size} color={config.color} className={className}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: config.color,
          marginRight: 6,
          boxShadow: `0 0 8px ${config.color}`,
        }}
      />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Base Badge Component
// ============================================================================

const SIZE_STYLES: Record<BadgeSize, React.CSSProperties> = {
  sm: { fontSize: '0.75rem', padding: '0.125rem 0.5rem' },
  md: { fontSize: '0.875rem', padding: '0.25rem 0.75rem' },
  lg: { fontSize: '1rem', padding: '0.375rem 1rem' },
};

export function Badge({
  children,
  variant: _variant = 'default',
  size = 'md',
  color,
  icon,
  className,
}: BadgeProps) {
  const accentColor = color || colors.neon.cyan;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderRadius: '9999px',
    backgroundColor: `${accentColor}20`,
    color: accentColor,
    border: `1px solid ${accentColor}30`,
    whiteSpace: 'nowrap',
    ...SIZE_STYLES[size],
  };

  return (
    <span style={baseStyle} className={className}>
      {icon}
      {children}
    </span>
  );
}

export default Badge;
