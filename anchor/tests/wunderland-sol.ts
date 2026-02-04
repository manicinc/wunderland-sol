import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WunderlandSol } from "../target/types/wunderland_sol";
import { expect } from "chai";
import { PublicKey, Keypair } from "@solana/web3.js";
import { createHash } from "crypto";

describe("wunderland-sol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WunderlandSol as Program<WunderlandSol>;

  const authority = provider.wallet;
  const voter = Keypair.generate();

  // Encode display name as fixed-size bytes
  function encodeName(name: string): number[] {
    const buf = Buffer.alloc(32, 0);
    Buffer.from(name, "utf-8").copy(buf);
    return Array.from(buf);
  }

  // Hash content
  function hashContent(content: string): number[] {
    return Array.from(createHash("sha256").update(content).digest());
  }

  // Derive PDAs
  function deriveAgentPDA(auth: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), auth.toBuffer()],
      program.programId
    );
  }

  function derivePostPDA(agentPda: PublicKey, postIndex: number) {
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(postIndex);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("post"), agentPda.toBuffer(), indexBuf],
      program.programId
    );
  }

  function deriveVotePDA(postPda: PublicKey, voterPubkey: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), postPda.toBuffer(), voterPubkey.toBuffer()],
      program.programId
    );
  }

  it("initializes an agent", async () => {
    const [agentPda] = deriveAgentPDA(authority.publicKey);

    const traits: number[] = [850, 450, 700, 900, 850, 600]; // HEXACO values (0-1000)

    await program.methods
      .initializeAgent(encodeName("Athena"), traits)
      .accounts({
        agentIdentity: agentPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const agent = await program.account.agentIdentity.fetch(agentPda);
    expect(agent.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(agent.hexacoTraits).to.deep.equal(traits);
    expect(agent.citizenLevel).to.equal(1);
    expect(agent.totalPosts).to.equal(0);
    expect(agent.isActive).to.equal(true);
  });

  it("anchors a post", async () => {
    const [agentPda] = deriveAgentPDA(authority.publicKey);
    const [postPda] = derivePostPDA(agentPda, 0);

    const contentHash = hashContent("Hello, Wunderland! This is my first on-chain post.");
    const manifestHash = hashContent("manifest-proof-v1");

    await program.methods
      .anchorPost(contentHash, manifestHash)
      .accounts({
        postAnchor: postPda,
        agentIdentity: agentPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const post = await program.account.postAnchor.fetch(postPda);
    expect(post.postIndex).to.equal(0);
    expect(post.upvotes).to.equal(0);
    expect(post.downvotes).to.equal(0);

    const agent = await program.account.agentIdentity.fetch(agentPda);
    expect(agent.totalPosts).to.equal(1);
  });

  it("casts a vote", async () => {
    // Airdrop to voter
    const sig = await provider.connection.requestAirdrop(
      voter.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [agentPda] = deriveAgentPDA(authority.publicKey);
    const [postPda] = derivePostPDA(agentPda, 0);
    const [votePda] = deriveVotePDA(postPda, voter.publicKey);

    await program.methods
      .castVote(1) // upvote
      .accounts({
        reputationVote: votePda,
        postAnchor: postPda,
        postAgent: agentPda,
        voter: voter.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    const vote = await program.account.reputationVote.fetch(votePda);
    expect(vote.value).to.equal(1);

    const post = await program.account.postAnchor.fetch(postPda);
    expect(post.upvotes).to.equal(1);

    const agent = await program.account.agentIdentity.fetch(agentPda);
    expect(agent.reputationScore.toNumber()).to.equal(1);
  });

  it("updates agent level", async () => {
    const [agentPda] = deriveAgentPDA(authority.publicKey);

    await program.methods
      .updateAgentLevel(2, new anchor.BN(100))
      .accounts({
        agentIdentity: agentPda,
        authority: authority.publicKey,
      })
      .rpc();

    const agent = await program.account.agentIdentity.fetch(agentPda);
    expect(agent.citizenLevel).to.equal(2);
    expect(agent.xp.toNumber()).to.equal(100);
  });

  it("deactivates an agent", async () => {
    const [agentPda] = deriveAgentPDA(authority.publicKey);

    await program.methods
      .deactivateAgent()
      .accounts({
        agentIdentity: agentPda,
        authority: authority.publicKey,
      })
      .rpc();

    const agent = await program.account.agentIdentity.fetch(agentPda);
    expect(agent.isActive).to.equal(false);
  });
});
