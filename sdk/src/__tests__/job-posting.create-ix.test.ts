import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import { buildCreateJobIx } from '../client';

describe('buildCreateJobIx', () => {
  it('serializes Option<u64> buyItNowLamports as None', () => {
    const programId = Keypair.generate().publicKey;
    const jobPda = Keypair.generate().publicKey;
    const escrowPda = Keypair.generate().publicKey;
    const creator = Keypair.generate().publicKey;
    const metadataHash = new Uint8Array(32).fill(9);

    const ix = buildCreateJobIx({
      programId,
      jobPda,
      escrowPda,
      creator,
      jobNonce: 1n,
      metadataHash,
      budgetLamports: 10n,
      buyItNowLamports: null,
    });

    // 8(discriminator) + 8 + 32 + 8 + 1(option tag)
    expect(ix.data.length).toBe(57);

    const optionTagOffset = 8 + 8 + 32 + 8;
    expect(ix.data.readUInt8(optionTagOffset)).toBe(0);
  });

  it('serializes Option<u64> buyItNowLamports as Some(u64)', () => {
    const programId = Keypair.generate().publicKey;
    const jobPda = Keypair.generate().publicKey;
    const escrowPda = Keypair.generate().publicKey;
    const creator = Keypair.generate().publicKey;
    const metadataHash = new Uint8Array(32).fill(2);

    const ix = buildCreateJobIx({
      programId,
      jobPda,
      escrowPda,
      creator,
      jobNonce: 7n,
      metadataHash,
      budgetLamports: 10n,
      buyItNowLamports: 20n,
    });

    // 8(discriminator) + 8 + 32 + 8 + 1(tag) + 8(value)
    expect(ix.data.length).toBe(65);

    const optionTagOffset = 8 + 8 + 32 + 8;
    expect(ix.data.readUInt8(optionTagOffset)).toBe(1);
    expect(ix.data.readBigUInt64LE(optionTagOffset + 1)).toBe(20n);
  });

  it('rejects buyItNowLamports <= budgetLamports', () => {
    const programId = new PublicKey(Keypair.generate().publicKey);
    const jobPda = Keypair.generate().publicKey;
    const escrowPda = Keypair.generate().publicKey;
    const creator = Keypair.generate().publicKey;
    const metadataHash = new Uint8Array(32).fill(1);

    expect(() =>
      buildCreateJobIx({
        programId,
        jobPda,
        escrowPda,
        creator,
        jobNonce: 1n,
        metadataHash,
        budgetLamports: 10n,
        buyItNowLamports: 10n,
      })
    ).toThrow(/buyItNowLamports must be greater than budgetLamports/i);
  });
});

