import { describe, expect, it } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { createHash } from 'crypto';
import { decodeJobPostingAccount } from '../client';

function accountDiscriminator(accountName: string): Buffer {
  return createHash('sha256').update(`account:${accountName}`).digest().subarray(0, 8);
}

describe('decodeJobPostingAccount', () => {
  it('decodes when buyItNowLamports is null (Option::None)', () => {
    const creator = Keypair.generate().publicKey;
    const assignedAgent = Keypair.generate().publicKey;
    const acceptedBid = Keypair.generate().publicKey;

    const metadataHash = Buffer.alloc(32, 7);
    const budgetLamports = 10_000_000n;

    // Account space uses the max-size layout (Option<u64> worst case), even when None.
    const data = Buffer.alloc(179, 0);
    accountDiscriminator('JobPosting').copy(data, 0);

    let offset = 8;
    creator.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(42n, offset);
    offset += 8;
    metadataHash.copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(budgetLamports, offset);
    offset += 8;

    // buy_it_now_lamports: None
    data.writeUInt8(0, offset);
    offset += 1;

    // status: Submitted (2)
    data.writeUInt8(2, offset);
    offset += 1;

    assignedAgent.toBuffer().copy(data, offset);
    offset += 32;
    acceptedBid.toBuffer().copy(data, offset);
    offset += 32;

    data.writeBigInt64LE(123n, offset);
    offset += 8;
    data.writeBigInt64LE(456n, offset);
    offset += 8;
    data.writeUInt8(9, offset); // bump

    const decoded = decodeJobPostingAccount(data);
    expect(decoded.creator.toBase58()).toBe(creator.toBase58());
    expect(decoded.jobNonce).toBe(42n);
    expect(Buffer.from(decoded.metadataHash).equals(metadataHash)).toBe(true);
    expect(decoded.budgetLamports).toBe(budgetLamports);
    expect(decoded.buyItNowLamports).toBeNull();
    expect(decoded.status).toBe('submitted');
    expect(decoded.assignedAgent.toBase58()).toBe(assignedAgent.toBase58());
    expect(decoded.acceptedBid.toBase58()).toBe(acceptedBid.toBase58());
    expect(decoded.createdAt).toBe(123n);
    expect(decoded.updatedAt).toBe(456n);
    expect(decoded.bump).toBe(9);
  });

  it('decodes when buyItNowLamports is set (Option::Some)', () => {
    const creator = Keypair.generate().publicKey;
    const assignedAgent = Keypair.generate().publicKey;
    const acceptedBid = Keypair.generate().publicKey;

    const metadataHash = Buffer.alloc(32, 11);
    const budgetLamports = 1_000_000n;
    const buyItNowLamports = 2_000_000n;

    const data = Buffer.alloc(179, 0);
    accountDiscriminator('JobPosting').copy(data, 0);

    let offset = 8;
    creator.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(7n, offset);
    offset += 8;
    metadataHash.copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(budgetLamports, offset);
    offset += 8;

    // buy_it_now_lamports: Some
    data.writeUInt8(1, offset);
    offset += 1;
    data.writeBigUInt64LE(buyItNowLamports, offset);
    offset += 8;

    // status: Assigned (1)
    data.writeUInt8(1, offset);
    offset += 1;

    assignedAgent.toBuffer().copy(data, offset);
    offset += 32;
    acceptedBid.toBuffer().copy(data, offset);
    offset += 32;

    data.writeBigInt64LE(999n, offset);
    offset += 8;
    data.writeBigInt64LE(1000n, offset);
    offset += 8;
    data.writeUInt8(1, offset); // bump

    const decoded = decodeJobPostingAccount(data);
    expect(decoded.creator.toBase58()).toBe(creator.toBase58());
    expect(decoded.jobNonce).toBe(7n);
    expect(Buffer.from(decoded.metadataHash).equals(metadataHash)).toBe(true);
    expect(decoded.budgetLamports).toBe(budgetLamports);
    expect(decoded.buyItNowLamports).toBe(buyItNowLamports);
    expect(decoded.status).toBe('assigned');
    expect(decoded.assignedAgent.toBase58()).toBe(assignedAgent.toBase58());
    expect(decoded.acceptedBid.toBase58()).toBe(acceptedBid.toBase58());
    expect(decoded.createdAt).toBe(999n);
    expect(decoded.updatedAt).toBe(1000n);
    expect(decoded.bump).toBe(1);
  });
});

