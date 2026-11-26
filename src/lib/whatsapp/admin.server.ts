import 'server-only';

export async function requireWhatsAppAdministrator(
  authorization: string | null,
  request: typeof fetch = fetch,
): Promise<string> {
  const apiKey = (process.env.FIREBASE_AUTH_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim();
  const adminUids = (process.env.WHATSAPP_ADMIN_UIDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const match = /^Bearer ([^\s]+)$/.exec(authorization ?? '');
  if (!apiKey || !adminUids.length) throw new Error('ADMIN_CONFIGURATION_MISSING');
  if (!match || match[1].length > 8192) {
    console.warn('[whatsapp-auth] missing_or_invalid_bearer');
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  const url = new URL('https://identitytoolkit.googleapis.com/v1/accounts:lookup');
  url.searchParams.set('key', apiKey);
  let response: Response;
  try {
    response = await request(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: match[1] }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error('ADMIN_VERIFICATION_UNAVAILABLE');
  }
  if (!response.ok) {
    let category='other';
    try {
      const body=await response.json();
      const error=body?.error;
      const details=Array.isArray(error?.details)?error.details:[];
      const reasons=details.map((detail:{reason?:unknown})=>detail?.reason);
      if (reasons.includes('API_KEY_HTTP_REFERRER_BLOCKED') || reasons.includes('API_KEY_IP_ADDRESS_BLOCKED') || reasons.includes('API_KEY_SERVICE_BLOCKED')) category='api_key_restricted';
      else if (reasons.includes('API_KEY_INVALID')) category='api_key_invalid';
      else if (['INVALID_ID_TOKEN','TOKEN_EXPIRED','USER_DISABLED','USER_NOT_FOUND'].includes(error?.message)) category='token_or_account_invalid';
    } catch { /* Never log the upstream response or token. */ }
    console.warn('[whatsapp-auth] firebase_lookup_failed', response.status, category);
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  let uid: unknown;
  try {
    const payload = await response.json();
    if (Array.isArray(payload.users) && payload.users.length === 1 && !payload.users[0].disabled) {
      uid = payload.users[0].localId;
    }
  } catch {
    console.warn('[whatsapp-auth] invalid_lookup_response');
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  if (typeof uid !== 'string') {
    console.warn('[whatsapp-auth] user_not_active');
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  if (!adminUids.includes(uid)) {
    console.warn('[whatsapp-auth] administrator_not_listed');
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  return uid;
}
