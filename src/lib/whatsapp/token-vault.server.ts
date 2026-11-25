import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function storageKey(): Buffer {
  const encoded = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY ?? '';
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new Error('TOKEN_STORAGE_KEY_INVALID');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_STORAGE_KEY_INVALID');
  return key;
}

export function sealBusinessToken(token: string, accountId: string): string {
  if (!token || !/^\d+$/.test(accountId)) throw new Error('TOKEN_STORAGE_INPUT_INVALID');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', storageKey(), iv);
  cipher.setAAD(Buffer.from('whatsapp:' + accountId));
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function unsealBusinessToken(sealed: string, accountId: string): string {
  if (!/^\d+$/.test(accountId)) throw new Error('TOKEN_STORAGE_INPUT_INVALID');
  try {
    const parts = sealed.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1') throw new Error();
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', storageKey(), iv);
    decipher.setAAD(Buffer.from('whatsapp:' + accountId));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
  } catch { throw new Error('TOKEN_STORAGE_DECRYPTION_FAILED'); }
}
