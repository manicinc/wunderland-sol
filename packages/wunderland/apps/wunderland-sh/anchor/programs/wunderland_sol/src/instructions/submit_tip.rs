use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::WunderlandError;
use crate::state::{Enclave, TipAnchor, TipEscrow, TipSourceType, TipStatus, TipperRateLimit};

/// Submit a tip with content to be injected into agent stimulus feed.
/// Payment goes to escrow PDA until settle/refund.
#[derive(Accounts)]
#[instruction(content_hash: [u8; 32], amount: u64, source_type: u8, tip_nonce: u64)]
pub struct SubmitTip<'info> {
    /// The wallet submitting the tip.
    #[account(mut)]
    pub tipper: Signer<'info>,

    /// Rate limit account for the tipper.
    #[account(
        init_if_needed,
        payer = tipper,
        space = TipperRateLimit::LEN,
        seeds = [b"rate_limit", tipper.key().as_ref()],
        bump
    )]
    pub rate_limit: Account<'info, TipperRateLimit>,

    /// The tip anchor to create.
    #[account(
        init,
        payer = tipper,
        space = TipAnchor::LEN,
        seeds = [b"tip", tipper.key().as_ref(), tip_nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub tip: Account<'info, TipAnchor>,

    /// The escrow account to hold funds.
    #[account(
        init,
        payer = tipper,
        space = TipEscrow::LEN,
        seeds = [b"escrow", tip.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TipEscrow>,

    /// Target enclave (optional - use SystemProgram for global tips).
    /// CHECK: Validated in handler - either SystemProgram::id() or valid Enclave PDA
    pub target_enclave: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitTip>,
    content_hash: [u8; 32],
    amount: u64,
    source_type: u8,
    tip_nonce: u64,
) -> Result<()> {
    // 1. Validate amount meets minimum
    require!(
        amount >= TipAnchor::MIN_AMOUNT,
        WunderlandError::TipBelowMinimum
    );

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // 2. Check and update rate limits
    let rate_limit = &mut ctx.accounts.rate_limit;

    // Initialize rate limit if new
    if rate_limit.tipper == Pubkey::default() {
        rate_limit.tipper = ctx.accounts.tipper.key();
        rate_limit.tips_this_minute = 0;
        rate_limit.tips_this_hour = 0;
        rate_limit.minute_reset_at = now + 60;
        rate_limit.hour_reset_at = now + 3600;
        rate_limit.bump = ctx.bumps.rate_limit;
    }

    // Reset minute counter if window passed
    if now >= rate_limit.minute_reset_at {
        rate_limit.tips_this_minute = 0;
        rate_limit.minute_reset_at = now + 60;
    }

    // Reset hour counter if window passed
    if now >= rate_limit.hour_reset_at {
        rate_limit.tips_this_hour = 0;
        rate_limit.hour_reset_at = now + 3600;
    }

    // Check limits
    require!(
        rate_limit.tips_this_minute < TipperRateLimit::MAX_PER_MINUTE,
        WunderlandError::RateLimitMinuteExceeded
    );
    require!(
        rate_limit.tips_this_hour < TipperRateLimit::MAX_PER_HOUR,
        WunderlandError::RateLimitHourExceeded
    );

    // Increment counters
    rate_limit.tips_this_minute = rate_limit
        .tips_this_minute
        .checked_add(1)
        .ok_or(WunderlandError::ArithmeticOverflow)?;
    rate_limit.tips_this_hour = rate_limit
        .tips_this_hour
        .checked_add(1)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    // 3. Validate target enclave if not global
    let target_key = ctx.accounts.target_enclave.key();
    if target_key != system_program::ID {
        // Verify it's a real Enclave account owned by this program (not an arbitrary account).
        require!(
            ctx.accounts.target_enclave.owner == ctx.program_id,
            WunderlandError::InvalidTargetEnclave
        );

        // Ensure the account deserializes as an Enclave (discriminator check) and is active.
        let enclave_data = ctx.accounts.target_enclave.try_borrow_data()?;
        let mut enclave_bytes: &[u8] = &enclave_data;
        let enclave = Enclave::try_deserialize(&mut enclave_bytes)
            .map_err(|_| error!(WunderlandError::InvalidTargetEnclave))?;
        require!(
            enclave.is_active,
            WunderlandError::EnclaveInactive
        );
    }

    // 4. Derive priority from amount (on-chain, not user-supplied)
    let priority = TipAnchor::derive_priority(amount);

    // 5. Initialize tip anchor
    let tip = &mut ctx.accounts.tip;
    tip.tipper = ctx.accounts.tipper.key();
    tip.content_hash = content_hash;
    tip.amount = amount;
    tip.priority = priority;
    tip.source_type = if source_type == 1 {
        TipSourceType::Url
    } else {
        TipSourceType::Text
    };
    tip.target_enclave = target_key;
    tip.tip_nonce = tip_nonce;
    tip.created_at = now;
    tip.status = TipStatus::Pending;
    tip.bump = ctx.bumps.tip;

    // 6. Initialize escrow
    let escrow = &mut ctx.accounts.escrow;
    escrow.tip = tip.key();
    escrow.amount = amount;
    escrow.bump = ctx.bumps.escrow;

    // 7. Transfer funds to escrow PDA
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.tipper.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        amount,
    )?;

    msg!(
        "Tip submitted: {} lamports, priority {:?}, nonce {}",
        amount,
        priority as u8,
        tip_nonce
    );

    Ok(())
}
