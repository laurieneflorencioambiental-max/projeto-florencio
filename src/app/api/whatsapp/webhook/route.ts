import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { persistTestWebhookReceipt } from '@/lib/whatsapp/storage.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const reply = (status: number, body: string) => new NextResponse(body, { status, headers });
const enabled = () => process.env.VERCEL_ENV === 'preview' &&
  process.env.VERCEL_GIT_COMMIT_REF === 'feat/whatsapp-embedded-signup' &&
  process.env.WHATSAPP_WEBHOOK_TEST_ENABLED === 'true';

function equal(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function GET(request: NextRequest) {
  if (!enabled()) return reply(503, 'disabled');
  const cfg = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const { searchParams } = request.nextUrl;
  const supplied = searchParams.get('hub.verify_token') ?? '';
  const challenge = searchParams.get('hub.challenge') ?? '';
  if (!cfg || !equal(Buffer.from(supplied), Buffer.from(cfg)) ||
      searchParams.get('hub.mode') !== 'subscribe' || !/^\d{1,128}$/.test(challenge))
    return reply(403, 'forbidden');
  return reply(200, challenge);
}

async function readBounded(request: NextRequest): Promise<Buffer> {
  if (!request.body) throw new Error('empty');
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > 256 * 1024) { await reader.cancel(); throw new Error('too_large'); }
      chunks.push(Buffer.from(item.value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}

export async function POST(request: NextRequest) {
  if (!enabled()) return reply(503, 'disabled');
  const secret = process.env.META_APP_SECRET;
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  if (!secret || !/^sha256=[0-9a-f]{64}$/i.test(signature)) return reply(403, 'forbidden');
  let raw: Buffer;
  try { raw = await readBounded(request); } catch { return reply(413, 'invalid_request'); }
  const computed = createHmac('sha256', secret).update(raw).digest();
  if (!equal(computed, Buffer.from(signature.slice(7), 'hex'))) return reply(403, 'forbidden');
  let payload;
  try { payload = JSON.parse(raw.toString('utf8')); } catch { return reply(400, 'invalid_request'); }
  // This receiver is for the existing Meta test assets only. No commercial number.
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry))
    return reply(400, 'invalid_request');
  let messages = 0, statuses = 0;
  for (const entry of payload.entry) {
    if (entry?.id !== '1177893114843156' || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (change?.field !== 'messages' ||
          change.value?.metadata?.phone_number_id !== '1432881259912328') continue;
      messages += Array.isArray(change.value.messages) ? change.value.messages.length : 0;
      statuses += Array.isArray(change.value.statuses) ? change.value.statuses.length : 0;
    }
  }
  if (!messages && !statuses) return reply(200, 'ignored');
  try {
    await persistTestWebhookReceipt({digest: createHmac('sha256', secret).update('receipt:').update(raw).digest('hex'), messages, statuses});
    return reply(200, 'ok');
  } catch { return reply(503, 'retry'); }
}
