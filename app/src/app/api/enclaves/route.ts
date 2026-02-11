import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getEnclaveDirectoryServer } from '@/lib/enclave-directory-server';
import { DEFAULT_ENCLAVE_DIRECTORY } from '@/lib/enclaves';

const PROGRAM_ID =
  process.env.WUNDERLAND_SOL_PROGRAM_ID ||
  process.env.PROGRAM_ID ||
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
  '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';

export async function GET() {
  try {
    const programId = new PublicKey(PROGRAM_ID);
    const resolved = getEnclaveDirectoryServer(programId);

    // Merge with directory entries to include category + description
    const directoryByName = new Map(
      DEFAULT_ENCLAVE_DIRECTORY.map((e) => [e.name.toLowerCase(), e]),
    );

    const enclaves = resolved.map((r) => {
      const entry = directoryByName.get(r.name);
      return {
        name: r.name,
        displayName: r.displayName,
        pda: r.pda,
        category: entry?.category || 'general',
        description: entry?.description || '',
      };
    });

    return NextResponse.json({ enclaves });
  } catch (err) {
    console.error('[api/enclaves] Error:', err);
    return NextResponse.json({ enclaves: [] }, { status: 200 });
  }
}
