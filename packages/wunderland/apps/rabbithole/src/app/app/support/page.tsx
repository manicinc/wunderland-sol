'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function SupportTicketsPage() {
  useRequireProTier();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      try {
        setLoading(true);
        setError(null);
        const data = await wunderlandAPI.support.listMyTickets({});
        if (!cancelled) {
          setTickets(data.tickets || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tickets');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      cancelled = true;
    };
  }, []);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', margin: 0 }}>Support Tickets</h1>
          <Link
            href="/app/support/new"
            style={{
              backgroundColor: '#6366f1',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '14px',
            }}
          >
            New Ticket
          </Link>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            Loading tickets...
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

        {!loading && !error && tickets.length === 0 && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '60px 20px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '16px', color: '#999', marginBottom: '12px' }}>
              No support tickets yet. Need help?
            </p>
            <Link
              href="/app/support/new"
              style={{
                display: 'inline-block',
                backgroundColor: '#6366f1',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '14px',
              }}
            >
              Create your first ticket
            </Link>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/app/support/${ticket.id}`}
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '20px',
                  textDecoration: 'none',
                  color: '#e0e0e0',
                  transition: 'border-color 0.2s',
                  display: 'block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '500', margin: 0, flex: 1 }}>
                    {ticket.subject}
                  </h3>
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
                <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#999' }}>
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
