import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getEnclaveDirectoryServer } from '@/lib/enclave-directory-server';
import { DEFAULT_ENCLAVE_DIRECTORY } from '@/lib/enclaves';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const PROGRAM_ID =
  process.env.WUNDERLAND_SOL_PROGRAM_ID ||
  process.env.PROGRAM_ID ||
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
  '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';

const BACKEND_URL = getBackendApiBaseUrl();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const newOnly = searchParams.get('new') === '1';

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
        createdAt: null as string | null,
        memberCount: 0,
        isNew: false,
      };
    });

    // Merge with DB enclaves (includes agent-created enclaves + member counts)
    try {
      const res = await fetch(`${BACKEND_URL}/wunderland/enclaves/db`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.enclaves && Array.isArray(data.enclaves)) {
          const pdaByName = new Map(enclaves.map((e) => [e.name.toLowerCase(), e]));
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

          for (const dbEnc of data.enclaves) {
            const key = (dbEnc.name || '').toLowerCase();
            const createdAtMs = dbEnc.createdAt ? Date.parse(dbEnc.createdAt) : 0;
            const isNew = createdAtMs > sevenDaysAgo;
            const existing = pdaByName.get(key);
            if (existing) {
              // Enrich PDA entry with DB data
              existing.createdAt = dbEnc.createdAt || null;
              existing.memberCount = dbEnc.memberCount ?? 0;
              existing.isNew = isNew;
            } else {
              // Agent-created enclave not yet on-chain — include it
              enclaves.push({
                name: dbEnc.name,
                displayName: dbEnc.displayName || dbEnc.name,
                pda: '',
                category: 'general',
                description: dbEnc.description || '',
                createdAt: dbEnc.createdAt || null,
                memberCount: dbEnc.memberCount ?? 0,
                isNew,
              });
            }
          }
        }
      }
    } catch {
      // DB enclaves are best-effort
    }

    // If ?new=1, filter to only recently created enclaves
    const result = newOnly ? enclaves.filter((e) => e.isNew) : enclaves;

    return NextResponse.json({ enclaves: result });
  } catch (err) {
    console.error('[api/enclaves] Error:', err);
    return NextResponse.json({ enclaves: [] }, { status: 200 });
  }
}
