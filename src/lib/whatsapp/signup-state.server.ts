import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function key() {
  const raw = process.env.WHATSAPP_SIGNUP_STATE_KEY ?? '';
  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length !== 32) throw new Error('SIGNUP_STATE_CONFIGURATION_MISSING');
  return decoded;
}
function sign(payload: string) {
  return createHmac('sha256', key()).update(payload).digest();
}
export function issueSignupSession(uid: string): string {
  const payload = Buffer.from(JSON.stringify({ uid, nonce: randomBytes(32).toString('hex'), expires: Date.now() + 10 * 60 * 1000 })).toString('base64url');
  return payload + '.' + sign(payload).toString('base64url');
}
export function validateSignupSession(value: string, uid: string): string {
  if (typeof value !== 'string' || value.length > 4096) throw new Error('SIGNUP_SESSION_INVALID');
  const parts = value.split('.');
  if (parts.length !== 2) throw new Error('SIGNUP_SESSION_INVALID');
  const expected = sign(parts[0]);
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('SIGNUP_SESSION_INVALID');
  let data;
  try { data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { throw new Error('SIGNUP_SESSION_INVALID'); }
  if (!data || data.uid !== uid || !Number.isFinite(data.expires) || data.expires <= Date.now() || !/^[a-f0-9]{64}$/.test(data.nonce ?? '')) throw new Error('SIGNUP_SESSION_INVALID');
  return data.nonce;
}
