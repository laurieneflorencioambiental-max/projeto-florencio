import 'server-only';

export async function verifyWhatsAppAsset(input: {
  accountId: string; phoneNumberId?: string; accessToken: string;
}, request: typeof fetch = fetch): Promise<string> {
  const expectedPhone = process.env.WHATSAPP_EXPECTED_PHONE_DIGITS;
  const version = process.env.META_GRAPH_API_VERSION;
  if (!expectedPhone || !/^\d{10,15}$/.test(expectedPhone) || !version || !/^v\d+\.\d+$/.test(version))
    throw new Error('ASSET_CONFIGURATION_MISSING');
  if (!/^\d+$/.test(input.accountId) || (input.phoneNumberId !== undefined && !/^\d+$/.test(input.phoneNumberId)))
    throw new Error('ASSET_INVALID');
  const url = new URL('https://graph.facebook.com/' + version + '/' + input.accountId + '/phone_numbers');
  url.searchParams.set('fields', 'id,display_phone_number');
  url.searchParams.set('limit', '100');
  const response = await request(url, {
    headers: { Authorization: 'Bearer ' + input.accessToken },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('ASSET_VERIFICATION_FAILED');
  const body = await response.json();
  const matches = Array.isArray(body.data) ? body.data.filter((item: { id?: unknown; display_phone_number?: unknown }) =>
    typeof item.id === 'string' && /^\d+$/.test(item.id) && (!input.phoneNumberId || item.id === input.phoneNumberId) &&
    typeof item.display_phone_number === 'string' &&
    item.display_phone_number.replace(/\D/g, '') === expectedPhone) : [];
  if (matches.length !== 1) throw new Error('ASSET_VERIFICATION_FAILED');
  const phoneId: string = matches[0].id;
  const details = new URL('https://graph.facebook.com/' + version + '/' + phoneId);
  details.searchParams.set('fields', 'is_on_biz_app,platform_type');
  const status = await request(details, { headers: { Authorization: 'Bearer ' + input.accessToken }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!status.ok) throw new Error('ASSET_VERIFICATION_FAILED');
  const result = await status.json();
  if (result.is_on_biz_app !== true || result.platform_type !== 'CLOUD_API') throw new Error('COEXISTENCE_NOT_CONFIRMED');
  return phoneId;
}
