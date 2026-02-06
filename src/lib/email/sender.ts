import nodemailer from 'nodemailer';
import type { NormalizedListing, SourceName } from '@/types';
import { EMAIL_CONFIG } from '@/lib/config/constants';
import { generateDigestEmail, generateNoResultsEmail } from './templates';

// Create transporter (configured via env vars)
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || EMAIL_CONFIG.FROM_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

interface SendDigestParams {
  to: string;
  date: string;
  city: string;
  newListings: NormalizedListing[];
  totalScraped: number;
  sourcesSearched: SourceName[];
  unsubscribeUrl: string;
}

/**
 * Send daily digest email with new listings.
 */
export async function sendDigestEmail(params: SendDigestParams): Promise<boolean> {
  const { to, date, city, newListings, totalScraped, sourcesSearched, unsubscribeUrl } = params;

  const html = generateDigestEmail({
    date,
    city,
    newListings,
    totalScraped,
    sourcesSearched,
    unsubscribeUrl,
  });

  const subject = `${EMAIL_CONFIG.SUBJECT_PREFIX} ${city} – ${date}`;

  return sendEmail(to, subject, html);
}

interface SendNoResultsParams {
  to: string;
  date: string;
  city: string;
  sourcesSearched: SourceName[];
  unsubscribeUrl: string;
}

/**
 * Send email when no new listings are found.
 */
export async function sendNoResultsEmail(params: SendNoResultsParams): Promise<boolean> {
  const { to, date, city, sourcesSearched, unsubscribeUrl } = params;

  const html = generateNoResultsEmail({
    date,
    city,
    sourcesSearched,
    unsubscribeUrl,
  });

  const subject = `No new listings for ${city} – ${date}`;

  return sendEmail(to, subject, html);
}

/**
 * Send magic link email for alert management.
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLinkUrl: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manage Your Alerts</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    h1 { color: #1e40af; font-size: 20px; }
    .btn {
      display: inline-block;
      background-color: #2563eb;
      color: white !important;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      margin-top: 16px;
    }
    .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Manage Your Alerts</h1>
    <p>Click the button below to view and manage your apartment alerts.</p>
    <a href="${magicLinkUrl}" class="btn">Manage Alerts</a>
    <div class="footer">
      <p>This link expires in 24 hours.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>Apartment Finder Alerts - Peru</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail(to, 'Manage Your Apartment Alerts', html);
}

/**
 * Core email sending function.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] SENT: ${to} - ${subject} - ${result.messageId}`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.log(`[EMAIL] FAILED: ${to} - ${subject} - ${errorMsg}`);
    return false;
  }
}
