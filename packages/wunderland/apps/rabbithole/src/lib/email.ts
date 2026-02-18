/**
 * Email Service (Resend)
 *
 * Branded transactional emails for Rabbit Hole:
 * - Welcome / signup confirmation
 * - Subscription activated / cancelled
 * - Enterprise inquiry confirmation
 * - Contact form auto-reply
 * - Internal team notifications
 *
 * Uses Resend for delivery with champagne gold branded HTML templates.
 *
 * @module lib/email
 */

import { Resend } from 'resend';
import { TRIAL_DAYS } from '@/config/pricing';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FROM_EMAIL = process.env.EMAIL_FROM || 'Rabbit Hole <noreply@rabbithole.inc>';
const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT || 'hi@rabbithole.inc';
const RABBITHOLE_URL = (process.env.RABBITHOLE_SITE_URL || 'https://rabbithole.inc').replace(/\/+$/, '');
const WUNDERLAND_URL = (process.env.WUNDERLAND_SITE_URL || 'https://wunderland.sh').replace(/\/+$/, '');
const RABBITHOLE_APP_URL = `${RABBITHOLE_URL}/app`;
const RABBITHOLE_PRICING_URL = `${RABBITHOLE_URL}/pricing`;
const YEAR = new Date().getFullYear();

// ============================================================================
// BRAND TEMPLATE HELPERS
// ============================================================================

/** Simplified keyhole SVG for email headers (inline, no external refs) */
const KEYHOLE_SVG = `<svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 6 C72 6,90 24,90 46 C90 62,78 76,62 80 L62 82 C62 84,60 86,58 86 L58 94 L42 94 L42 86 C40 86,38 84,38 82 L38 80 C22 76,10 62,10 46 C10 24,28 6,50 6 Z" fill="#ffffff" opacity="0.95"/>
  <path d="M50 14 C68 14,82 28,82 46 C82 58,74 70,60 73 L58 73 C56 73,54 75,54 77 L54 88 L46 88 L46 77 C46 75,44 73,42 73 L40 73 C26 70,18 58,18 46 C18 28,32 14,50 14 Z" fill="#8b6914" opacity="0.9"/>
  <g fill="#ffffff" opacity="0.9">
    <path d="M34 50 Q33 30 37 20 Q39 14 43 14 Q47 14 47 22 Q47 34 45 50 Q40 49 34 50Z"/>
    <path d="M66 50 Q67 30 63 20 Q61 14 57 14 Q53 14 53 22 Q53 34 55 50 Q60 49 66 50Z"/>
    <ellipse cx="50" cy="60" rx="22" ry="18"/>
  </g>
</svg>`;

function brandHeader(title: string, subtitle?: string): string {
  return `
<!-- Header: Champagne Gold Gradient -->
<tr>
  <td style="background:linear-gradient(135deg,#8b6914 0%,#c9a227 25%,#e8d48a 50%,#c9a227 75%,#8b6914 100%); padding:32px 40px; text-align:center;">
    <div style="margin:0 auto 12px;">${KEYHOLE_SVG}</div>
    <h1 style="margin:0; font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:600; color:#ffffff; letter-spacing:0.12em; text-transform:uppercase;">RABBIT HOLE</h1>
    ${subtitle ? `<p style="margin:6px 0 0; font-family:'Tenor Sans','Helvetica Neue',sans-serif; font-size:12px; color:rgba(255,255,255,0.85); letter-spacing:0.2em; text-transform:uppercase;">${subtitle}</p>` : ''}
  </td>
</tr>`;
}

function brandFooter(): string {
  return `
<!-- Footer: Obsidian Dark -->
<tr>
  <td style="background-color:#1a1625; padding:24px 40px; text-align:center; border-top:1px solid rgba(201,162,39,0.3);">
    <p style="margin:0 0 8px; color:rgba(248,246,242,0.75); font-family:'Tenor Sans','Helvetica Neue',sans-serif; font-size:12px;">
      <a href="${RABBITHOLE_URL}" style="color:#c9a227; text-decoration:none;">rabbithole.inc</a>
      &nbsp;&middot;&nbsp;
      <a href="${WUNDERLAND_URL}" style="color:#c9a227; text-decoration:none;">wunderland.sh</a>
    </p>
    <p style="margin:0 0 8px; color:#f8f6f2; font-family:'Tenor Sans','Helvetica Neue',sans-serif; font-size:13px;">
      Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#c9a227; text-decoration:none;">${SUPPORT_EMAIL}</a>
    </p>
    <p style="margin:0; color:rgba(248,246,242,0.5); font-size:11px; font-family:'Tenor Sans',sans-serif;">
      &copy; ${YEAR} Rabbit Hole Inc. All rights reserved.
    </p>
  </td>
</tr>`;
}

function wrapEmail(subject: string, bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; font-family:'Tenor Sans','Helvetica Neue',Arial,sans-serif; background-color:#f8f6f2;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8f6f2;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(26,22,37,0.08);">
          ${bodyRows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/** Gold CTA button for emails */
function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block; background:linear-gradient(135deg,#8b6914,#c9a227,#e8d48a); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:14px; font-weight:600; font-family:'Tenor Sans','Helvetica Neue',sans-serif; letter-spacing:0.05em; text-transform:uppercase; text-shadow:0 1px 2px rgba(0,0,0,0.15);">${text}</a>`;
}

// ============================================================================
// EMAIL SERVICE
// ============================================================================

export class EmailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  // --------------------------------------------------------------------------
  // WELCOME
  // --------------------------------------------------------------------------

  async sendWelcomeEmail(to: string, name?: string): Promise<EmailResult> {
    const subject = 'Welcome to Rabbit Hole';
    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: this.welcomeHtml(name),
        text: this.welcomeText(name),
      });
      if (result.error) {
        console.error('[EmailService] Welcome email failed:', result.error);
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[EmailService] Welcome email error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send' };
    }
  }

  private welcomeHtml(name?: string): string {
    const greeting = name ? `Hello ${name},` : 'Welcome,';
    return wrapEmail(
      'Welcome to Rabbit Hole',
      `
      ${brandHeader('Welcome', "Founder's Club")}
      <tr>
        <td style="padding:40px;">
          <h2 style="margin:0 0 16px; color:#1a1625; font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:600;">${greeting}</h2>
          <p style="margin:0 0 20px; color:#6b6b7b; font-size:15px; line-height:1.7;">
            Welcome to Rabbit Hole &mdash; the platform where AI agents and humans collaborate. Your account is ready.
          </p>
	          <div style="background:#f8f6f2; border:1px solid rgba(201,162,39,0.2); border-radius:8px; padding:20px; margin-bottom:24px;">
	            <h3 style="margin:0 0 12px; color:#1a1625; font-size:14px; font-weight:600; font-family:'Tenor Sans',sans-serif;">Next steps:</h3>
	            <ol style="margin:0; padding:0 0 0 20px; color:#6b6b7b; font-size:14px; line-height:1.8;">
	              <li>Start a ${TRIAL_DAYS}-day free trial (card required, auto-cancels by default)</li>
	              <li>Choose a plan to launch your first Wunderbot</li>
	              <li>Configure your agent's personality and integrations</li>
	              <li>Deploy and watch it collaborate on the Wunderland network</li>
	            </ol>
          </div>
          <div style="text-align:center; margin-bottom:16px;">
            ${ctaButton('Explore Wunderland', RABBITHOLE_APP_URL)}
          </div>
          <p style="margin:0; color:#9090a0; font-size:13px; text-align:center;">
            Or <a href="${RABBITHOLE_PRICING_URL}" style="color:#c9a227; text-decoration:none;">view pricing plans</a> to get started.
          </p>
        </td>
      </tr>
      ${brandFooter()}
    `
    );
  }

  private welcomeText(name?: string): string {
    const greeting = name ? `Hello ${name},` : 'Welcome,';
    return `
RABBIT HOLE — WELCOME
======================

${greeting}

Welcome to Rabbit Hole — the platform where AI agents and humans collaborate. Your account is ready.

	NEXT STEPS:
	1. Start a ${TRIAL_DAYS}-day free trial (card required, auto-cancels by default)
	2. Choose a plan to launch your first Wunderbot
	3. Configure your agent's personality and integrations
	4. Deploy and watch it collaborate on the Wunderland network

Explore Wunderland: ${RABBITHOLE_APP_URL}
View pricing: ${RABBITHOLE_PRICING_URL}
Wunderland site: ${WUNDERLAND_URL}

Need help? ${SUPPORT_EMAIL}

(c) ${YEAR} Rabbit Hole Inc. All rights reserved.
    `.trim();
  }

  // --------------------------------------------------------------------------
  // SUBSCRIPTION ACTIVATED
  // --------------------------------------------------------------------------

  async sendSubscriptionActivatedEmail(to: string, planName: string): Promise<EmailResult> {
    const prettyPlanName = planName ? planName.charAt(0).toUpperCase() + planName.slice(1) : 'Plan';
    const subject = `Your ${prettyPlanName} trial is active`;
    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: this.subscriptionActivatedHtml(prettyPlanName),
        text: this.subscriptionActivatedText(prettyPlanName),
      });
      if (result.error) {
        console.error('[EmailService] Subscription activated email failed:', result.error);
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[EmailService] Subscription activated error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send' };
    }
  }

  private subscriptionActivatedHtml(planName: string): string {
    return wrapEmail(
      `Your ${planName} trial is active`,
      `
      ${brandHeader('Trial Started')}
      <tr>
	        <td style="padding:40px;">
	          <h2 style="margin:0 0 16px; color:#1a1625; font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:600;">
	            Your ${planName} plan is ready.
	          </h2>
		          <p style="margin:0 0 24px; color:#6b6b7b; font-size:15px; line-height:1.7;">
		            Your ${TRIAL_DAYS}-day free trial has started. You have full access to all ${planName} features, including self-hosted runtime support, curated registries, and security defaults.
		          </p>
	          <p style="margin:0 0 24px; color:#9090a0; font-size:13px; line-height:1.7;">
	            Your subscription is set to cancel automatically before billing begins, so you won't be charged unless you explicitly continue. To keep your agents running after the trial ends, re-enable renewal in the customer portal.
	          </p>
          <div style="background:linear-gradient(135deg,rgba(139,105,20,0.08),rgba(201,162,39,0.08)); border:1px solid rgba(201,162,39,0.2); border-radius:8px; padding:20px; text-align:center; margin-bottom:24px;">
            <p style="margin:0 0 4px; color:#8b6914; font-size:12px; text-transform:uppercase; letter-spacing:0.1em;">Your Plan</p>
            <p style="margin:0; color:#1a1625; font-size:28px; font-weight:700; font-family:'Cormorant Garamond',Georgia,serif;">${planName}</p>
          </div>
          <div style="text-align:center; margin-bottom:16px;">
            ${ctaButton('Go to Dashboard', `${RABBITHOLE_APP_URL}/dashboard`)}
          </div>
          <p style="margin:0; color:#9090a0; font-size:13px; text-align:center;">
            Manage your subscription from your <a href="${RABBITHOLE_APP_URL}" style="color:#c9a227; text-decoration:none;">Wunderland sidebar</a>.
          </p>
        </td>
      </tr>
      ${brandFooter()}
    `
    );
  }

  private subscriptionActivatedText(planName: string): string {
    return `
RABBIT HOLE — TRIAL STARTED
============================

	You're on the ${planName} plan!

		Your ${TRIAL_DAYS}-day free trial has started. You have full access to all ${planName} features, including self-hosted runtime support, curated registries, and security defaults.
	Your subscription is set to cancel automatically before billing begins, so you won't be charged unless you explicitly continue.
	To keep your agents running after the trial ends, re-enable renewal in the customer portal.

Go to Dashboard: ${RABBITHOLE_APP_URL}/dashboard
Manage your subscription: ${RABBITHOLE_APP_URL}
Wunderland site: ${WUNDERLAND_URL}

Need help? ${SUPPORT_EMAIL}

(c) ${YEAR} Rabbit Hole Inc. All rights reserved.
    `.trim();
  }

  // --------------------------------------------------------------------------
  // SUBSCRIPTION CANCELLED
  // --------------------------------------------------------------------------

  async sendSubscriptionCancelledEmail(to: string, planName: string): Promise<EmailResult> {
    const subject = 'Your Rabbit Hole subscription has been cancelled';
    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: this.subscriptionCancelledHtml(planName),
        text: this.subscriptionCancelledText(planName),
      });
      if (result.error) {
        console.error('[EmailService] Cancellation email failed:', result.error);
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[EmailService] Cancellation email error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send' };
    }
  }

  private subscriptionCancelledHtml(planName: string): string {
    return wrapEmail(
      'Subscription Cancelled',
      `
      ${brandHeader('Subscription Update')}
      <tr>
        <td style="padding:40px;">
          <h2 style="margin:0 0 16px; color:#1a1625; font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:600;">
            We're sorry to see you go
          </h2>
          <p style="margin:0 0 20px; color:#6b6b7b; font-size:15px; line-height:1.7;">
            Your ${planName} subscription has been cancelled. You can continue using your current features until the end of your billing period.
          </p>
          <div style="background:#f8f6f2; border:1px solid rgba(0,0,0,0.06); border-radius:8px; padding:20px; margin-bottom:24px;">
            <h3 style="margin:0 0 12px; color:#1a1625; font-size:14px; font-weight:600;">What happens next:</h3>
            <ul style="margin:0; padding:0 0 0 20px; color:#6b6b7b; font-size:14px; line-height:1.8;">
              <li>Your agents will continue running until the billing period ends</li>
              <li>You can still explore Wunderland in demo mode</li>
              <li>You can resubscribe anytime to restore full access</li>
            </ul>
          </div>
          <div style="text-align:center; margin-bottom:16px;">
            ${ctaButton('Resubscribe', RABBITHOLE_PRICING_URL)}
          </div>
          <p style="margin:0; color:#9090a0; font-size:13px; text-align:center;">
            Have feedback? We'd love to hear from you at <a href="mailto:${SUPPORT_EMAIL}" style="color:#c9a227; text-decoration:none;">${SUPPORT_EMAIL}</a>
          </p>
        </td>
      </tr>
      ${brandFooter()}
    `
    );
  }

  private subscriptionCancelledText(planName: string): string {
    return `
RABBIT HOLE — SUBSCRIPTION CANCELLED
=====================================

We're sorry to see you go.

Your ${planName} subscription has been cancelled. You can continue using your current features until the end of your billing period.

WHAT HAPPENS NEXT:
- Your agents will continue running until the billing period ends
- You can still explore Wunderland in demo mode
- You can resubscribe anytime to restore full access

Resubscribe: ${RABBITHOLE_PRICING_URL}
Wunderland site: ${WUNDERLAND_URL}

Have feedback? ${SUPPORT_EMAIL}

(c) ${YEAR} Rabbit Hole Inc. All rights reserved.
    `.trim();
  }

  // --------------------------------------------------------------------------
  // ENTERPRISE INQUIRY CONFIRMATION
  // --------------------------------------------------------------------------

  async sendEnterpriseInquiryConfirmation(to: string, name: string): Promise<EmailResult> {
    const subject = 'We received your enterprise inquiry';
    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: this.enterpriseConfirmationHtml(name),
        text: this.enterpriseConfirmationText(name),
      });
      if (result.error) {
        console.error('[EmailService] Enterprise confirmation failed:', result.error);
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[EmailService] Enterprise confirmation error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send' };
    }
  }

  private enterpriseConfirmationHtml(name: string): string {
    return wrapEmail(
      'Enterprise Inquiry Received',
      `
      ${brandHeader('Enterprise', 'Custom Deployment')}
      <tr>
        <td style="padding:40px;">
          <h2 style="margin:0 0 16px; color:#1a1625; font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:600;">
            Thank you, ${name}
          </h2>
          <p style="margin:0 0 20px; color:#6b6b7b; font-size:15px; line-height:1.7;">
            We've received your enterprise inquiry and a member of our team will be in touch within 24 hours to discuss your requirements.
          </p>
          <div style="background:linear-gradient(135deg,rgba(139,105,20,0.06),rgba(201,162,39,0.06)); border:1px solid rgba(201,162,39,0.15); border-radius:8px; padding:20px; margin-bottom:24px;">
            <h3 style="margin:0 0 12px; color:#8b6914; font-size:14px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Enterprise includes:</h3>
            <ul style="margin:0; padding:0 0 0 20px; color:#6b6b7b; font-size:14px; line-height:1.8;">
              <li>On-site / self-hosted deployment</li>
              <li>Unlimited agents and messages</li>
              <li>Custom integrations and API access</li>
              <li>Dedicated account manager</li>
              <li>SLA guarantees and SSO/SAML</li>
            </ul>
          </div>
          <p style="margin:0; color:#9090a0; font-size:13px;">
            In the meantime, feel free to reach out directly at <a href="mailto:${SUPPORT_EMAIL}" style="color:#c9a227; text-decoration:none;">${SUPPORT_EMAIL}</a>
          </p>
        </td>
      </tr>
      ${brandFooter()}
    `
    );
  }

  private enterpriseConfirmationText(name: string): string {
    return `
RABBIT HOLE — ENTERPRISE INQUIRY RECEIVED
==========================================

Thank you, ${name}.

We've received your enterprise inquiry and a member of our team will be in touch within 24 hours to discuss your requirements.

ENTERPRISE INCLUDES:
- On-site / self-hosted deployment
- Unlimited agents and messages
- Custom integrations and API access
- Dedicated account manager
- SLA guarantees and SSO/SAML

In the meantime, feel free to reach out directly at ${SUPPORT_EMAIL}

(c) ${YEAR} Rabbit Hole Inc. All rights reserved.
    `.trim();
  }

  // --------------------------------------------------------------------------
  // CONTACT AUTO-REPLY
  // --------------------------------------------------------------------------

  async sendContactAutoReply(to: string, name: string, type: string): Promise<EmailResult> {
    const subject = 'We received your message';
    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: this.contactAutoReplyHtml(name, type),
        text: this.contactAutoReplyText(name, type),
      });
      if (result.error) {
        console.error('[EmailService] Contact auto-reply failed:', result.error);
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[EmailService] Contact auto-reply error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send' };
    }
  }

  private contactAutoReplyHtml(name: string, _type: string): string {
    return wrapEmail(
      'Message Received',
      `
      ${brandHeader('Message Received')}
      <tr>
        <td style="padding:40px;">
          <h2 style="margin:0 0 16px; color:#1a1625; font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:600;">
            Thanks for reaching out, ${name}
          </h2>
          <p style="margin:0 0 20px; color:#6b6b7b; font-size:15px; line-height:1.7;">
            We've received your message and will get back to you as soon as possible &mdash; usually within one business day.
          </p>
          <div style="text-align:center; margin-bottom:16px;">
            ${ctaButton('Visit Rabbit Hole', RABBITHOLE_URL)}
          </div>
        </td>
      </tr>
      ${brandFooter()}
    `
    );
  }

  private contactAutoReplyText(name: string, _type: string): string {
    return `
RABBIT HOLE — MESSAGE RECEIVED
===============================

Thanks for reaching out, ${name}.

We've received your message and will get back to you as soon as possible -- usually within one business day.

Visit Rabbit Hole: ${RABBITHOLE_URL}
Visit Wunderland: ${WUNDERLAND_URL}

Need help? ${SUPPORT_EMAIL}

(c) ${YEAR} Rabbit Hole Inc. All rights reserved.
    `.trim();
  }

  // --------------------------------------------------------------------------
  // TRIAL ENDING SOON
  // --------------------------------------------------------------------------

  async sendTrialEndingEmail(to: string, planName: string, hoursRemaining: number): Promise<EmailResult> {
    const prettyPlan = planName ? planName.charAt(0).toUpperCase() + planName.slice(1) : 'Plan';
    const subject = `Your ${prettyPlan} trial ends soon`;
    const hoursText = Math.max(1, Math.round(hoursRemaining));
    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: this.trialEndingHtml(prettyPlan, hoursText),
        text: this.trialEndingText(prettyPlan, hoursText),
      });
      if (result.error) {
        console.error('[EmailService] Trial ending email failed:', result.error);
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[EmailService] Trial ending email error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send' };
    }
  }

  private trialEndingHtml(planName: string, hoursText: number): string {
    return wrapEmail(
      'Trial Ending Soon',
      `
      ${brandHeader('Trial Ending')}
      <tr>
        <td style="padding:40px;">
          <h2 style="margin:0 0 16px; color:#1a1625; font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:600;">
            Your ${planName} trial ends in ${hoursText} hours
          </h2>
          <p style="margin:0 0 20px; color:#6b6b7b; font-size:15px; line-height:1.7;">
            Keep your Wunderbots running by turning on renewal before your free trial ends. Billing only begins if you keep the subscription active.
          </p>
          <div style="text-align:center; margin-bottom:16px;">
            ${ctaButton('Manage Billing', `${RABBITHOLE_PRICING_URL}`)}
          </div>
          <p style="margin:0; color:#9090a0; font-size:13px; text-align:center;">
            If you do nothing, the subscription will cancel at trial end.
          </p>
        </td>
      </tr>
      ${brandFooter()}
    `
    );
  }

  private trialEndingText(planName: string, hoursText: number): string {
    return `
RABBIT HOLE — TRIAL ENDING
===========================

Your ${planName} trial ends in ~${hoursText} hours.

Keep your Wunderbots running by turning on renewal before the trial ends. If you do nothing, the subscription will cancel automatically.

Manage billing: ${RABBITHOLE_PRICING_URL}
Wunderland site: ${WUNDERLAND_URL}

Need help? ${SUPPORT_EMAIL}

(c) ${YEAR} Rabbit Hole Inc. All rights reserved.
    `.trim();
  }

  // --------------------------------------------------------------------------
  // PLAN CHANGED
  // --------------------------------------------------------------------------

  async sendPlanChangedEmail(
    to: string,
    previousPlanName: string | null,
    newPlanName: string
  ): Promise<EmailResult> {
    const prev = previousPlanName
      ? previousPlanName.charAt(0).toUpperCase() + previousPlanName.slice(1)
      : 'your previous plan';
    const next = newPlanName ? newPlanName.charAt(0).toUpperCase() + newPlanName.slice(1) : 'New Plan';
    const subject = `Your plan changed to ${next}`;
    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: this.planChangedHtml(prev, next),
        text: this.planChangedText(prev, next),
      });
      if (result.error) {
        console.error('[EmailService] Plan changed email failed:', result.error);
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[EmailService] Plan changed email error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send' };
    }
  }

  private planChangedHtml(previousPlanName: string, newPlanName: string): string {
    return wrapEmail(
      'Subscription Updated',
      `
      ${brandHeader('Subscription Updated')}
      <tr>
        <td style="padding:40px;">
          <h2 style="margin:0 0 16px; color:#1a1625; font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:600;">
            You moved to ${newPlanName}
          </h2>
          <p style="margin:0 0 20px; color:#6b6b7b; font-size:15px; line-height:1.7;">
            Your subscription changed from ${previousPlanName} to ${newPlanName}. Your billing and included credits now follow the ${newPlanName} plan.
          </p>
          <div style="background:#f8f6f2; border:1px solid rgba(0,0,0,0.06); border-radius:8px; padding:16px; margin-bottom:20px;">
            <p style="margin:0; color:#6b6b7b; font-size:14px; line-height:1.6;">
              You can manage renewals and download invoices from the billing portal.
            </p>
          </div>
          <div style="text-align:center; margin-bottom:16px;">
            ${ctaButton('Open Billing', `${RABBITHOLE_PRICING_URL}`)}
          </div>
        </td>
      </tr>
      ${brandFooter()}
    `
    );
  }

  private planChangedText(previousPlanName: string, newPlanName: string): string {
    return `
RABBIT HOLE — SUBSCRIPTION UPDATED
==================================

You changed from ${previousPlanName} to ${newPlanName}. Billing and included credits now follow the ${newPlanName} plan.

Manage billing: ${RABBITHOLE_PRICING_URL}
Wunderland site: ${WUNDERLAND_URL}

Need help? ${SUPPORT_EMAIL}

(c) ${YEAR} Rabbit Hole Inc. All rights reserved.
    `.trim();
  }

  // --------------------------------------------------------------------------
  // INTERNAL NOTIFICATION (to hi@rabbithole.inc)
  // --------------------------------------------------------------------------

  async sendInternalNotification(data: {
    type: 'enterprise' | 'general' | 'waitlist';
    name: string;
    email: string;
    company?: string;
    message?: string;
  }): Promise<EmailResult> {
    const typeLabels = {
      enterprise: 'Enterprise Inquiry',
      general: 'Contact Form',
      waitlist: 'Waitlist Signup',
    };
    const subject = `[Rabbit Hole] New ${typeLabels[data.type]}: ${data.name || data.email}`;

    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to: SUPPORT_EMAIL,
        replyTo: data.email,
        subject,
        html: this.internalNotificationHtml(data, typeLabels[data.type]),
        text: this.internalNotificationText(data, typeLabels[data.type]),
      });
      if (result.error) {
        console.error('[EmailService] Internal notification failed:', result.error);
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[EmailService] Internal notification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send' };
    }
  }

  private internalNotificationHtml(
    data: { type: string; name: string; email: string; company?: string; message?: string },
    typeLabel: string
  ): string {
    const rows = [
      `<tr><td style="color:#6b6b7b; font-size:14px; padding:6px 0;">Type</td><td style="color:#1a1625; font-size:14px; text-align:right; font-weight:500;">${typeLabel}</td></tr>`,
      `<tr><td style="color:#6b6b7b; font-size:14px; padding:6px 0;">Name</td><td style="color:#1a1625; font-size:14px; text-align:right; font-weight:500;">${data.name}</td></tr>`,
      `<tr><td style="color:#6b6b7b; font-size:14px; padding:6px 0;">Email</td><td style="color:#1a1625; font-size:14px; text-align:right; font-weight:500;"><a href="mailto:${data.email}" style="color:#c9a227;">${data.email}</a></td></tr>`,
    ];
    if (data.company) {
      rows.push(
        `<tr><td style="color:#6b6b7b; font-size:14px; padding:6px 0;">Company</td><td style="color:#1a1625; font-size:14px; text-align:right; font-weight:500;">${data.company}</td></tr>`
      );
    }

    return wrapEmail(
      `New ${typeLabel}`,
      `
      ${brandHeader(typeLabel, 'Team Notification')}
      <tr>
        <td style="padding:40px;">
          <h2 style="margin:0 0 20px; color:#1a1625; font-family:'Cormorant Garamond',Georgia,serif; font-size:22px; font-weight:600;">
            New ${typeLabel}
          </h2>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
            ${rows.join('')}
          </table>
          ${
            data.message
              ? `
          <div style="background:#f8f6f2; border:1px solid rgba(0,0,0,0.06); border-radius:8px; padding:16px; margin-bottom:16px;">
            <p style="margin:0 0 4px; color:#9090a0; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Message</p>
            <p style="margin:0; color:#1a1625; font-size:14px; line-height:1.7; white-space:pre-wrap;">${data.message}</p>
          </div>`
              : ''
          }
          <p style="margin:0; color:#9090a0; font-size:12px;">
            Reply directly to this email to respond to ${data.email}
          </p>
        </td>
      </tr>
      ${brandFooter()}
    `
    );
  }

  private internalNotificationText(
    data: { type: string; name: string; email: string; company?: string; message?: string },
    typeLabel: string
  ): string {
    return `
NEW ${typeLabel.toUpperCase()}
${'='.repeat(typeLabel.length + 4)}

Name: ${data.name}
Email: ${data.email}
${data.company ? `Company: ${data.company}\n` : ''}${data.message ? `\nMessage:\n${data.message}\n` : ''}
Reply directly to this email to respond.
    `.trim();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable required');
    }
    emailServiceInstance = new EmailService(apiKey);
  }
  return emailServiceInstance;
}
