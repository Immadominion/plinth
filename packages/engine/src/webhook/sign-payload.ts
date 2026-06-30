import { createHmac } from 'crypto';

export function signPayload(secret: string, timestampSeconds: number, payload: string): string {
  const signed = `${timestampSeconds}.${payload}`;
  return createHmac('sha256', secret).update(signed).digest('hex');
}

export function buildSignatureHeader(secret: string, timestampSeconds: number, payload: string): string {
  const sig = signPayload(secret, timestampSeconds, payload);
  return `t=${timestampSeconds},v1=${sig}`;
}

export function verifySignature(
  secret: string,
  header: string,
  payload: string,
  toleranceSeconds = 300,
  nowSeconds?: number,
): boolean {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const ts = parseInt(parts['t'] ?? '', 10);
  const v1 = parts['v1'];
  if (!ts || !v1) return false;
  if (Math.abs(now - ts) > toleranceSeconds) return false;
  const expected = signPayload(secret, ts, payload);
  return expected === v1;
}

/**
 * Verifies a Nomba webhook signature.
 * Cert: HMAC-SHA256(rawBody, secret).digest('hex') compared to nomba-signature header.
 */
export function verifyNombaSignature(secret: string, signature: string, rawBody: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}
