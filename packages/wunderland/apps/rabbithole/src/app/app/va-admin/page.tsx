'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRequireVaAdmin } from '@/lib/route-guard';
import { wunderlandAPI } from '@/lib/wunderland-api';

type SupportTicket = {
  id: string;
  userId?: string;
  anonymousId: string;
  piiShared: boolean;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  attachments?: string[];
  userEmail?: string | null;
  userName?: string | null;
  userPlan?: string | null;
  assignedToEmail?: string | null;
  createdAt: number;
  updatedAt: number | null;
  resolvedAt?: number | null;
  closedAt?: number | null;
};

type SupportStats = {
  total: number;
  open: number;
  inProgress: number;
  waitingOnUser: number;
  resolved: number;
  closed: number;
  urgent: number;
  byCategory: Record<string, number>;
};

export default function VAAdminDashboard() {
  useRequireVaAdmin();
  const { user } = useAuth();

  const [stats, setStats] = useState<SupportStats | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, ticketsRes] = await Promise.all([
          wunderlandAPI.support.admin.getStats(),
          wunderlandAPI.support.admin.listTickets({
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
            category: categoryFilter || undefined,
            limit: 100,
            offset: 0,
          }),
        ]);

        if (cancelled) return;

        setStats(statsRes);
        setTickets(ticketsRes.tickets || []);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, priorityFilter, categoryFilter]);

  async function handleAssignToMe(ticketId: string) {
    try {
      await wunderlandAPI.support.admin.assignTicket(ticketId);
      // Refresh tickets
      const ticketsRes = await wunderlandAPI.support.admin.listTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        limit: 100,
        offset: 0,
      });
      setTickets(ticketsRes.tickets || []);
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket');
    }
  }

  function getTimeAgo(dateStr: number | string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  }

  // Sort tickets: urgent first, then by oldest
  const sortedTickets = [...tickets].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111', color: '#e0e0e0', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>
            VA Admin Dashboard
          </h1>
          <p style={{ color: '#9ca3af' }}>Support team portal</p>
        </div>

        {loading && !stats && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Loading...</div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#7f1d1d',
              color: '#fecaca',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* Stats Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <StatCard label="Open" value={stats.open} color="#6366f1" />
              <StatCard label="In Progress" value={stats.inProgress} color="#f59e0b" />
              <StatCard label="Urgent" value={stats.urgent} color="#ef4444" />
              <StatCard label="Waiting on User" value={stats.waitingOnUser} color="#9ca3af" />
              <StatCard label="Resolved" value={stats.resolved} color="#22c55e" />
            </div>

            {/* Filter Bar */}
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#9ca3af' }}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    backgroundColor: '#111',
                    color: '#e0e0e0',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_on_user">Waiting on User</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#9ca3af' }}>
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{
                    backgroundColor: '#111',
                    color: '#e0e0e0',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">All</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#9ca3af' }}>
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    backgroundColor: '#111',
                    color: '#e0e0e0',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">All</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="bug_report">Bug Report</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            {/* Ticket Queue */}
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #333',
                  fontWeight: 'bold',
                  fontSize: '1.125rem',
                }}
              >
                Ticket Queue ({sortedTickets.length})
              </div>

              {sortedTickets.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No tickets found</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #333' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#9ca3af' }}>
                          ID
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#9ca3af' }}>
                          Subject
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#9ca3af' }}>
                          Category
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#9ca3af' }}>
                          Priority
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#9ca3af' }}>
                          Status
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#9ca3af' }}>
                          PII
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#9ca3af' }}>
                          Created
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#9ca3af' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          style={{
                            borderBottom: '1px solid #333',
                            backgroundColor: ticket.priority === 'urgent' ? '#1a0f0f' : undefined,
                          }}
                        >
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            <Link
                              href={`/app/va-admin/tickets/${ticket.id}`}
                              style={{ color: '#6366f1', textDecoration: 'none' }}
                            >
                              {ticket.anonymousId}
                            </Link>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            <Link
                              href={`/app/va-admin/tickets/${ticket.id}`}
                              style={{ color: '#e0e0e0', textDecoration: 'none' }}
                            >
                              {ticket.subject}
                            </Link>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            <Badge color="#6366f1">{ticket.category}</Badge>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            <Badge color={ticket.priority === 'urgent' ? '#ef4444' : '#9ca3af'}>
                              {ticket.priority}
                            </Badge>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            <Badge
                              color={
                                ticket.status === 'open'
                                  ? '#6366f1'
                                  : ticket.status === 'in_progress'
                                  ? '#f59e0b'
                                  : ticket.status === 'resolved'
                                  ? '#22c55e'
                                  : '#9ca3af'
                              }
                            >
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {ticket.piiShared ? (
                              <span title="User shared personal info" style={{ fontSize: '1rem' }}>
                                🔓
                              </span>
                            ) : (
                              <span title="User info redacted" style={{ fontSize: '1rem' }}>
                                🔒
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                            {getTimeAgo(ticket.createdAt)}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {!ticket.assignedToEmail && (
                              <button
                                onClick={() => handleAssignToMe(ticket.id)}
                                style={{
                                  backgroundColor: '#6366f1',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Assign to Me
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '1.5rem',
      }}
    >
      <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: color + '20',
        color,
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
        textTransform: 'capitalize',
      }}
    >
      {children}
    </span>
  );
}
