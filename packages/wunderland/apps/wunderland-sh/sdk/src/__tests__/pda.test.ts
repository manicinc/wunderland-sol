import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  WunderlandSolClient,
  deriveAgentPDA,
  deriveConfigPDA,
  deriveProgramDataPDA,
  derivePostPDA,
  deriveVotePDA,
  deriveVaultPDA,
  deriveEnclavePDA,
  deriveEnclaveTreasuryPDA,
  deriveRewardsEpochPDA,
  deriveRewardsClaimPDA,
  enclaveNameHash,
} from '../index.js';

describe('PDA derivation', () => {
  it('deriveConfigPDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
    const [actual] = deriveConfigPDA(programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('deriveAgentPDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const agentId = Buffer.alloc(32, 7);
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from('agent'), owner.toBuffer(), agentId], programId);
    const [actual] = deriveAgentPDA(owner, agentId, programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('deriveProgramDataPDA matches upgradeable loader PDA derivation', () => {
    const programId = Keypair.generate().publicKey;
    const loaderId = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
    const [expected] = PublicKey.findProgramAddressSync([programId.toBuffer()], loaderId);
    const [actual] = deriveProgramDataPDA(programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('derivePostPDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const agentPda = Keypair.generate().publicKey;
    const postIndex = 42;

    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(postIndex);
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from('post'), agentPda.toBuffer(), indexBuf], programId);
    const [actual] = derivePostPDA(agentPda, postIndex, programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('deriveVotePDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const postPda = Keypair.generate().publicKey;
    const voterAgent = Keypair.generate().publicKey;
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('vote'), postPda.toBuffer(), voterAgent.toBuffer()],
      programId,
    );
    const [actual] = deriveVotePDA(postPda, voterAgent, programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('deriveVaultPDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const agentIdentityPda = Keypair.generate().publicKey;
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from('vault'), agentIdentityPda.toBuffer()], programId);
    const [actual] = deriveVaultPDA(agentIdentityPda, programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('deriveEnclavePDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const name = 'wunderland';
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('enclave'), Buffer.from(enclaveNameHash(name))],
      programId,
    );
    const [actual] = deriveEnclavePDA(name, programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('deriveEnclaveTreasuryPDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const enclavePda = Keypair.generate().publicKey;
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from('enclave_treasury'), enclavePda.toBuffer()], programId);
    const [actual] = deriveEnclaveTreasuryPDA(enclavePda, programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('deriveRewardsEpochPDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const enclavePda = Keypair.generate().publicKey;
    const epoch = 7n;
    const epochBuf = Buffer.alloc(8);
    epochBuf.writeBigUInt64LE(epoch, 0);
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from('rewards_epoch'), enclavePda.toBuffer(), epochBuf], programId);
    const [actual] = deriveRewardsEpochPDA(enclavePda, epoch, programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('deriveRewardsClaimPDA uses the expected seeds', () => {
    const programId = Keypair.generate().publicKey;
    const rewardsEpochPda = Keypair.generate().publicKey;
    const index = 42;
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(index, 0);
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from('rewards_claim'), rewardsEpochPda.toBuffer(), indexBuf], programId);
    const [actual] = deriveRewardsClaimPDA(rewardsEpochPda, index, programId);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('WunderlandSolClient PDA helpers match free functions', () => {
    const programId = Keypair.generate().publicKey;
    const client = new WunderlandSolClient({ programId: programId.toBase58() });

    const [cfg1] = client.getConfigPDA();
    const [cfg2] = deriveConfigPDA(programId);
    expect(cfg1.toBase58()).toBe(cfg2.toBase58());

    const owner = Keypair.generate().publicKey;
    const agentId = Buffer.alloc(32, 11);
    const [agent1] = client.getAgentPDA(owner, agentId);
    const [agent2] = deriveAgentPDA(owner, agentId, programId);
    expect(agent1.toBase58()).toBe(agent2.toBase58());

    const enclavePda = Keypair.generate().publicKey;
    const [t1] = client.getEnclaveTreasuryPDA(enclavePda);
    const [t2] = deriveEnclaveTreasuryPDA(enclavePda, programId);
    expect(t1.toBase58()).toBe(t2.toBase58());
  });
});
