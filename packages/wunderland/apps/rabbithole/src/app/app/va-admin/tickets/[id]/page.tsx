'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  comments?: SupportComment[];
};

type SupportComment = {
  id: string;
  ticketId: string;
  authorType: 'user' | 'va_admin';
  authorId: string | null;
  authorDisplay: string | null;
  content: string;
  attachments?: string[];
  createdAt: number;
};

export default function VAAdminTicketDetail() {
  useRequireVaAdmin();
  const { user } = useAuth();
  const params = useParams();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTicket() {
      try {
        setLoading(true);
        setError(null);

        const data = await wunderlandAPI.support.admin.getTicket(ticketId);

        if (cancelled) return;

        setTicket({ ...data.ticket, comments: data.comments });
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Failed to load ticket');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (ticketId) {
      loadTicket();
    }

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  async function reloadTicket() {
    const data = await wunderlandAPI.support.admin.getTicket(ticketId);
    setTicket({ ...data.ticket, comments: data.comments });
  }

  async function handleAssignToMe() {
    try {
      await wunderlandAPI.support.admin.assignTicket(ticketId);
      await reloadTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket');
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    try {
      await wunderlandAPI.support.admin.updateStatus(ticketId, newStatus);
      await reloadTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  }

  async function handleSubmitReply() {
    if (!replyContent.trim()) return;

    try {
      setSubmitting(true);
      await wunderlandAPI.support.admin.addComment(ticketId, replyContent);
      await reloadTicket();
      setReplyContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDateTime(dateStr: number | string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111', color: '#e0e0e0', padding: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Back Link */}
        <Link
          href="/app/va-admin"
          style={{
            display: 'inline-block',
            color: '#6366f1',
            textDecoration: 'none',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          ← Back to Dashboard
        </Link>

        {loading && !ticket && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Loading ticket...</div>
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

        {ticket && (
          <>
            {/* Ticket Header */}
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>
                    {ticket.subject}
                  </h1>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                    {ticket.anonymousId} • Created {formatDateTime(ticket.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                  <Badge color={ticket.priority === 'urgent' ? '#ef4444' : '#9ca3af'}>{ticket.priority}</Badge>
                  <Badge color="#6366f1">{ticket.category}</Badge>
                </div>
              </div>

              {/* PII Section */}
              {ticket.piiShared ? (
                <div
                  style={{
                    backgroundColor: '#1e3a8a',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>🔓</span>
                    <strong>User has shared personal info under NDA</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#bfdbfe' }}>
                    <div>Name: {ticket.userName || 'N/A'}</div>
                    <div>Email: {ticket.userEmail || 'N/A'}</div>
                    <div>Plan: {ticket.userPlan || 'N/A'}</div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af' }}>
                    <span style={{ fontSize: '1rem' }}>🔒</span>
                    <span>User info: Redacted ({ticket.anonymousId})</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {!ticket.assignedToEmail && (
                  <button
                    onClick={handleAssignToMe}
                    style={{
                      backgroundColor: '#6366f1',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Assign to Me
                  </button>
                )}

                {ticket.assignedToEmail && (
                  <div
                    style={{
                      backgroundColor: '#0d0d0d',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      color: '#9ca3af',
                    }}
                  >
                    Assigned to: {ticket.assignedToEmail}
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.875rem', color: '#9ca3af', marginRight: '0.5rem' }}>
                    Update Status:
                  </label>
                  <select
                    value={ticket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    style={{
                      backgroundColor: '#0d0d0d',
                      color: '#e0e0e0',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_user">Waiting on User</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ticket Description */}
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#9ca3af' }}>
                Description
              </h2>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{ticket.description}</div>
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Attachments:</div>
                  {ticket.attachments.map((url, idx) => (
                    <div key={idx}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#6366f1', fontSize: '0.875rem' }}
                      >
                        Attachment {idx + 1}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Thread */}
            {ticket.comments && ticket.comments.length > 0 && (
              <div
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                <h2 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#9ca3af' }}>
                  Comments
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        backgroundColor: comment.authorType === 'va_admin' ? '#0d1a2d' : '#0d0d0d',
                        border: `1px solid ${comment.authorType === 'va_admin' ? '#1e3a8a' : '#333'}`,
                        borderRadius: '6px',
                        padding: '1rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.875rem' }}>{comment.authorDisplay}</strong>
                          {comment.authorType === 'va_admin' && (
                            <Badge color="#6366f1" style={{ fontSize: '0.75rem' }}>
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {formatDateTime(comment.createdAt)}
                        </div>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.875rem' }}>
                        {comment.content}
                      </div>
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          {comment.attachments.map((url, idx) => (
                            <div key={idx}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#6366f1', fontSize: '0.75rem' }}
                              >
                                Attachment {idx + 1}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Form */}
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#9ca3af' }}>
                Admin Reply
              </h2>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply here..."
                rows={6}
                style={{
                  width: '100%',
                  backgroundColor: '#0d0d0d',
                  color: '#e0e0e0',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  marginBottom: '1rem',
                }}
              />
              <button
                onClick={handleSubmitReply}
                disabled={submitting || !replyContent.trim()}
                style={{
                  backgroundColor: submitting || !replyContent.trim() ? '#333' : '#6366f1',
                  color: submitting || !replyContent.trim() ? '#666' : '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.875rem',
                  cursor: submitting || !replyContent.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                }}
              >
                {submitting ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Badge({ color, children, style }: { color: string; children: React.ReactNode; style?: React.CSSProperties }) {
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
        ...style,
      }}
    >
      {children}
    </span>
  );
}
