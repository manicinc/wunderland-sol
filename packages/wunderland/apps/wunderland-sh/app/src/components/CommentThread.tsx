'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TipButton } from '@/components/TipButton';
import { MarkdownContent } from '@/components/MarkdownContent';

type Comment = {
  commentId: string;
  postId: string;
  parentCommentId: string | null;
  seedId: string;
  content: string;
  depth: number;
  path: string;
  upvotes: number;
  downvotes: number;
  score: number;
  childCount: number;
  createdAt: string;
  agent: {
    seedId: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  proof: {
    anchorStatus: string | null;
    contentHashHex: string | null;
    solTxSignature: string | null;
    solPostPda: string | null;
  };
};

function buildTree(comments: Comment[]): Map<string | null, Comment[]> {
  const tree = new Map<string | null, Comment[]>();
  for (const c of comments) {
    const parentKey = c.parentCommentId ?? null;
    if (!tree.has(parentKey)) tree.set(parentKey, []);
    tree.get(parentKey)!.push(c);
  }
  return tree;
}

function CommentNode({
  comment,
  tree,
  enclavePda,
  maxDepth = 6,
}: {
  comment: Comment;
  tree: Map<string | null, Comment[]>;
  enclavePda?: string;
  maxDepth?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const children = tree.get(comment.commentId) ?? [];
  const netVotes = comment.upvotes - comment.downvotes;

  return (
    <div
      className="relative"
      style={{ marginLeft: comment.depth > 0 ? `${Math.min(comment.depth, maxDepth) * 16}px` : 0 }}
    >
      {/* Thread line */}
      {comment.depth > 0 && (
        <div className="absolute left-[-8px] top-0 bottom-0 w-[1px] bg-white/5" />
      )}

      <div className="py-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-[10px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            [{collapsed ? '+' : '-'}]
          </button>
          <Link
            href={`/agents/${comment.seedId}`}
            className="text-xs font-display font-semibold hover:text-[var(--neon-cyan)] transition-colors"
          >
            {comment.agent.displayName || comment.seedId.slice(0, 12)}
          </Link>
          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
          {comment.proof.anchorStatus === 'anchored' && (
            <span className="badge badge-verified text-[8px]">On-chain</span>
          )}
        </div>

        {/* Content */}
        {!collapsed && (
          <>
            <MarkdownContent content={comment.content} className="text-sm text-[var(--text-primary)] leading-relaxed mb-1" />

            {/* Footer */}
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-[var(--neon-green)]">+{comment.upvotes}</span>
              <span className="text-[var(--neon-red)]">-{comment.downvotes}</span>
              <span className={netVotes >= 0 ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'}>
                net {netVotes >= 0 ? '+' : ''}{netVotes}
              </span>
              {comment.childCount > 0 && (
                <span className="text-[var(--text-tertiary)]">
                  {comment.childCount} {comment.childCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
              {comment.proof.contentHashHex && (
                <TipButton
                  contentHash={comment.proof.contentHashHex}
                  enclavePda={enclavePda}
                  className="text-[8px]"
                />
              )}
            </div>
          </>
        )}

        {/* Collapsed summary */}
        {collapsed && (
          <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
            [{children.length + comment.childCount} children hidden]
          </div>
        )}
      </div>

      {/* Children */}
      {!collapsed &&
        children.map((child) => (
          <CommentNode key={child.commentId} comment={child} tree={tree} enclavePda={enclavePda} maxDepth={maxDepth} />
        ))}
    </div>
  );
}

export function CommentThread({
  postId,
  enclavePda,
  sort = 'best',
}: {
  postId: string;
  enclavePda?: string;
  sort?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/posts/${encodeURIComponent(postId)}/comments?sort=${sort}&limit=200`,
      );
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId, sort]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-4 text-center text-[var(--text-tertiary)] text-sm">
        Loading comments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <div className="text-[var(--text-secondary)] text-sm mb-2">Failed to load comments</div>
        <button
          onClick={load}
          className="text-xs font-mono text-[var(--neon-cyan)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="py-4 text-center text-[var(--text-tertiary)] text-sm font-mono">
        No backend comments yet. Check the on-chain replies section for anchored threads.
      </div>
    );
  }

  const tree = buildTree(comments);
  const rootComments = tree.get(null) ?? [];

  return (
    <div className="space-y-1">
      {rootComments.map((c) => (
        <CommentNode key={c.commentId} comment={c} tree={tree} enclavePda={enclavePda} />
      ))}
    </div>
  );
}
