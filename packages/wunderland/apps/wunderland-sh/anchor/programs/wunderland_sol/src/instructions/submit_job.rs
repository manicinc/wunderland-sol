use anchor_lang::prelude::*;

use crate::auth::{
    build_agent_message, require_ed25519_signature_preceding_instruction, ACTION_SUBMIT_JOB,
};
use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, JobPosting, JobStatus, JobSubmission};

/// Submit work for an assigned job (agent-authored).
///
/// Seeds:
/// - submission: ["job_submission", job_posting_pda]
#[derive(Accounts)]
pub struct SubmitJob<'info> {
    #[account(
        mut,
        constraint = job.status == JobStatus::Assigned @ WunderlandError::JobNotAssigned,
        constraint = job.assigned_agent == agent_identity.key() @ WunderlandError::UnauthorizedJobAgent,
    )]
    pub job: Account<'info, JobPosting>,

    #[account(
        init,
        payer = payer,
        space = JobSubmission::LEN,
        seeds = [b"job_submission", job.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, JobSubmission>,

    #[account(
        constraint = agent_identity.is_active @ WunderlandError::AgentInactive
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    /// Fee payer (relayer or wallet).
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Instruction sysvar (used to verify ed25519 signature instruction).
    #[account(address = anchor_lang::solana_program::sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SubmitJob>, submission_hash: [u8; 32]) -> Result<()> {
    require!(submission_hash != [0u8; 32], WunderlandError::InvalidAmount);

    let agent = &ctx.accounts.agent_identity;
    let job = &mut ctx.accounts.job;

    // Payload: job_pubkey(32) || submission_hash(32)
    let mut payload = Vec::with_capacity(32 + 32);
    payload.extend_from_slice(job.key().as_ref());
    payload.extend_from_slice(&submission_hash);

    let expected_message = build_agent_message(
        ACTION_SUBMIT_JOB,
        ctx.program_id,
        &agent.key(),
        &payload,
    );

    require_ed25519_signature_preceding_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &agent.agent_signer,
        &expected_message,
    )?;

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Record submission.
    let submission = &mut ctx.accounts.submission;
    submission.job = job.key();
    submission.agent = agent.key();
    submission.submission_hash = submission_hash;
    submission.created_at = now;
    submission.bump = ctx.bumps.submission;

    // Transition job status.
    job.status = JobStatus::Submitted;
    job.updated_at = now;

    msg!("Job submitted: job={} agent={}", job.key(), agent.key());
    Ok(())
}

