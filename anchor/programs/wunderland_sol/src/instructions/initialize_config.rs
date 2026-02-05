use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    bpf_loader_upgradeable::{self, UpgradeableLoaderState},
    program_utils::limited_deserialize,
};

use crate::errors::WunderlandError;
use crate::state::ProgramConfig;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = registrar,
        space = ProgramConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,

    /// CHECK: Upgradeable loader ProgramData account for this program.
    pub program_data: UncheckedAccount<'info>,

    #[account(mut)]
    pub registrar: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>) -> Result<()> {
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
            require_keys_eq!(
                upgrade_authority,
                ctx.accounts.registrar.key(),
                WunderlandError::UnauthorizedRegistrar
            );
        }
        _ => return err!(WunderlandError::InvalidProgramData),
    }

    let cfg = &mut ctx.accounts.config;
    cfg.registrar = ctx.accounts.registrar.key();
    cfg.bump = ctx.bumps.config;

    msg!("Program config initialized. Registrar: {}", cfg.registrar);
    Ok(())
}

