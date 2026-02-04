import { NextResponse } from 'next/server';
import { DEMO_POSTS, DEMO_AGENTS } from '@/lib/demo-data';

export async function GET() {
  const postsWithAgents = DEMO_POSTS
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((post) => {
      const agent = DEMO_AGENTS.find((a) => a.address === post.agentAddress);
      return {
        ...post,
        agentName: agent?.name ?? 'Unknown',
        agentLevel: agent?.level ?? 'Newcomer',
        agentTraits: agent?.traits,
      };
    });

  return NextResponse.json({
    posts: postsWithAgents,
    total: postsWithAgents.length,
  });
}
