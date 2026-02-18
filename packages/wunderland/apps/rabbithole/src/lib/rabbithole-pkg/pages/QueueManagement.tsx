/**
 * Queue Management Page
 *
 * Full queue view with filtering, bulk actions, and task details.
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Table, type TableColumn } from '../ui/Table';
import { StatusBadge, RiskBadge, PriorityBadge, AssistantStatusBadge } from '../ui/Badge';
import { colors, shadows } from '../ui/tokens';
import type { TaskQueueItem, TaskStatus, TaskPriority, HumanAssistant } from '../admin/types';

// ============================================================================
// Types
// ============================================================================

export interface QueueManagementProps {
  tasks: TaskQueueItem[];
  assistants: HumanAssistant[];
  loading?: boolean;
  onApprove?: (taskIds: string[]) => void;
  onReject?: (taskIds: string[], reason: string) => void;
  onAssign?: (taskId: string, assistantId: string) => void;
  onTaskClick?: (task: TaskQueueItem) => void;
  onRefresh?: () => void;
}

interface FilterState {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  riskLevel: 'all' | 'low' | 'medium' | 'high' | 'critical';
  searchQuery: string;
}

// ============================================================================
// Icons
// ============================================================================

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const UserPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

// ============================================================================
// Queue Management Component
// ============================================================================

export function QueueManagement({
  tasks,
  assistants,
  loading = false,
  onApprove,
  onReject,
  onAssign,
  onTaskClick,
  onRefresh,
}: QueueManagementProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    riskLevel: 'all',
    searchQuery: '',
  });
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<string | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) return false;

      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;

      // Risk level filter
      if (filters.riskLevel !== 'all') {
        const score = task.riskScore ?? 0;
        switch (filters.riskLevel) {
          case 'low':
            if (score > 25) return false;
            break;
          case 'medium':
            if (score <= 25 || score > 50) return false;
            break;
          case 'high':
            if (score <= 50 || score > 75) return false;
            break;
          case 'critical':
            if (score <= 75) return false;
            break;
        }
      }

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.clientId.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [tasks, filters]);

  // Handlers
  const handleBulkApprove = () => {
    if (onApprove && selectedTasks.size > 0) {
      onApprove(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleBulkReject = () => {
    if (selectedTasks.size > 0) {
      setRejectModalOpen(true);
    }
  };

  const confirmReject = () => {
    if (onReject && selectedTasks.size > 0 && rejectReason) {
      onReject(Array.from(selectedTasks), rejectReason);
      setSelectedTasks(new Set());
      setRejectReason('');
      setRejectModalOpen(false);
    }
  };

  const handleAssign = (taskId: string) => {
    setSelectedTaskForAssign(taskId);
    setAssignModalOpen(true);
  };

  const confirmAssign = (assistantId: string) => {
    if (onAssign && selectedTaskForAssign) {
      onAssign(selectedTaskForAssign, assistantId);
      setAssignModalOpen(false);
      setSelectedTaskForAssign(null);
    }
  };

  // Table columns
  const columns: TableColumn<TaskQueueItem>[] = [
    {
      key: 'title',
      header: 'Task',
      render: (task) => (
        <div>
          <div style={{ fontWeight: 500 }}>{task.title}</div>
          <div
            style={{
              fontSize: '0.75rem',
              color: colors.text.muted,
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.description}
          </div>
        </div>
      ),
    },
    {
      key: 'clientId',
      header: 'Client',
      width: '120px',
      render: (task) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
          {task.clientId}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
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
      header: 'Risk',
      width: '110px',
      render: (task) => <RiskBadge score={task.riskScore ?? 0} size="sm" />,
    },
    {
      key: 'estimatedHours',
      header: 'Est.',
      width: '70px',
      align: 'right',
      render: (task) => `${task.estimatedHours}h`,
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      render: (task) => (
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {task.status === 'approved' && (
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.neon.cyan,
                cursor: 'pointer',
                padding: 4,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleAssign(task.id);
              }}
              title="Assign"
            >
              <UserPlusIcon />
            </button>
          )}
        </div>
      ),
    },
  ];

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
    marginBottom: '1.5rem',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
  };

  const filtersStyle: React.CSSProperties = {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  };

  const searchInputStyle: React.CSSProperties = {
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
    borderRadius: 8,
    padding: '0.5rem 1rem 0.5rem 2.5rem',
    color: colors.text.primary,
    fontSize: '0.875rem',
    width: 250,
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
    borderRadius: 8,
    padding: '0.5rem 1rem',
    color: colors.text.primary,
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer',
  };

  const bulkActionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: colors.bg.secondary,
    borderRadius: 8,
    marginBottom: '1rem',
    alignItems: 'center',
    boxShadow: shadows.sm,
  };

  return (
    <div style={containerStyle} className="rh-root">
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Queue Management</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {onRefresh && (
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card variant="default" padding="md" style={{ marginBottom: '1rem' }}>
        <div style={filtersStyle}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.text.muted,
              }}
            >
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              style={searchInputStyle}
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            />
          </div>

          {/* Status Filter */}
          <select
            style={selectStyle}
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value as FilterState['status'] })
            }
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Priority Filter */}
          <select
            style={selectStyle}
            value={filters.priority}
            onChange={(e) =>
              setFilters({ ...filters, priority: e.target.value as FilterState['priority'] })
            }
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="rush">Rush</option>
          </select>

          {/* Risk Filter */}
          <select
            style={selectStyle}
            value={filters.riskLevel}
            onChange={(e) =>
              setFilters({ ...filters, riskLevel: e.target.value as FilterState['riskLevel'] })
            }
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div style={{ fontSize: '0.875rem', color: colors.text.muted }}>
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <div style={bulkActionsStyle}>
          <span style={{ fontSize: '0.875rem', color: colors.text.secondary }}>
            {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
          </span>
          <div style={{ flex: 1 }} />
          {onApprove && (
            <Button variant="success" size="sm" onClick={handleBulkApprove} icon={<CheckIcon />}>
              Approve
            </Button>
          )}
          {onReject && (
            <Button variant="danger" size="sm" onClick={handleBulkReject} icon={<XIcon />}>
              Reject
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelectedTasks(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Task Table */}
      <Table
        columns={columns}
        data={filteredTasks}
        keyExtractor={(task) => task.id}
        onRowClick={onTaskClick}
        selectedKeys={selectedTasks}
        onSelectionChange={setSelectedTasks}
        loading={loading}
        stickyHeader
        emptyMessage="No tasks match your filters"
      />

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Tasks"
        description={`You are about to reject ${selectedTasks.size} task(s). Please provide a reason.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmReject} disabled={!rejectReason.trim()}>
              Reject
            </Button>
          </>
        }
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
          style={{
            width: '100%',
            minHeight: 100,
            background: colors.bg.elevated,
            border: `1px solid ${colors.border.default}`,
            borderRadius: 8,
            padding: '0.75rem',
            color: colors.text.primary,
            fontSize: '0.875rem',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Task"
        description="Select an assistant to assign this task to."
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {assistants
            .filter((a) => a.status === 'available')
            .map((assistant) => (
              <div
                key={assistant.id}
                style={{
                  padding: '0.75rem 1rem',
                  background: colors.bg.elevated,
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `1px solid ${colors.border.subtle}`,
                }}
                onClick={() => confirmAssign(assistant.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.neon.cyan;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border.subtle;
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{assistant.name}</div>
                  <div style={{ fontSize: '0.75rem', color: colors.text.muted }}>
                    Rating: {assistant.avgRating?.toFixed(1) ?? 'N/A'} • {assistant.tasksCompleted}{' '}
                    tasks
                  </div>
                </div>
                <AssistantStatusBadge status={assistant.status} size="sm" />
              </div>
            ))}
          {assistants.filter((a) => a.status === 'available').length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.text.muted }}>
              No available assistants
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default QueueManagement;
