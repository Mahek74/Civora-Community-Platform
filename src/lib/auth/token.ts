import crypto from 'crypto';

const AI_VERIFICATION_SECRET = process.env.AI_SECRET || process.env.DATABASE_URL || 'civora-ai-verification-hmac-salt-2026';

export interface AnalysisTokenPayload {
  isValid: boolean;
  category: string;
  severity: string;
  confidence: number;
  timestamp: number;
}

/**
 * Signs an AI analysis payload with HMAC-SHA256
 */
export function signAnalysisPayload(payload: AnalysisTokenPayload): string {
  const dataString = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AI_VERIFICATION_SECRET)
    .update(dataString)
    .digest('hex');
  return `${dataString}.${signature}`;
}

/**
 * Verifies and decodes a signed AI analysis token.
 * Returns decoded payload if valid and unexpired (within 30 minutes), else null.
 */
export function verifyAnalysisToken(token: string): AnalysisTokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [dataString, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', AI_VERIFICATION_SECRET)
      .update(dataString)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: AnalysisTokenPayload = JSON.parse(Buffer.from(dataString, 'base64url').toString('utf8'));

    // Check expiry (valid for 30 minutes)
    const MAX_AGE_MS = 30 * 60 * 1000;
    if (Date.now() - payload.timestamp > MAX_AGE_MS) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
