/**
 * Email Service using Nodemailer with Gmail SMTP
 * 
 * Setup required:
 * 1. Go to Google Account → Security → 2-Step Verification (enable it)
 * 2. Go to Google Account → Security → App passwords
 * 3. Generate an app password for "Mail"
 * 4. Add SMTP_EMAIL and SMTP_PASSWORD to .env.local
 */

import nodemailer from 'nodemailer'

const APP_NAME = 'Aura360'

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD, // App password, NOT your regular password
    },
  })
}

interface SendEmailResult {
  success: boolean
  error?: string
}

/**
 * Send verification email to new user
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string
): Promise<SendEmailResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`

  // Check if SMTP is configured
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.error('[Email] Missing SMTP configuration. Please set SMTP_EMAIL and SMTP_PASSWORD')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `Verify your ${APP_NAME} account`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <tr>
                <td style="background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">✨ ${APP_NAME}</h1>
                </td>
              </tr>
              <tr>
                <td style="background-color: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <h2 style="color: #18181b; margin: 0 0 16px; font-size: 24px;">
                    Welcome${name ? `, ${name}` : ''}! 🎉
                  </h2>
                  <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Thanks for signing up for ${APP_NAME}! Please verify your email address to get started.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center; padding: 24px 0;">
                        <a href="${verifyUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Verify Email Address
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #a1a1aa; font-size: 14px; margin: 24px 0 0; text-align: center;">
                    This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                  <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                    Button not working? Copy and paste this link:<br>
                    <a href="${verifyUrl}" style="color: #0d9488; word-break: break-all;">${verifyUrl}</a>
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    console.log('[Email] Verification email sent to:', email)
    return { success: true }
  } catch (error: any) {
    console.error('[Email Error]', error)
    return { success: false, error: error?.message || 'Failed to send email' }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name?: string
): Promise<SendEmailResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.error('[Email] Missing SMTP configuration')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <tr>
                <td style="background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🔐 ${APP_NAME}</h1>
                </td>
              </tr>
              <tr>
                <td style="background-color: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <h2 style="color: #18181b; margin: 0 0 16px; font-size: 24px;">
                    Password Reset Request
                  </h2>
                  <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Hi${name ? ` ${name}` : ''}! We received a request to reset your password. Click the button below to create a new password.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center; padding: 24px 0;">
                        <a href="${resetUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #a1a1aa; font-size: 14px; margin: 24px 0 0; text-align: center;">
                    This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    console.log('[Email] Password reset email sent to:', email)
    return { success: true }
  } catch (error: any) {
    console.error('[Email Error]', error)
    return { success: false, error: error?.message || 'Failed to send email' }
  }
}
