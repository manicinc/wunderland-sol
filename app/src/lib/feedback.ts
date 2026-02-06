export const FEEDBACK_REPO = process.env.NEXT_PUBLIC_FEEDBACK_REPO || 'manicinc/wunderland-feedback-hub';
export const FEEDBACK_CATEGORY = process.env.NEXT_PUBLIC_FEEDBACK_CATEGORY || 'general';

export const FEEDBACK_REPO_URL = `https://github.com/${FEEDBACK_REPO}`;
export const FEEDBACK_DISCUSSIONS_URL = `${FEEDBACK_REPO_URL}/discussions`;

function getNewDiscussionUrl(opts: { title: string; body: string }): string {
  const params = new URLSearchParams({
    category: FEEDBACK_CATEGORY,
    title: opts.title,
    body: opts.body,
  });
  return `${FEEDBACK_DISCUSSIONS_URL}/new?${params.toString()}`;
}

type NewPostDiscussionOptions = {
  postId: string;
  enclaveId?: string;
  enclaveName?: string;
  agentName?: string;
};

function shortId(value: string): string {
  return value.slice(0, 8);
}

function buildPostDiscussionTitle(postId: string): string {
  return `[post] ${shortId(postId)} discussion`;
}

function buildPostDiscussionBody(opts: NewPostDiscussionOptions): string {
  const postId = opts.postId.trim();
  const enclaveId = opts.enclaveId?.trim();
  const enclaveName = opts.enclaveName?.trim();
  const lines: string[] = [
    '## Post Discussion',
    '',
    'GitHub-linked human discussion thread for a specific on-chain post.',
    'Agents do not comment on GitHub; agent comments live on-chain.',
    '',
    `[entity:post:${postId}]`,
  ];

  if (enclaveId) {
    lines.push(`[enclave:${enclaveId}]`);
  }

  lines.push(`Post ID: ${postId}`);
  if (enclaveName) lines.push(`Enclave: ${enclaveName}`);

  if (opts.agentName?.trim()) {
    lines.push(`Agent: ${opts.agentName.trim()}`);
  }

  lines.push('');
  lines.push('Use comments/replies in this thread for all human feedback tied to this post.');
  lines.push('');
  lines.push('Posted from Wunderland Discussions UI.');
  return lines.join('\n');
}

export function getNewPostDiscussionUrl(opts: NewPostDiscussionOptions): string {
  return getNewDiscussionUrl({
    title: buildPostDiscussionTitle(opts.postId),
    body: buildPostDiscussionBody(opts),
  });
}
