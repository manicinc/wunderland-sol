/**
 * Email Service (Resend)
 *
 * Handles transactional email delivery for Quarry:
 * - License key delivery after purchase
 * - Recovery key email
 * - Account notifications
 *
 * Uses Resend for reliable email delivery with React templates.
 *
 * @module lib/api/services/emailService
 */

import { Resend } from 'resend'

// ============================================================================
// TYPES
// ============================================================================

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface LicenseEmailData {
  to: string
  licenseKey: string
  purchaseType: 'lifetime' | 'monthly' | 'annual'
  purchaseDate: Date
}

export interface RecoveryEmailData {
  to: string
  recoveryKey: string
  accountEmail: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FROM_EMAIL = process.env.EMAIL_FROM || 'Quarry <hello@quarry.space>'
const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT || 'support@quarry.space'

// ============================================================================
// EMAIL SERVICE
// ============================================================================

export class EmailService {
  private resend: Resend

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey)
  }

  // ==========================================================================
  // LICENSE DELIVERY
  // ==========================================================================

  /**
   * Send license key email after successful purchase.
   */
  async sendLicenseEmail(data: LicenseEmailData): Promise<EmailResult> {
    const { to, licenseKey, purchaseType, purchaseDate } = data

    const purchaseLabel = purchaseType === 'lifetime'
      ? 'Lifetime License'
      : purchaseType === 'annual'
        ? 'Annual Subscription'
        : 'Monthly Subscription'

    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Your Quarry ${purchaseLabel} License Key`,
        html: this.generateLicenseEmailHtml({
          licenseKey,
          purchaseType,
          purchaseLabel,
          purchaseDate,
        }),
        text: this.generateLicenseEmailText({
          licenseKey,
          purchaseType,
          purchaseLabel,
          purchaseDate,
        }),
      })

      if (result.error) {
        console.error('[EmailService] Failed to send license email:', result.error)
        return { success: false, error: result.error.message }
      }

      return { success: true, messageId: result.data?.id }
    } catch (error) {
      console.error('[EmailService] License email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }
    }
  }

  /**
   * Generate HTML email for license delivery.
   */
  private generateLicenseEmailHtml(data: {
    licenseKey: string
    purchaseType: string
    purchaseLabel: string
    purchaseDate: Date
  }): string {
    const { licenseKey, purchaseType, purchaseLabel, purchaseDate } = data

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quarry License Key</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width: 100%; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Quarry</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Your Knowledge, Crystallized</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">
                Thank you for your purchase!
              </h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                Your ${purchaseLabel} is ready. Here's your license key to unlock all premium features.
              </p>

              <!-- License Key Box -->
              <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Your License Key</p>
                <code style="display: block; font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 18px; font-weight: 600; color: #111827; letter-spacing: 0.02em; word-break: break-all;">
                  ${licenseKey}
                </code>
              </div>

              <!-- Instructions -->
              <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px; color: #065f46; font-size: 14px; font-weight: 600;">How to activate:</h3>
                <ol style="margin: 0; padding: 0 0 0 20px; color: #047857; font-size: 14px; line-height: 1.8;">
                  <li>Open Quarry on any device</li>
                  <li>Go to Settings → License</li>
                  <li>Enter your license key above</li>
                  <li>Enjoy unlimited devices and all premium features!</li>
                </ol>
              </div>

              <!-- CTA Button -->
              <a href="https://quarry.space/app" style="display: block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 24px;">
                Open Quarry
              </a>

              <!-- Purchase Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <tr>
                  <td style="color: #6b7280; font-size: 14px;">Purchase Type</td>
                  <td style="color: #111827; font-size: 14px; text-align: right; font-weight: 500;">${purchaseLabel}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 14px; padding-top: 8px;">Purchase Date</td>
                  <td style="color: #111827; font-size: 14px; text-align: right; font-weight: 500; padding-top: 8px;">
                    ${purchaseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                </tr>
                ${purchaseType === 'lifetime' ? `
                <tr>
                  <td style="color: #6b7280; font-size: 14px; padding-top: 8px;">Validity</td>
                  <td style="color: #059669; font-size: 14px; text-align: right; font-weight: 600; padding-top: 8px;">Forever (Lifetime)</td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                Need help? Contact us at
                <a href="mailto:${SUPPORT_EMAIL}" style="color: #10b981; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Quarry. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  }

  /**
   * Generate plain text fallback for license email.
   */
  private generateLicenseEmailText(data: {
    licenseKey: string
    purchaseType: string
    purchaseLabel: string
    purchaseDate: Date
  }): string {
    const { licenseKey, purchaseLabel, purchaseDate } = data

    return `
QUARRY - Your ${purchaseLabel} License Key
============================================

Thank you for your purchase!

Your license key is ready. Copy it and paste it into Quarry to unlock all premium features.

LICENSE KEY:
${licenseKey}

HOW TO ACTIVATE:
1. Open Quarry on any device
2. Go to Settings → License
3. Enter your license key above
4. Enjoy unlimited devices and all premium features!

PURCHASE DETAILS:
- Purchase Type: ${purchaseLabel}
- Purchase Date: ${purchaseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Open Quarry: https://quarry.space/app

Need help? Contact us at ${SUPPORT_EMAIL}

© ${new Date().getFullYear()} Quarry. All rights reserved.
    `.trim()
  }

  // ==========================================================================
  // RECOVERY KEY EMAIL
  // ==========================================================================

  /**
   * Send recovery key email when user sets up account.
   */
  async sendRecoveryKeyEmail(data: RecoveryEmailData): Promise<EmailResult> {
    const { to, recoveryKey, accountEmail } = data

    try {
      const result = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: 'Your Quarry Recovery Key - Save This Email!',
        html: this.generateRecoveryEmailHtml({ recoveryKey, accountEmail }),
        text: this.generateRecoveryEmailText({ recoveryKey, accountEmail }),
      })

      if (result.error) {
        console.error('[EmailService] Failed to send recovery email:', result.error)
        return { success: false, error: result.error.message }
      }

      return { success: true, messageId: result.data?.id }
    } catch (error) {
      console.error('[EmailService] Recovery email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }
    }
  }

  /**
   * Generate HTML email for recovery key.
   */
  private generateRecoveryEmailHtml(data: {
    recoveryKey: string
    accountEmail: string
  }): string {
    const { recoveryKey, accountEmail } = data

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quarry Recovery Key</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width: 100%; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🔑 Recovery Key</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Save this email - you'll need it to recover your account</p>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="background-color: #fef3c7; padding: 16px 40px; border-bottom: 1px solid #fcd34d;">
              <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500; text-align: center;">
                ⚠️ This is the ONLY way to recover your account. Do not delete this email.
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                Your Quarry sync account <strong>${accountEmail}</strong> has been set up with end-to-end encryption.
                Your recovery key is the only way to regain access if you forget your password.
              </p>

              <!-- Recovery Key Box -->
              <div style="background-color: #fffbeb; border: 2px solid #fcd34d; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Your Recovery Key</p>
                <code style="display: block; font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #78350f; letter-spacing: 0.02em; word-break: break-all;">
                  ${recoveryKey}
                </code>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 12px; color: #374151; font-size: 14px; font-weight: 600;">Security Information:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                  <li>Your data is encrypted with your password</li>
                  <li>Quarry cannot see or recover your data</li>
                  <li>This key is required to access your account if you forget your password</li>
                  <li>Store this email safely - print it or save to a password manager</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Quarry. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  }

  /**
   * Generate plain text fallback for recovery email.
   */
  private generateRecoveryEmailText(data: {
    recoveryKey: string
    accountEmail: string
  }): string {
    const { recoveryKey, accountEmail } = data

    return `
QUARRY - RECOVERY KEY
=====================
⚠️ SAVE THIS EMAIL - DO NOT DELETE ⚠️

Your Quarry sync account (${accountEmail}) has been set up with end-to-end encryption.

This recovery key is the ONLY way to regain access if you forget your password.

RECOVERY KEY:
${recoveryKey}

SECURITY INFORMATION:
- Your data is encrypted with your password
- Quarry cannot see or recover your data
- This key is required to access your account if you forget your password
- Store this email safely - print it or save to a password manager

© ${new Date().getFullYear()} Quarry. All rights reserved.
    `.trim()
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let emailServiceInstance: EmailService | null = null

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable required')
    }
    emailServiceInstance = new EmailService(apiKey)
  }
  return emailServiceInstance
}
