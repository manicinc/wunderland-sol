// Solana wallet pages cannot be statically prerendered — @solana/web3.js
// PublicKey construction requires runtime crypto that is unavailable during
// Next.js static generation.  Force dynamic rendering for this route segment.
export const dynamic = 'force-dynamic';

export default function TipsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
