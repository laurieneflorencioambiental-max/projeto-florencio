import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAdministrator } from '@/lib/whatsapp/admin.server';
import { exchangeEmbeddedSignupCode } from '@/lib/whatsapp/embedded-signup.server';
import { issueSignupSession, validateSignupSession } from '@/lib/whatsapp/signup-state.server';
import { consumeSignupSession, persistPendingWhatsAppConnection } from '@/lib/whatsapp/storage.server';
import { verifyWhatsAppAsset } from '@/lib/whatsapp/asset.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers });

export function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has('error')) return reply(400, { status: 'cancelled' });
  if (request.nextUrl.searchParams.has('code')) return reply(503, { status: 'hosted_callback_not_enabled' });
  return reply(200, { status: 'ready', integration: 'whatsapp-embedded-signup' });
}

/** Receives the official SDK result from the authenticated CRM page, not a hosted OAuth redirect. */
export async function POST(request: NextRequest) {
  if (process.env.WHATSAPP_SIGNUP_ENABLED !== 'true') return reply(503, { status: 'disabled' });
  const origin = process.env.WHATSAPP_SIGNUP_ORIGIN;
  if (!origin || request.headers.get('origin') !== origin) return reply(403, { status: 'forbidden' });
  let uid: string;
  try { uid = await requireWhatsAppAdministrator(request.headers.get('authorization')); }
  catch { return reply(403, { status: 'forbidden' }); }
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { status: 'invalid_request' });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 16384) return reply(413, { status: 'invalid_request' });
    body = JSON.parse(raw);
  } catch { return reply(400, { status: 'invalid_request' }); }
  try {
    if (body?.action === 'start') {
      const required = ['META_APP_ID', 'META_APP_SECRET', 'META_GRAPH_API_VERSION', 'WHATSAPP_EXPECTED_PHONE_DIGITS',
        'WHATSAPP_FIRESTORE_PROJECT_ID', 'WHATSAPP_FIRESTORE_CLIENT_EMAIL', 'WHATSAPP_FIRESTORE_PRIVATE_KEY',
        'WHATSAPP_TOKEN_ENCRYPTION_KEY', 'WHATSAPP_SIGNUP_STATE_KEY'];
      if (required.some(name => !process.env[name])) return reply(503, { status: 'configuration_incomplete' });
      return reply(200, { state: issueSignupSession(uid) });
    }
    if (body?.action !== 'complete' || body.event !== 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' ||
        typeof body.code !== 'string' || !body.code || body.code.length > 8192 ||
        typeof body.accountId !== 'string' || !/^\d+$/.test(body.accountId) ||
        (body.phoneNumberId !== undefined && (typeof body.phoneNumberId !== 'string' || !/^\d+$/.test(body.phoneNumberId)))) return reply(400, { status: 'invalid_request' });
    const nonce = validateSignupSession(body.state, uid);
    await consumeSignupSession(nonce, uid);
    const token = await exchangeEmbeddedSignupCode(body.code);
    const phoneNumberId = await verifyWhatsAppAsset({ accountId: body.accountId, phoneNumberId: body.phoneNumberId, accessToken: token.accessToken });
    await persistPendingWhatsAppConnection({ accountId: body.accountId, phoneNumberId, administratorUid: uid, businessToken: token.accessToken });
    return reply(200, { status: 'pending_activation' });
  } catch {
    return reply(400, { status: 'signup_not_completed' });
  }
}
