'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireProTier } from '@/lib/route-guard';
import { wunderlandAPI } from '@/lib/wunderland-api';

interface SupportTicket {
  id: string;
  userId: string;
  anonymousId?: string;
  piiShared: boolean;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  attachments: string[];
  userEmail?: string | null;
  userName?: string | null;
  userPlan?: string | null;
  assignedToEmail?: string | null;
  createdAt: number;
  updatedAt: number | null;
  resolvedAt?: number | null;
  closedAt?: number | null;
}

interface SupportComment {
  id: string;
  ticketId: string;
  authorType: 'user' | 'va_admin';
  authorId: string | null;
  authorDisplay: string | null;
  content: string;
  attachments: string[];
  createdAt: number;
}

interface TicketWithComments extends SupportTicket {
  comments?: SupportComment[];
}

export default function SupportTicketDetailPage() {
  useRequireProTier();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketWithComments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [piiToggling, setPiiToggling] = useState(false);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await wunderlandAPI.support.getTicket(ticketId);
      setTicket({ ...data.ticket, comments: data.comments });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await wunderlandAPI.support.getTicket(ticketId);
        if (!cancelled) {
          setTicket({ ...data.ticket, comments: data.comments });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load ticket');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const handlePiiToggle = async () => {
    if (!ticket) return;

    try {
      setPiiToggling(true);
      await wunderlandAPI.support.togglePii(ticketId, !ticket.piiShared);
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update PII sharing');
    } finally {
      setPiiToggling(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await wunderlandAPI.support.addComment(ticketId, replyContent.trim());
      setReplyContent('');
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500' as const,
    };

    switch (status) {
      case 'open':
        return { ...baseStyle, backgroundColor: '#22c55e', color: '#fff' };
      case 'in_progress':
        return { ...baseStyle, backgroundColor: '#6366f1', color: '#fff' };
      case 'waiting_on_user':
        return { ...baseStyle, backgroundColor: '#f59e0b', color: '#fff' };
      case 'resolved':
      case 'closed':
        return { ...baseStyle, backgroundColor: '#4b5563', color: '#e0e0e0' };
      default:
        return { ...baseStyle, backgroundColor: '#333', color: '#e0e0e0' };
    }
  };

  const formatDate = (dateValue: number | string) => {
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111', color: '#e0e0e0', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link
            href="/app/support"
            style={{
              color: '#6366f1',
              textDecoration: 'none',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ← Back to tickets
          </Link>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            Loading ticket...
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#2a1515',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {!loading && ticket && (
          <>
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '32px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0, flex: 1 }}>
                  {ticket.subject}
                </h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {ticket.priority === 'urgent' && (
                    <span
                      style={{
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      URGENT
                    </span>
                  )}
                  <span style={getStatusBadgeStyle(ticket.status)}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#999', marginBottom: '24px' }}>
                <span
                  style={{
                    backgroundColor: '#333',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {ticket.category}
                </span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>

              <div
                style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#e0e0e0',
                  marginBottom: '24px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ticket.description}
              </div>

              <div
                style={{
                  borderTop: '1px solid #333',
                  paddingTop: '16px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'start',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ticket.piiShared}
                    onChange={handlePiiToggle}
                    disabled={piiToggling}
                    style={{ marginTop: '3px', cursor: piiToggling ? 'not-allowed' : 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      Share personal info with support team
                    </div>
                    <div style={{ color: '#999', fontSize: '13px' }}>
                      Allow support staff to see your email and account details for faster resolution. All staff are under NDA.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '32px',
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
                Conversation
              </h2>

              {ticket.comments && ticket.comments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  {ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        backgroundColor: comment.authorType === 'va_admin' ? '#1e1e3f' : '#111',
                        border: comment.authorType === 'va_admin' ? '1px solid #6366f1' : '1px solid #333',
                        borderRadius: '6px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>
                            {comment.authorDisplay}
                          </span>
                          {comment.authorType === 'va_admin' && (
                            <span
                              style={{
                                backgroundColor: '#6366f1',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: '500',
                              }}
                            >
                              Support Team
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '13px', color: '#999' }}>
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.5',
                          color: '#e0e0e0',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {comment.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px', marginBottom: '32px' }}>
                  No comments yet. Be the first to reply.
                </div>
              )}

              <form onSubmit={handleReplySubmit}>
                <label
                  htmlFor="reply"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                  }}
                >
                  Add a reply
                </label>
                <textarea
                  id="reply"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#111',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    marginBottom: '12px',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333';
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting || !replyContent.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: submitting || !replyContent.trim() ? '#4b5563' : '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: submitting || !replyContent.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting && replyContent.trim()) {
                      e.currentTarget.style.backgroundColor = '#5558e3';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting && replyContent.trim()) {
                      e.currentTarget.style.backgroundColor = '#6366f1';
                    }
                  }}
                >
                  {submitting ? 'Sending...' : 'Send Reply'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
