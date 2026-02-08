import jwt from 'jsonwebtoken';

function getSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required but not set`);
  }
  return value;
}

const UNSUBSCRIBE_SECRET = getSecret('UNSUBSCRIBE_SECRET');
const MAGIC_LINK_SECRET = getSecret('MAGIC_LINK_SECRET');

/**
 * Generate a signed unsubscribe token for an alert.
 */
export function generateUnsubscribeToken(alertId: string): string {
  return jwt.sign({ alertId, type: 'unsubscribe' }, UNSUBSCRIBE_SECRET, {
    expiresIn: '90d',
  });
}

/**
 * Verify and decode an unsubscribe token.
 */
export function verifyUnsubscribeToken(token: string): { alertId: string } | null {
  try {
    const decoded = jwt.verify(token, UNSUBSCRIBE_SECRET) as {
      alertId: string;
      type: string;
    };
    if (decoded.type !== 'unsubscribe') return null;
    return { alertId: decoded.alertId };
  } catch {
    return null;
  }
}

/**
 * Generate a magic link token for email-based auth.
 */
export function generateMagicLinkToken(email: string): string {
  return jwt.sign({ email, type: 'magic-link' }, MAGIC_LINK_SECRET, {
    expiresIn: '24h',
  });
}

/**
 * Verify and decode a magic link token.
 */
export function verifyMagicLinkToken(token: string): { email: string } | null {
  try {
    const decoded = jwt.verify(token, MAGIC_LINK_SECRET) as {
      email: string;
      type: string;
    };
    if (decoded.type !== 'magic-link') return null;
    return { email: decoded.email };
  } catch {
    return null;
  }
}

/**
 * Generate unsubscribe URL for an alert.
 */
export function generateUnsubscribeUrl(alertId: string): string {
  const token = generateUnsubscribeToken(alertId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/unsubscribe/${token}`;
}

/**
 * Generate magic link URL for alert management.
 */
export function generateMagicLinkUrl(email: string): string {
  const token = generateMagicLinkToken(email);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/manage/${token}`;
}
