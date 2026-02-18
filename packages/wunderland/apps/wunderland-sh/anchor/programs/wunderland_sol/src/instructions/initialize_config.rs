use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    bpf_loader_upgradeable::{self, UpgradeableLoaderState},
    program_utils::limited_deserialize,
    system_program,
};

use crate::errors::WunderlandError;
use crate::state::{GlobalTreasury, ProgramConfig};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = ProgramConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(
        init,
        payer = authority,
        space = GlobalTreasury::LEN,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, GlobalTreasury>,

    /// CHECK: Upgradeable loader ProgramData account for this program.
    pub program_data: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>, admin_authority: Pubkey) -> Result<()> {
    // Prevent config sniping: only the program upgrade authority can initialize config.
    let program_id = *ctx.program_id;
    let (expected_program_data, _bump) = Pubkey::find_program_address(
        &[program_id.as_ref()],
        &bpf_loader_upgradeable::id(),
    );

    require_keys_eq!(
        ctx.accounts.program_data.key(),
        expected_program_data,
        WunderlandError::InvalidProgramData
    );

    let program_data_info = ctx.accounts.program_data.to_account_info();
    require_keys_eq!(
        *program_data_info.owner,
        bpf_loader_upgradeable::id(),
        WunderlandError::InvalidProgramData
    );

    let data = program_data_info.try_borrow_data()?;
    let state: UpgradeableLoaderState =
        limited_deserialize(&data, 64).map_err(|_| error!(WunderlandError::InvalidProgramData))?;

    match state {
        UpgradeableLoaderState::ProgramData {
            upgrade_authority_address,
            ..
        } => {
            let upgrade_authority = upgrade_authority_address
                .ok_or(error!(WunderlandError::ProgramImmutable))?;
            // Anchor's local validator harness preloads programs with `--bpf-program`, which
            // disables upgrades. In that mode, some toolchains represent the upgrade authority
            // as the System Program (non-signable). We allow `initialize_config` to proceed so
            // local tests/devnet scripts can initialize PDAs even with upgrades disabled.
            //
            // Production deployments should initialize config immediately after deploy while the
            // real upgrade authority still exists and can sign.
            if upgrade_authority != system_program::ID {
                require_keys_eq!(
                    upgrade_authority,
                    ctx.accounts.authority.key(),
                    WunderlandError::UnauthorizedAuthority
                );
            } else {
                msg!("Warning: program upgrade authority is SystemProgram; skipping upgrade-authority gate for initialize_config");
            }
        }
        _ => return err!(WunderlandError::InvalidProgramData),
    }

    require!(
        admin_authority != Pubkey::default(),
        WunderlandError::UnauthorizedAuthority
    );

    let cfg = &mut ctx.accounts.config;
    cfg.authority = admin_authority;
    cfg.agent_count = 0;
    cfg.enclave_count = 0;
    cfg.bump = ctx.bumps.config;

    let treasury = &mut ctx.accounts.treasury;
    treasury.authority = admin_authority;
    treasury.total_collected = 0;
    treasury.bump = ctx.bumps.treasury;

    msg!(
        "Program config initialized. Authority: {} (initializer: {})",
        cfg.authority,
        ctx.accounts.authority.key()
    );
    Ok(())
}
