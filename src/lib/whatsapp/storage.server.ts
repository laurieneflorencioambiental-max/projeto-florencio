import 'server-only';
import { createSign } from 'node:crypto';
import { sealBusinessToken } from './token-vault.server';

function config() {
  const project = process.env.WHATSAPP_FIRESTORE_PROJECT_ID;
  const email = process.env.WHATSAPP_FIRESTORE_CLIENT_EMAIL;
  const key = process.env.WHATSAPP_FIRESTORE_PRIVATE_KEY;
  if (!project || !/^[a-z][a-z0-9-]{4,62}$/.test(project) || !email || !key)
    throw new Error('WHATSAPP_STORAGE_CONFIGURATION_MISSING');
  return { project, email, key: key.replace(/\\n/g, '\n') };
}

async function accessToken(request: typeof fetch, cfg: ReturnType<typeof config>) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claim = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({
    iss: cfg.email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 300,
  });
  const signature = createSign('RSA-SHA256').update(claim).sign(cfg.key).toString('base64url');
  const response = await request('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: claim + '.' + signature }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('WHATSAPP_STORAGE_AUTH_FAILED');
  const json = await response.json();
  if (typeof json.access_token !== 'string' || !json.access_token) throw new Error('WHATSAPP_STORAGE_AUTH_FAILED');
  return json.access_token as string;
}

export async function persistPendingWhatsAppConnection(input: {
  accountId: string; phoneNumberId: string; administratorUid: string; businessToken: string;
}, request: typeof fetch = fetch): Promise<void> {
  if (!/^\d+$/.test(input.accountId) || !/^\d+$/.test(input.phoneNumberId) || !input.administratorUid)
    throw new Error('WHATSAPP_STORAGE_INPUT_INVALID');
  const cfg = config();
  const sealed = sealBusinessToken(input.businessToken, input.accountId);
  try {
    const token = await accessToken(request, cfg);
    const url = new URL('https://firestore.googleapis.com/v1/projects/' + cfg.project + '/databases/crm-whatsapp/documents/whatsapp-private-connections');
    url.searchParams.set('documentId', input.accountId);
    const response = await request(url, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        accountId: { stringValue: input.accountId },
        phoneNumberId: { stringValue: input.phoneNumberId },
        administratorUid: { stringValue: input.administratorUid },
        tokenCiphertext: { stringValue: sealed },
        status: { stringValue: 'pending_activation' },
        createdAt: { timestampValue: new Date().toISOString() },
      }}),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('WHATSAPP_STORAGE_WRITE_FAILED');
  } catch { throw new Error('WHATSAPP_STORAGE_UNAVAILABLE'); }
}

/** Create a one-time marker atomically. Existing markers are rejected. */
export async function consumeSignupSession(nonce: string, uid: string, request: typeof fetch = fetch): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(nonce) || !uid) throw new Error('SIGNUP_SESSION_INVALID');
  const cfg = config();
  const token = await accessToken(request, cfg);
  const url = new URL('https://firestore.googleapis.com/v1/projects/' + cfg.project + '/databases/crm-whatsapp/documents/whatsapp-private-sessions');
  url.searchParams.set('documentId', nonce);
  const response = await request(url, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { uid: { stringValue: uid }, consumedAt: { timestampValue: new Date().toISOString() } } }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('SIGNUP_SESSION_UNAVAILABLE_OR_USED');
}

/** Store only aggregate test metadata, never message content or sender details. */
export async function persistTestWebhookReceipt(input: {
  digest: string; messages: number; statuses: number;
}, request: typeof fetch = fetch): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(input.digest) ||
      !Number.isSafeInteger(input.messages) || input.messages < 0 ||
      !Number.isSafeInteger(input.statuses) || input.statuses < 0)
    throw new Error('WHATSAPP_RECEIPT_INVALID');
  const cfg = config();
  const token = await accessToken(request, cfg);
  const url = new URL('https://firestore.googleapis.com/v1/projects/' + cfg.project + '/databases/crm-whatsapp/documents/whatsapp-test-webhook-receipts');
  url.searchParams.set('documentId', input.digest);
  const response = await request(url, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      messages: { integerValue: String(input.messages) },
      statuses: { integerValue: String(input.statuses) },
      receivedAt: { timestampValue: new Date().toISOString() },
      environment: { stringValue: 'test' },
    }}),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  // A retried delivery is already recorded; no duplicate receipt is created.
  if (!response.ok && response.status !== 409) throw new Error('WHATSAPP_RECEIPT_WRITE_FAILED');
}
