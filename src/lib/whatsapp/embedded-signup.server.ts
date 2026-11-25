import 'server-only';

export interface MetaBusinessToken {
  accessToken: string;
  expiresIn?: number;
}

/** Call only after validating an authorized administrator and signup session.
 * Never return the token to the browser or log the request or response. */
export async function exchangeEmbeddedSignupCode(
  code: string,
  request: typeof fetch = fetch,
): Promise<MetaBusinessToken> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const version = process.env.META_GRAPH_API_VERSION;
  if (!appId || !appSecret || !version || !/^v\d+\.\d+$/.test(version)) {
    throw new Error('META_CONFIGURATION_MISSING');
  }
  if (typeof code !== 'string' || !code.trim() || code.length > 8192) {
    throw new Error('INVALID_SIGNUP_CODE');
  }
  const endpoint = new URL('https://graph.facebook.com/' + version + '/oauth/access_token');
  endpoint.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, code }).toString();
  let response: Response;
  try {
    response = await request(endpoint, {
      method: 'GET', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error('META_TOKEN_EXCHANGE_UNAVAILABLE');
  }
  if (!response.ok) throw new Error('META_TOKEN_EXCHANGE_REJECTED');
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error('META_TOKEN_RESPONSE_INVALID'); }
  if (!data || typeof data !== 'object') throw new Error('META_TOKEN_RESPONSE_INVALID');
  const result = data as Record<string, unknown>;
  if (typeof result.access_token !== 'string' || !result.access_token.trim()) {
    throw new Error('META_TOKEN_RESPONSE_INVALID');
  }
  return {
    accessToken: result.access_token,
    expiresIn: typeof result.expires_in === 'number' ? result.expires_in : undefined,
  };
}
