import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { WunderlandSol } from "../target/types/wunderland_sol";
import { expect } from "chai";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Ed25519Program,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { createHash } from "crypto";
import BN from "bn.js";

const SIGN_DOMAIN = Buffer.from("WUNDERLAND_SOL_V2");
const ACTION_CREATE_ENCLAVE = 1;
const ACTION_ANCHOR_POST = 2;
const ACTION_CAST_VOTE = 4;
const ACTION_PLACE_JOB_BID = 6;
const ACTION_WITHDRAW_JOB_BID = 7;
const ACTION_SUBMIT_JOB = 8;
const MERKLE_DOMAIN = Buffer.from("WUNDERLAND_REWARDS_V1");

describe("wunderland-sol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WunderlandSol as Program<WunderlandSol>;
  const authority = provider.wallet;

  // Agent 1 — "Athena"
  const agentId1 = Array.from(
    createHash("sha256").update("athena-agent-v1").digest()
  );
  const agentSigner1 = Keypair.generate();

  // Agent 2 — "Voter" (for cross-agent voting)
  const agentId2 = Array.from(
    createHash("sha256").update("voter-agent-v1").digest()
  );
  const agentSigner2 = Keypair.generate();

  // Enclave
  const enclaveName = "proof-theory";
  const enclaveNameHash = Array.from(
    createHash("sha256")
      .update(enclaveName.toLowerCase().trim())
      .digest()
  );

  // --- Helpers ---

  function encodeName(name: string): number[] {
    const buf = Buffer.alloc(32, 0);
    Buffer.from(name, "utf-8").copy(buf);
    return Array.from(buf);
  }

  function hashContent(content: string): number[] {
    return Array.from(createHash("sha256").update(content).digest());
  }

  const BPF_LOADER_UPGRADEABLE = new PublicKey(
    "BPFLoaderUpgradeab1e11111111111111111111111"
  );

  function deriveConfigPDA() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
  }

  function deriveTreasuryPDA() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );
  }

  function deriveEconomicsPDA() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("econ")],
      program.programId
    );
  }

  function deriveProgramDataPDA() {
    return PublicKey.findProgramAddressSync(
      [program.programId.toBuffer()],
      BPF_LOADER_UPGRADEABLE
    );
  }

  function deriveAgentPDA(owner: PublicKey, agentId: number[]) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), owner.toBuffer(), Buffer.from(agentId)],
      program.programId
    );
  }

  function deriveVaultPDA(agentPda: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), agentPda.toBuffer()],
      program.programId
    );
  }

  function deriveDonationReceiptPDA(
    donor: PublicKey,
    agentPda: PublicKey,
    donationNonce: number
  ) {
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64LE(BigInt(donationNonce));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("donation"), donor.toBuffer(), agentPda.toBuffer(), nonceBuf],
      program.programId
    );
  }

  function derivePostPDA(agentPda: PublicKey, entryIndex: number) {
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(entryIndex);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("post"), agentPda.toBuffer(), indexBuf],
      program.programId
    );
  }

  function deriveVotePDA(postPda: PublicKey, voterAgentPda: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), postPda.toBuffer(), voterAgentPda.toBuffer()],
      program.programId
    );
  }

  function deriveEnclavePDA(nameHash: number[]) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("enclave"), Buffer.from(nameHash)],
      program.programId
    );
  }

  function deriveEnclaveTreasuryPDA(enclavePda: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("enclave_treasury"), enclavePda.toBuffer()],
      program.programId
    );
  }

  function deriveRewardsEpochPDA(enclavePda: PublicKey, epoch: BN) {
    const epochBuf = epoch.toArrayLike(Buffer, "le", 8);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("rewards_epoch"), enclavePda.toBuffer(), epochBuf],
      program.programId
    );
  }

  function deriveRewardsClaimPDA(rewardsEpochPda: PublicKey, index: number) {
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(index);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("rewards_claim"), rewardsEpochPda.toBuffer(), indexBuf],
      program.programId
    );
  }

  function deriveTipPDA(tipper: PublicKey, nonce: number) {
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64LE(BigInt(nonce));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("tip"), tipper.toBuffer(), nonceBuf],
      program.programId
    );
  }

  function deriveEscrowPDA(tipPda: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), tipPda.toBuffer()],
      program.programId
    );
  }

  function deriveRateLimitPDA(tipper: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("rate_limit"), tipper.toBuffer()],
      program.programId
    );
  }

  function deriveJobPDA(creator: PublicKey, jobNonce: number) {
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64LE(BigInt(jobNonce));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("job"), creator.toBuffer(), nonceBuf],
      program.programId
    );
  }

  function deriveJobEscrowPDA(jobPda: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("job_escrow"), jobPda.toBuffer()],
      program.programId
    );
  }

  function deriveJobBidPDA(jobPda: PublicKey, bidderAgentPda: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("job_bid"), jobPda.toBuffer(), bidderAgentPda.toBuffer()],
      program.programId
    );
  }

  function deriveJobSubmissionPDA(jobPda: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("job_submission"), jobPda.toBuffer()],
      program.programId
    );
  }

  function deriveOwnerCounterPDA(owner: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("owner_counter"), owner.toBuffer()],
      program.programId
    );
  }

  function deriveRecoveryPDA(agentPda: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("recovery"), agentPda.toBuffer()],
      program.programId
    );
  }

  function buildAgentMessage(
    action: number,
    agentPda: PublicKey,
    payload: Buffer
  ): Buffer {
    return Buffer.concat([
      SIGN_DOMAIN,
      Buffer.from([action]),
      program.programId.toBuffer(),
      agentPda.toBuffer(),
      payload,
    ]);
  }

  function createEd25519Ix(signer: Keypair, message: Buffer) {
    return Ed25519Program.createInstructionWithPrivateKey({
      privateKey: signer.secretKey,
      message,
    });
  }

  function u64LE(value: number): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(value));
    return buf;
  }

  function u32LE(value: number): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(value);
    return buf;
  }

  function rewardsLeafHash(opts: {
    enclavePda: PublicKey;
    epoch: BN;
    index: number;
    agentIdentityPda: PublicKey;
    amount: number;
  }): Buffer {
    return createHash("sha256")
      .update(
        Buffer.concat([
          MERKLE_DOMAIN,
          opts.enclavePda.toBuffer(),
          opts.epoch.toArrayLike(Buffer, "le", 8),
          u32LE(opts.index),
          opts.agentIdentityPda.toBuffer(),
          u64LE(opts.amount),
        ])
      )
      .digest();
  }

  function merkleParent(left: Buffer, right: Buffer): Buffer {
    return createHash("sha256").update(Buffer.concat([left, right])).digest();
  }

  // Shared PDAs (computed once)
  let configPda: PublicKey;
  let treasuryPda: PublicKey;
  let economicsPda: PublicKey;
  let ownerCounterPda: PublicKey;
  let programDataPda: PublicKey;
  let agent1Pda: PublicKey;
  let vault1Pda: PublicKey;
  let agent2Pda: PublicKey;
  let vault2Pda: PublicKey;
  let enclavePda: PublicKey;
  let enclaveTreasuryPda: PublicKey;
  let post0Pda: PublicKey;

  before(() => {
    [configPda] = deriveConfigPDA();
    [treasuryPda] = deriveTreasuryPDA();
    [economicsPda] = deriveEconomicsPDA();
    [ownerCounterPda] = deriveOwnerCounterPDA(authority.publicKey);
    [programDataPda] = deriveProgramDataPDA();
    [agent1Pda] = deriveAgentPDA(authority.publicKey, agentId1);
    [vault1Pda] = deriveVaultPDA(agent1Pda);
    [agent2Pda] = deriveAgentPDA(authority.publicKey, agentId2);
    [vault2Pda] = deriveVaultPDA(agent2Pda);
    [enclavePda] = deriveEnclavePDA(enclaveNameHash);
    [enclaveTreasuryPda] = deriveEnclaveTreasuryPDA(enclavePda);
    [post0Pda] = derivePostPDA(agent1Pda, 0);
  });

  // ================================================================
  // Happy-path tests (10)
  // ================================================================

  it("initializes config", async () => {
    await program.methods
      .initializeConfig(authority.publicKey)
      .accounts({
        config: configPda,
        treasury: treasuryPda,
        programData: programDataPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const cfg = await program.account.programConfig.fetch(configPda);
    expect(cfg.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(cfg.agentCount).to.equal(0);
    expect(cfg.enclaveCount).to.equal(0);
  });

  it("initializes economics", async () => {
    await program.methods
      .initializeEconomics()
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        economics: economicsPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const econ = await (program.account as any).economicsConfig.fetch(economicsPda);
    expect(econ.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(econ.agentMintFeeLamports.toNumber()).to.equal(50_000_000);
    expect(econ.maxAgentsPerWallet).to.equal(5);
    expect(econ.recoveryTimelockSeconds.toNumber()).to.equal(5 * 60);
  });

  it("initializes agent 1 (Athena)", async () => {
    const traits: number[] = [850, 450, 700, 900, 850, 600];
    const metadataHash = hashContent("athena-metadata-v1");

    await program.methods
      .initializeAgent(
        agentId1,
        encodeName("Athena"),
        traits,
        metadataHash,
        agentSigner1.publicKey
      )
      .accounts({
        config: configPda,
        treasury: treasuryPda,
        economics: economicsPda,
        ownerCounter: ownerCounterPda,
        owner: authority.publicKey,
        agentIdentity: agent1Pda,
        vault: vault1Pda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const agent = await program.account.agentIdentity.fetch(agent1Pda);
    expect(agent.owner.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(agent.agentSigner.toBase58()).to.equal(
      agentSigner1.publicKey.toBase58()
    );
    expect(agent.citizenLevel).to.equal(1);
    expect(agent.totalEntries).to.equal(0);
    expect(agent.isActive).to.equal(true);
    expect(agent.hexacoTraits).to.deep.equal(traits);

    const treasury = await program.account.globalTreasury.fetch(treasuryPda);
    expect(treasury.totalCollected.toNumber()).to.equal(50_000_000);
  });

  it("initializes agent 2 (Voter)", async () => {
    const traits: number[] = [600, 250, 850, 450, 800, 500];
    const metadataHash = hashContent("voter-metadata-v1");

    await program.methods
      .initializeAgent(
        agentId2,
        encodeName("Voter"),
        traits,
        metadataHash,
        agentSigner2.publicKey
      )
      .accounts({
        config: configPda,
        treasury: treasuryPda,
        economics: economicsPda,
        ownerCounter: ownerCounterPda,
        owner: authority.publicKey,
        agentIdentity: agent2Pda,
        vault: vault2Pda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const agent = await program.account.agentIdentity.fetch(agent2Pda);
    expect(agent.owner.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(agent.citizenLevel).to.equal(1);
    expect(agent.isActive).to.equal(true);

    const cfg = await program.account.programConfig.fetch(configPda);
    expect(cfg.agentCount).to.equal(2);

    const treasury = await program.account.globalTreasury.fetch(treasuryPda);
    expect(treasury.totalCollected.toNumber()).to.equal(100_000_000);
  });

  it("creates an enclave", async () => {
    const metadataHash = hashContent("proof-theory-enclave-metadata");

    const payload = Buffer.concat([
      Buffer.from(enclaveNameHash),
      Buffer.from(metadataHash),
    ]);
    const message = buildAgentMessage(
      ACTION_CREATE_ENCLAVE,
      agent1Pda,
      payload
    );
    const ed25519Ix = createEd25519Ix(agentSigner1, message);

    await program.methods
      .createEnclave(enclaveNameHash, metadataHash)
      .accounts({
        config: configPda,
        creatorAgent: agent1Pda,
        enclave: enclavePda,
        enclaveTreasury: enclaveTreasuryPda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([ed25519Ix])
      .rpc();

    const enclave = await program.account.enclave.fetch(enclavePda);
    expect(enclave.creatorAgent.toBase58()).to.equal(agent1Pda.toBase58());
    expect(enclave.creatorOwner.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(enclave.isActive).to.equal(true);

    const enclaveTreasury = await (program.account as any).enclaveTreasury.fetch(enclaveTreasuryPda);
    expect(enclaveTreasury.enclave.toBase58()).to.equal(enclavePda.toBase58());

    const cfg = await program.account.programConfig.fetch(configPda);
    expect(cfg.enclaveCount).to.equal(1);
  });

  it("anchors a post", async () => {
    const contentHash = hashContent(
      "Hello, Wunderland! This is my first on-chain post."
    );
    const manifestHash = hashContent("manifest-proof-v1");

    const entryIndex = 0;
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(entryIndex);

    const payload = Buffer.concat([
      enclavePda.toBuffer(), // enclave
      Buffer.from([0]), // kind = Post = 0
      PublicKey.default.toBuffer(), // reply_to = none
      indexBuf, // entry_index
      Buffer.from(contentHash),
      Buffer.from(manifestHash),
    ]);

    const message = buildAgentMessage(ACTION_ANCHOR_POST, agent1Pda, payload);
    const ed25519Ix = createEd25519Ix(agentSigner1, message);

    await program.methods
      .anchorPost(contentHash, manifestHash)
      .accounts({
        postAnchor: post0Pda,
        agentIdentity: agent1Pda,
        enclave: enclavePda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([ed25519Ix])
      .rpc();

    const post = await program.account.postAnchor.fetch(post0Pda);
    expect(post.postIndex).to.equal(0);
    expect(post.upvotes).to.equal(0);
    expect(post.downvotes).to.equal(0);
    expect(post.agent.toBase58()).to.equal(agent1Pda.toBase58());
    expect(post.enclave.toBase58()).to.equal(enclavePda.toBase58());

    const agent = await program.account.agentIdentity.fetch(agent1Pda);
    expect(agent.totalEntries).to.equal(1);
  });

  it("casts a vote (upvote)", async () => {
    const [votePda] = deriveVotePDA(post0Pda, agent2Pda);
    const value = 1;

    const payload = Buffer.concat([
      post0Pda.toBuffer(),
      Buffer.from([value]),
    ]);
    const message = buildAgentMessage(ACTION_CAST_VOTE, agent2Pda, payload);
    const ed25519Ix = createEd25519Ix(agentSigner2, message);

    await program.methods
      .castVote(value)
      .accounts({
        reputationVote: votePda,
        postAnchor: post0Pda,
        postAgent: agent1Pda,
        voterAgent: agent2Pda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([ed25519Ix])
      .rpc();

    const vote = await program.account.reputationVote.fetch(votePda);
    expect(vote.value).to.equal(1);
    expect(vote.voterAgent.toBase58()).to.equal(agent2Pda.toBase58());

    const post = await program.account.postAnchor.fetch(post0Pda);
    expect(post.upvotes).to.equal(1);

    const agent = await program.account.agentIdentity.fetch(agent1Pda);
    expect(agent.reputationScore.toNumber()).to.equal(1);
  });

  it("deposits to vault", async () => {
    const depositAmount = new BN(LAMPORTS_PER_SOL);

    await program.methods
      .depositToVault(depositAmount)
      .accounts({
        agentIdentity: agent1Pda,
        vault: vault1Pda,
        depositor: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vaultBalance = await provider.connection.getBalance(vault1Pda);
    expect(vaultBalance).to.be.greaterThan(anchor.web3.LAMPORTS_PER_SOL);
  });

  it("withdraws from vault", async () => {
    const withdrawAmount = new BN(500_000_000);
    const balanceBefore = await provider.connection.getBalance(
      authority.publicKey
    );

    await program.methods
      .withdrawFromVault(withdrawAmount)
      .accounts({
        agentIdentity: agent1Pda,
        vault: vault1Pda,
        owner: authority.publicKey,
      })
      .rpc();

    const balanceAfter = await provider.connection.getBalance(
      authority.publicKey
    );
    expect(balanceAfter).to.be.greaterThan(balanceBefore);
  });

  it("donates to agent (receipt + vault)", async () => {
    const donor = Keypair.generate();
    const airdropSig = await provider.connection.requestAirdrop(
      donor.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig, "confirmed");

    const donationNonce = 1;
    const [receiptPda] = deriveDonationReceiptPDA(
      donor.publicKey,
      agent1Pda,
      donationNonce
    );

    const donateAmount = new BN(50_000_000); // 0.05 SOL
    const contextHash = hashContent(`post:${post0Pda.toBase58()}`);

    const vaultBefore = await provider.connection.getBalance(vault1Pda);

    await program.methods
      .donateToAgent(donateAmount, contextHash, new BN(donationNonce))
      .accounts({
        donor: donor.publicKey,
        agentIdentity: agent1Pda,
        vault: vault1Pda,
        receipt: receiptPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([donor])
      .rpc();

    const vaultAfter = await provider.connection.getBalance(vault1Pda);
    expect(vaultAfter - vaultBefore).to.equal(donateAmount.toNumber());

    const receipt = await program.account.donationReceipt.fetch(receiptPda);
    expect(receipt.donor.toBase58()).to.equal(donor.publicKey.toBase58());
    expect(receipt.agent.toBase58()).to.equal(agent1Pda.toBase58());
    expect(receipt.vault.toBase58()).to.equal(vault1Pda.toBase58());
    expect(receipt.amount.toNumber()).to.equal(donateAmount.toNumber());
    expect(Buffer.from(receipt.contextHash)).to.deep.equal(Buffer.from(contextHash));
    expect(receipt.donatedAt.toNumber()).to.be.greaterThan(0);
  });

  it("submits a tip (global)", async () => {
    const tipNonce = 0;
    const [tipPda] = deriveTipPDA(authority.publicKey, tipNonce);
    const [escrowPda] = deriveEscrowPDA(tipPda);
    const [rateLimitPda] = deriveRateLimitPDA(authority.publicKey);

    const tipContentHash = hashContent(
      "Check out this amazing article about AI agents!"
    );
    const tipAmount = new BN(15_000_000); // 0.015 SOL minimum

    await program.methods
      .submitTip(tipContentHash, tipAmount, 0, new BN(tipNonce))
      .accounts({
        tipper: authority.publicKey,
        rateLimit: rateLimitPda,
        tip: tipPda,
        escrow: escrowPda,
        targetEnclave: SystemProgram.programId, // global tip
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const tip = await program.account.tipAnchor.fetch(tipPda);
    expect(tip.amount.toNumber()).to.equal(15_000_000);
    expect(tip.tipper.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(tip.targetEnclave.toBase58()).to.equal(
      SystemProgram.programId.toBase58()
    );
    expect(JSON.stringify(tip.status)).to.include("pending");

    const escrow = await program.account.tipEscrow.fetch(escrowPda);
    expect(escrow.amount.toNumber()).to.equal(15_000_000);
  });

  it("settles a tip (global → 100% treasury)", async () => {
    const tipNonce = 0;
    const [tipPda] = deriveTipPDA(authority.publicKey, tipNonce);
    const [escrowPda] = deriveEscrowPDA(tipPda);

    await program.methods
      .settleTip()
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        tip: tipPda,
        escrow: escrowPda,
        treasury: treasuryPda,
        targetEnclave: SystemProgram.programId,
        enclaveTreasury: authority.publicKey, // unused for global tips
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const tip = await program.account.tipAnchor.fetch(tipPda);
    expect(JSON.stringify(tip.status)).to.include("settled");

    const treasury = await program.account.globalTreasury.fetch(treasuryPda);
    // Includes 2x agent registration fees (0.05 SOL each) + this global tip settlement.
    expect(treasury.totalCollected.toNumber()).to.equal(115_000_000);
  });

  it("settles a tip (enclave → 70% treasury, 30% enclave treasury)", async () => {
    const tipNonce = 1;
    const [tipPda] = deriveTipPDA(authority.publicKey, tipNonce);
    const [escrowPda] = deriveEscrowPDA(tipPda);
    const [rateLimitPda] = deriveRateLimitPDA(authority.publicKey);

    const tipContentHash = hashContent("Enclave-scoped tip for proof-theory");
    const tipAmount = new BN(15_000_000); // min

    const enclaveTreasuryBefore = await provider.connection.getBalance(enclaveTreasuryPda);

    await program.methods
      .submitTip(tipContentHash, tipAmount, 0, new BN(tipNonce))
      .accounts({
        tipper: authority.publicKey,
        rateLimit: rateLimitPda,
        tip: tipPda,
        escrow: escrowPda,
        targetEnclave: enclavePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .settleTip()
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        tip: tipPda,
        escrow: escrowPda,
        treasury: treasuryPda,
        targetEnclave: enclavePda,
        enclaveTreasury: enclaveTreasuryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const enclaveTreasuryAfter = await provider.connection.getBalance(enclaveTreasuryPda);
    expect(enclaveTreasuryAfter - enclaveTreasuryBefore).to.equal(4_500_000);
  });

  it("publishes a rewards epoch and supports Merkle claims + sweep", async () => {
    const epoch = new BN(0);
    const [rewardsEpochPda] = deriveRewardsEpochPDA(enclavePda, epoch);

    // Two-leaf Merkle tree (power-of-two for test simplicity).
    const allocations = [
      { index: 0, agent: agent1Pda, amount: 2_000_000 },
      { index: 1, agent: agent2Pda, amount: 2_500_000 },
    ];
    const leaves = allocations.map((a) =>
      rewardsLeafHash({
        enclavePda,
        epoch,
        index: a.index,
        agentIdentityPda: a.agent,
        amount: a.amount,
      })
    );
    const root = merkleParent(leaves[0], leaves[1]);
    const total = new BN(allocations[0].amount + allocations[1].amount);

    const enclaveTreasuryBefore = await provider.connection.getBalance(enclaveTreasuryPda);

    await program.methods
      .publishRewardsEpoch(epoch, Array.from(root), total, new BN(2)) // 2s claim window
      .accounts({
        enclave: enclavePda,
        enclaveTreasury: enclaveTreasuryPda,
        rewardsEpoch: rewardsEpochPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const enclaveTreasuryAfter = await provider.connection.getBalance(enclaveTreasuryPda);
    expect(enclaveTreasuryBefore - enclaveTreasuryAfter).to.equal(total.toNumber());

    const rewardsEpoch = await (program.account as any).rewardsEpoch.fetch(rewardsEpochPda);
    expect(rewardsEpoch.totalAmount.toNumber()).to.equal(total.toNumber());
    expect(rewardsEpoch.claimedAmount.toNumber()).to.equal(0);

    // Claim allocation for agent2 (index=1).
    const claim = allocations[1];
    const [claimReceiptPda] = deriveRewardsClaimPDA(rewardsEpochPda, claim.index);
    const vaultBefore = await provider.connection.getBalance(vault2Pda);

    await program.methods
      .claimRewards(claim.index, new BN(claim.amount), [Array.from(leaves[0])])
      .accounts({
        rewardsEpoch: rewardsEpochPda,
        agentIdentity: agent2Pda,
        vault: vault2Pda,
        claimReceipt: claimReceiptPda,
        payer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vaultAfter = await provider.connection.getBalance(vault2Pda);
    expect(vaultAfter - vaultBefore).to.equal(claim.amount);

    // Double-claim must fail (claim receipt PDA already exists).
    try {
      await program.methods
        .claimRewards(claim.index, new BN(claim.amount), [Array.from(leaves[0])])
        .accounts({
          rewardsEpoch: rewardsEpochPda,
          agentIdentity: agent2Pda,
          vault: vault2Pda,
          claimReceipt: claimReceiptPda,
          payer: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err).to.exist;
    }

    // Wait for claim window to close, then sweep unclaimed rewards back to enclave treasury.
    await new Promise((r) => setTimeout(r, 3000));

    await program.methods
      .sweepUnclaimedRewards(epoch)
      .accounts({
        enclave: enclavePda,
        enclaveTreasury: enclaveTreasuryPda,
        rewardsEpoch: rewardsEpochPda,
      })
      .rpc();

    const rewardsEpochAfterSweep = await (program.account as any).rewardsEpoch.fetch(rewardsEpochPda);
    expect(rewardsEpochAfterSweep.sweptAt.toNumber()).to.be.greaterThan(0);
  });

  it("publishes a GLOBAL rewards epoch and supports Merkle claims + sweep", async () => {
    const epoch = new BN(1);
    const globalEnclave = SystemProgram.programId;
    const [rewardsEpochPda] = deriveRewardsEpochPDA(globalEnclave, epoch);

    const allocations = [
      { index: 0, agent: agent1Pda, amount: 1_250_000 },
      { index: 1, agent: agent2Pda, amount: 1_750_000 },
    ];

    const leaves = allocations.map((a) =>
      rewardsLeafHash({
        enclavePda: globalEnclave,
        epoch,
        index: a.index,
        agentIdentityPda: a.agent,
        amount: a.amount,
      })
    );
    const root = merkleParent(leaves[0], leaves[1]);
    const total = new BN(allocations[0].amount + allocations[1].amount);

    const treasuryBefore = await provider.connection.getBalance(treasuryPda);

    await program.methods
      .publishGlobalRewardsEpoch(epoch, Array.from(root), total, new BN(2)) // 2s claim window
      .accounts({
        config: configPda,
        treasury: treasuryPda,
        rewardsEpoch: rewardsEpochPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const treasuryAfter = await provider.connection.getBalance(treasuryPda);
    expect(treasuryBefore - treasuryAfter).to.equal(total.toNumber());

    const rewardsEpoch = await (program.account as any).rewardsEpoch.fetch(rewardsEpochPda);
    expect(rewardsEpoch.totalAmount.toNumber()).to.equal(total.toNumber());
    expect(rewardsEpoch.claimedAmount.toNumber()).to.equal(0);
    expect(rewardsEpoch.enclave.toBase58()).to.equal(SystemProgram.programId.toBase58());

    // Claim allocation for agent1 (index=0).
    const claim = allocations[0];
    const [claimReceiptPda] = deriveRewardsClaimPDA(rewardsEpochPda, claim.index);
    const vaultBefore = await provider.connection.getBalance(vault1Pda);

    await program.methods
      .claimRewards(claim.index, new BN(claim.amount), [Array.from(leaves[1])])
      .accounts({
        rewardsEpoch: rewardsEpochPda,
        agentIdentity: agent1Pda,
        vault: vault1Pda,
        claimReceipt: claimReceiptPda,
        payer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vaultAfter = await provider.connection.getBalance(vault1Pda);
    expect(vaultAfter - vaultBefore).to.equal(claim.amount);

    // Wait for claim window to close, then sweep unclaimed rewards back to global treasury.
    await new Promise((r) => setTimeout(r, 3000));

    await program.methods
      .sweepUnclaimedGlobalRewards(epoch)
      .accounts({
        config: configPda,
        treasury: treasuryPda,
        rewardsEpoch: rewardsEpochPda,
      })
      .rpc();

    const rewardsEpochAfterSweep = await (program.account as any).rewardsEpoch.fetch(rewardsEpochPda);
    expect(rewardsEpochAfterSweep.sweptAt.toNumber()).to.be.greaterThan(0);

    const minRent = await provider.connection.getMinimumBalanceForRentExemption(121);
    const epochLamportsAfter = await provider.connection.getBalance(rewardsEpochPda);
    expect(epochLamportsAfter).to.equal(minRent);
  });

  // ================================================================
  // Job board flow (coming soon UI; on-chain ready)
  // ================================================================

  it("creates and cancels a job (refund)", async () => {
    const jobNonce = 0;
    const [jobPda] = deriveJobPDA(authority.publicKey, jobNonce);
    const [jobEscrowPda] = deriveJobEscrowPDA(jobPda);

    const metadataHash = hashContent("job-metadata-v1");
    const budget = new BN(10_000_000); // 0.01 SOL
    const buyItNow = new BN(12_000_000); // must be > budget (Option<u64>)

    await program.methods
      .createJob(new BN(jobNonce), metadataHash, budget, buyItNow)
      .accounts({
        job: jobPda,
        escrow: jobEscrowPda,
        creator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const jobBeforeCancel = await (program.account as any).jobPosting.fetch(jobPda);
    expect(jobBeforeCancel.buyItNowLamports).to.not.equal(null);
    expect(jobBeforeCancel.buyItNowLamports.toNumber()).to.equal(buyItNow.toNumber());

    const escrowBefore = await (program.account as any).jobEscrow.fetch(jobEscrowPda);
    // With buy-it-now enabled, escrow holds the maximum payout (buy-it-now premium).
    expect(escrowBefore.amount.toNumber()).to.equal(buyItNow.toNumber());

    await program.methods
      .cancelJob()
      .accounts({
        job: jobPda,
        escrow: jobEscrowPda,
        creator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const jobAfter = await (program.account as any).jobPosting.fetch(jobPda);
    expect(JSON.stringify(jobAfter.status)).to.include("cancelled");

    const escrowAfter = await (program.account as any).jobEscrow.fetch(jobEscrowPda);
    expect(escrowAfter.amount.toNumber()).to.equal(0);
  });

  it("runs a full job flow (create → bid → accept → submit → approve)", async () => {
    const jobNonce = 1;
    const [jobPda] = deriveJobPDA(authority.publicKey, jobNonce);
    const [jobEscrowPda] = deriveJobEscrowPDA(jobPda);

    const metadataHash = hashContent("job-metadata-v2");
    const budgetLamports = 12_000_000; // 0.012 SOL
    const budget = new BN(budgetLamports);

    await program.methods
      .createJob(new BN(jobNonce), metadataHash, budget, null)
      .accounts({
        job: jobPda,
        escrow: jobEscrowPda,
        creator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Agent1 places a bid
    const bidLamports = 9_000_000;
    const bidAmount = new BN(bidLamports);
    const messageHash = hashContent("bid-message-v1");
    const [bidPda] = deriveJobBidPDA(jobPda, agent1Pda);

    const bidPayload = Buffer.concat([
      jobPda.toBuffer(),
      u64LE(bidLamports),
      Buffer.from(messageHash),
    ]);
    const bidMessage = buildAgentMessage(ACTION_PLACE_JOB_BID, agent1Pda, bidPayload);
    const bidEdIx = createEd25519Ix(agentSigner1, bidMessage);

    await program.methods
      .placeJobBid(bidAmount, messageHash)
      .accounts({
        job: jobPda,
        bid: bidPda,
        agentIdentity: agent1Pda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([bidEdIx])
      .rpc();

    // Creator accepts bid
    await program.methods
      .acceptJobBid()
      .accounts({
        job: jobPda,
        bid: bidPda,
        escrow: jobEscrowPda,
        creator: authority.publicKey,
      })
      .rpc();

    const jobAssigned = await (program.account as any).jobPosting.fetch(jobPda);
    expect(JSON.stringify(jobAssigned.status)).to.include("assigned");
    expect(jobAssigned.assignedAgent.toBase58()).to.equal(agent1Pda.toBase58());

    // Agent submits work
    const submissionHash = hashContent("job-submission-v1");
    const [submissionPda] = deriveJobSubmissionPDA(jobPda);

    const submitPayload = Buffer.concat([
      jobPda.toBuffer(),
      Buffer.from(submissionHash),
    ]);
    const submitMessage = buildAgentMessage(ACTION_SUBMIT_JOB, agent1Pda, submitPayload);
    const submitEdIx = createEd25519Ix(agentSigner1, submitMessage);

    await program.methods
      .submitJob(submissionHash)
      .accounts({
        job: jobPda,
        submission: submissionPda,
        agentIdentity: agent1Pda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([submitEdIx])
      .rpc();

    const jobSubmitted = await (program.account as any).jobPosting.fetch(jobPda);
    expect(JSON.stringify(jobSubmitted.status)).to.include("submitted");

    // Approve and payout to agent vault
    const vaultBefore = await provider.connection.getBalance(vault1Pda);

    await program.methods
      .approveJobSubmission()
      .accounts({
        job: jobPda,
        escrow: jobEscrowPda,
        submission: submissionPda,
        acceptedBid: bidPda,
        vault: vault1Pda,
        creator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const jobDone = await (program.account as any).jobPosting.fetch(jobPda);
    expect(JSON.stringify(jobDone.status)).to.include("completed");

    const escrowAfter = await (program.account as any).jobEscrow.fetch(jobEscrowPda);
    expect(escrowAfter.amount.toNumber()).to.equal(0);

    const vaultAfter = await provider.connection.getBalance(vault1Pda);
    expect(vaultAfter - vaultBefore).to.equal(bidLamports);
  });

  it("supports buy-it-now instant assignment (bid > budget)", async () => {
    const jobNonce = 2;
    const [jobPda] = deriveJobPDA(authority.publicKey, jobNonce);
    const [jobEscrowPda] = deriveJobEscrowPDA(jobPda);

    const metadataHash = hashContent("job-metadata-bin");
    const budgetLamports = 10_000_000; // 0.01 SOL
    const buyItNowLamports = 12_000_000; // premium above budget
    const budget = new BN(budgetLamports);
    const buyItNow = new BN(buyItNowLamports);

    await program.methods
      .createJob(new BN(jobNonce), metadataHash, budget, buyItNow)
      .accounts({
        job: jobPda,
        escrow: jobEscrowPda,
        creator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Agent1 triggers buy-it-now by bidding exactly buyItNowLamports (can exceed budget).
    const messageHash = hashContent("bid-message-bin");
    const [bidPda] = deriveJobBidPDA(jobPda, agent1Pda);

    const bidPayload = Buffer.concat([
      jobPda.toBuffer(),
      u64LE(buyItNowLamports),
      Buffer.from(messageHash),
    ]);
    const bidMessage = buildAgentMessage(ACTION_PLACE_JOB_BID, agent1Pda, bidPayload);
    const bidEdIx = createEd25519Ix(agentSigner1, bidMessage);

    await program.methods
      .placeJobBid(new BN(buyItNowLamports), messageHash)
      .accounts({
        job: jobPda,
        bid: bidPda,
        agentIdentity: agent1Pda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([bidEdIx])
      .rpc();

    const jobAssigned = await (program.account as any).jobPosting.fetch(jobPda);
    expect(JSON.stringify(jobAssigned.status)).to.include("assigned");
    expect(jobAssigned.assignedAgent.toBase58()).to.equal(agent1Pda.toBase58());
    expect(jobAssigned.acceptedBid.toBase58()).to.equal(bidPda.toBase58());

    const bidAfter = await (program.account as any).jobBid.fetch(bidPda);
    expect(JSON.stringify(bidAfter.status)).to.include("accepted");

    // Agent submits work
    const submissionHash = hashContent("job-submission-bin");
    const [submissionPda] = deriveJobSubmissionPDA(jobPda);

    const submitPayload = Buffer.concat([
      jobPda.toBuffer(),
      Buffer.from(submissionHash),
    ]);
    const submitMessage = buildAgentMessage(ACTION_SUBMIT_JOB, agent1Pda, submitPayload);
    const submitEdIx = createEd25519Ix(agentSigner1, submitMessage);

    await program.methods
      .submitJob(submissionHash)
      .accounts({
        job: jobPda,
        submission: submissionPda,
        agentIdentity: agent1Pda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([submitEdIx])
      .rpc();

    // Approve and payout to agent vault (premium)
    const vaultBefore = await provider.connection.getBalance(vault1Pda);

    await program.methods
      .approveJobSubmission()
      .accounts({
        job: jobPda,
        escrow: jobEscrowPda,
        submission: submissionPda,
        acceptedBid: bidPda,
        vault: vault1Pda,
        creator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vaultAfter = await provider.connection.getBalance(vault1Pda);
    expect(vaultAfter - vaultBefore).to.equal(buyItNowLamports);
  });

  it("refunds buy-it-now premium on manual accept (payout = budget)", async () => {
    const jobNonce = 3;
    const [jobPda] = deriveJobPDA(authority.publicKey, jobNonce);
    const [jobEscrowPda] = deriveJobEscrowPDA(jobPda);

    const metadataHash = hashContent("job-metadata-premium-refund");
    const budgetLamports = 10_000_000; // base payout
    const buyItNowLamports = 12_000_000; // max escrow
    const budget = new BN(budgetLamports);
    const buyItNow = new BN(buyItNowLamports);

    await program.methods
      .createJob(new BN(jobNonce), metadataHash, budget, buyItNow)
      .accounts({
        job: jobPda,
        escrow: jobEscrowPda,
        creator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Agent1 places a normal bid <= budget (does NOT trigger buy-it-now).
    const bidLamports = 9_000_000;
    const messageHash = hashContent("bid-message-premium-refund");
    const [bidPda] = deriveJobBidPDA(jobPda, agent1Pda);

    const bidPayload = Buffer.concat([
      jobPda.toBuffer(),
      u64LE(bidLamports),
      Buffer.from(messageHash),
    ]);
    const bidMessage = buildAgentMessage(ACTION_PLACE_JOB_BID, agent1Pda, bidPayload);
    const bidEdIx = createEd25519Ix(agentSigner1, bidMessage);

    await program.methods
      .placeJobBid(new BN(bidLamports), messageHash)
      .accounts({
        job: jobPda,
        bid: bidPda,
        agentIdentity: agent1Pda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([bidEdIx])
      .rpc();

    // Creator accepts bid (refunds premium and downgrades escrow amount to budget).
    await program.methods
      .acceptJobBid()
      .accounts({
        job: jobPda,
        bid: bidPda,
        escrow: jobEscrowPda,
        creator: authority.publicKey,
      })
      .rpc();

    const escrowAfterAccept = await (program.account as any).jobEscrow.fetch(jobEscrowPda);
    expect(escrowAfterAccept.amount.toNumber()).to.equal(budgetLamports);

    // Agent submits work
    const submissionHash = hashContent("job-submission-premium-refund");
    const [submissionPda] = deriveJobSubmissionPDA(jobPda);

    const submitPayload = Buffer.concat([
      jobPda.toBuffer(),
      Buffer.from(submissionHash),
    ]);
    const submitMessage = buildAgentMessage(ACTION_SUBMIT_JOB, agent1Pda, submitPayload);
    const submitEdIx = createEd25519Ix(agentSigner1, submitMessage);

    await program.methods
      .submitJob(submissionHash)
      .accounts({
        job: jobPda,
        submission: submissionPda,
        agentIdentity: agent1Pda,
        payer: authority.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([submitEdIx])
      .rpc();

    // Approve and payout to agent vault (base budget only)
    const vaultBefore = await provider.connection.getBalance(vault1Pda);

    await program.methods
      .approveJobSubmission()
      .accounts({
        job: jobPda,
        escrow: jobEscrowPda,
        submission: submissionPda,
        acceptedBid: bidPda,
        vault: vault1Pda,
        creator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vaultAfter = await provider.connection.getBalance(vault1Pda);
    expect(vaultAfter - vaultBefore).to.equal(bidLamports);
  });

  // ================================================================
  // Error tests (3)
  // ================================================================

  it("rejects self-vote", async () => {
    const [votePda] = deriveVotePDA(post0Pda, agent1Pda);
    const value = 1;

    const payload = Buffer.concat([
      post0Pda.toBuffer(),
      Buffer.from([value]),
    ]);
    const message = buildAgentMessage(ACTION_CAST_VOTE, agent1Pda, payload);
    const ed25519Ix = createEd25519Ix(agentSigner1, message);

    try {
      await program.methods
        .castVote(value)
        .accounts({
          reputationVote: votePda,
          postAnchor: post0Pda,
          postAgent: agent1Pda,
          voterAgent: agent1Pda, // same as post author → self-vote
          payer: authority.publicKey,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([ed25519Ix])
        .rpc();
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("SelfVote");
    }
  });

  it("rejects agent_signer == owner", async () => {
    const badAgentId = Array.from(
      createHash("sha256").update("bad-agent-v1").digest()
    );
    const [badAgentPda] = deriveAgentPDA(authority.publicKey, badAgentId);
    const [badVaultPda] = deriveVaultPDA(badAgentPda);

    try {
      await program.methods
        .initializeAgent(
          badAgentId,
          encodeName("BadAgent"),
          [500, 500, 500, 500, 500, 500],
          hashContent("bad-metadata"),
          authority.publicKey // agent_signer == owner → must fail
        )
        .accounts({
          config: configPda,
          treasury: treasuryPda,
          economics: economicsPda,
          ownerCounter: ownerCounterPda,
          owner: authority.publicKey,
          agentIdentity: badAgentPda,
          vault: badVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("AgentSignerEqualsOwner");
    }
  });

  it("rejects invalid vote value (0)", async () => {
    const [votePda] = deriveVotePDA(post0Pda, agent1Pda);

    const payload = Buffer.concat([
      post0Pda.toBuffer(),
      Buffer.from([0]),
    ]);
    const message = buildAgentMessage(ACTION_CAST_VOTE, agent1Pda, payload);
    const ed25519Ix = createEd25519Ix(agentSigner1, message);

    try {
      await program.methods
        .castVote(0) // invalid: must be +1 or -1
        .accounts({
          reputationVote: votePda,
          postAnchor: post0Pda,
          postAgent: agent1Pda,
          voterAgent: agent1Pda,
          payer: authority.publicKey,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([ed25519Ix])
        .rpc();
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("InvalidVoteValue");
    }
  });

  it("enforces max agents per wallet (lifetime cap)", async () => {
    const spamOwner = Keypair.generate();
    const airdropSig = await provider.connection.requestAirdrop(
      spamOwner.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig, "confirmed");

    const [spamOwnerCounter] = deriveOwnerCounterPDA(spamOwner.publicKey);
    const traits: number[] = [500, 500, 500, 500, 500, 500];

    // Mint 5 agents successfully.
    for (let i = 0; i < 5; i++) {
      const agentId = Array.from(
        createHash("sha256").update(`spam-agent-${i}`).digest()
      );
      const signer = Keypair.generate();
      const [agentPda] = deriveAgentPDA(spamOwner.publicKey, agentId);
      const [vaultPda] = deriveVaultPDA(agentPda);

      await program.methods
        .initializeAgent(
          agentId,
          encodeName(`Spam${i}`),
          traits,
          hashContent(`spam-metadata-${i}`),
          signer.publicKey
        )
        .accounts({
          config: configPda,
          treasury: treasuryPda,
          economics: economicsPda,
          ownerCounter: spamOwnerCounter,
          owner: spamOwner.publicKey,
          agentIdentity: agentPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([spamOwner])
        .rpc();
    }

    // 6th agent must fail.
    const agentId6 = Array.from(
      createHash("sha256").update("spam-agent-5").digest()
    );
    const signer6 = Keypair.generate();
    const [agent6Pda] = deriveAgentPDA(spamOwner.publicKey, agentId6);
    const [vault6Pda] = deriveVaultPDA(agent6Pda);

    try {
      await program.methods
        .initializeAgent(
          agentId6,
          encodeName("Spam6"),
          traits,
          hashContent("spam-metadata-5"),
          signer6.publicKey
        )
        .accounts({
          config: configPda,
          treasury: treasuryPda,
          economics: economicsPda,
          ownerCounter: spamOwnerCounter,
          owner: spamOwner.publicKey,
          agentIdentity: agent6Pda,
          vault: vault6Pda,
          systemProgram: SystemProgram.programId,
        })
        .signers([spamOwner])
        .rpc();
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("MaxAgentsPerWalletExceeded");
    }
  });

  it("recovers agent signer (owner-based, timelocked)", async () => {
    // Set timelock=0 for test speed.
    await program.methods
      .updateEconomics(new BN(50_000_000), 5, new BN(0))
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        economics: economicsPda,
      })
      .rpc();

    const newSigner = Keypair.generate().publicKey;
    const [recoveryPda] = deriveRecoveryPDA(agent1Pda);

    await program.methods
      .requestRecoverAgentSigner(newSigner)
      .accounts({
        economics: economicsPda,
        agentIdentity: agent1Pda,
        owner: authority.publicKey,
        recovery: recoveryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .executeRecoverAgentSigner()
      .accounts({
        agentIdentity: agent1Pda,
        owner: authority.publicKey,
        recovery: recoveryPda,
      })
      .rpc();

    const agent = await program.account.agentIdentity.fetch(agent1Pda);
    expect(agent.agentSigner.toBase58()).to.equal(newSigner.toBase58());
  });

  it("deactivates an agent (owner-only safety valve)", async () => {
    await program.methods
      .deactivateAgent()
      .accounts({
        agentIdentity: agent1Pda,
        owner: authority.publicKey,
      })
      .rpc();

    const agent = await program.account.agentIdentity.fetch(agent1Pda);
    expect(agent.isActive).to.equal(false);

    // A deactivated agent cannot create enclaves.
    const nameHash = hashContent("inactive-enclave-test");
    const metadataHash = hashContent("inactive-enclave-metadata");
    const [inactiveEnclavePda] = deriveEnclavePDA(nameHash);
    const payload = Buffer.concat([
      Buffer.from(nameHash),
      Buffer.from(metadataHash),
    ]);
    const message = buildAgentMessage(
      ACTION_CREATE_ENCLAVE,
      agent1Pda,
      payload
    );
    const ed25519Ix = createEd25519Ix(agentSigner1, message);

    try {
      await program.methods
        .createEnclave(nameHash, metadataHash)
        .accounts({
          config: configPda,
          creatorAgent: agent1Pda,
          enclave: inactiveEnclavePda,
          payer: authority.publicKey,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([ed25519Ix])
        .rpc();
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("AgentInactive");
    }
  });
});
