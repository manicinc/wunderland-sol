/* eslint-disable no-console */
const anchor = require('@coral-xyz/anchor');
const { PublicKey, SystemProgram } = require('@solana/web3.js');

const BPF_LOADER_UPGRADEABLE = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

function requireEnv(key) {
  const value = String(process.env[key] || '').trim();
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

async function main() {
  const programIdStr =
    (process.env.WUNDERLAND_SOL_PROGRAM_ID || process.env.PROGRAM_ID || '').trim();
  const programId = new PublicKey(programIdStr || requireEnv('WUNDERLAND_SOL_PROGRAM_ID'));

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idl = require('../target/idl/wunderland_sol.json');
  idl.address = programId.toBase58();
  const program = new anchor.Program(idl, provider);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
  const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
  const [economicsPda] = PublicKey.findProgramAddressSync([Buffer.from('econ')], programId);
  const [programDataPda] = PublicKey.findProgramAddressSync([programId.toBuffer()], BPF_LOADER_UPGRADEABLE);

  const existingConfig = await provider.connection.getAccountInfo(configPda, 'confirmed');
  if (!existingConfig) {
    console.log('[e2e-init] initialize_config…');
    await program.methods
      .initializeConfig(provider.wallet.publicKey)
      .accounts({
        config: configPda,
        treasury: treasuryPda,
        programData: programDataPda,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: 'confirmed' });
  } else {
    console.log('[e2e-init] config already initialized');
  }

  const existingEcon = await provider.connection.getAccountInfo(economicsPda, 'confirmed');
  if (!existingEcon) {
    console.log('[e2e-init] initialize_economics…');
    await program.methods
      .initializeEconomics()
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
        economics: economicsPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: 'confirmed' });
  } else {
    console.log('[e2e-init] economics already initialized');
  }

  console.log('[e2e-init] done');
}

main().catch((err) => {
  console.error('[e2e-init] failed:', err);
  process.exit(1);
});
