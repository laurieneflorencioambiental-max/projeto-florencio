import 'server-only';

export async function requireWhatsAppAdministrator(
  authorization: string | null,
  request: typeof fetch = fetch,
): Promise<string> {
  const apiKey = process.env.FIREBASE_AUTH_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const adminUids = (process.env.WHATSAPP_ADMIN_UIDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const match = /^Bearer ([^\s]+)$/.exec(authorization ?? '');
  if (!apiKey || !adminUids.length) throw new Error('ADMIN_CONFIGURATION_MISSING');
  if (!match || match[1].length > 8192) throw new Error('ADMIN_UNAUTHORIZED');
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
  if (!response.ok) throw new Error('ADMIN_UNAUTHORIZED');
  let uid: unknown;
  try {
    const payload = await response.json();
    if (Array.isArray(payload.users) && payload.users.length === 1 && !payload.users[0].disabled) {
      uid = payload.users[0].localId;
    }
  } catch { throw new Error('ADMIN_UNAUTHORIZED'); }
  if (typeof uid !== 'string' || !adminUids.includes(uid)) throw new Error('ADMIN_UNAUTHORIZED');
  return uid;
}
