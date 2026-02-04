import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/solana';

export async function GET() {
  const posts = getAllPosts().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({
    posts,
    total: posts.length,
  });
}
