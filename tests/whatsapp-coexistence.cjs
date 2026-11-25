const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const crypto = require('node:crypto');
const cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  const file = path.join(__dirname, '../src/lib/whatsapp/', name + '.ts');
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true
  });
  assert.equal(out.diagnostics.length, 0);
  const module = { exports: {} };
  const localRequire = id => id === 'server-only' ? {} : id.startsWith('./') ? load(id.slice(2)) : require(id);
  new Function('require', 'module', 'exports', out.outputText)(localRequire, module, module.exports);
  return cache[name] = module.exports;
}
(async () => {
  Object.assign(process.env, {
    WHATSAPP_SIGNUP_STATE_KEY: Buffer.alloc(32, 8).toString('base64'),
    WHATSAPP_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'),
    WHATSAPP_EXPECTED_PHONE_DIGITS: '5521999999999',
    META_GRAPH_API_VERSION: 'v27.0',
    WHATSAPP_FIRESTORE_PROJECT_ID: 'mock-project',
    WHATSAPP_FIRESTORE_CLIENT_EMAIL: 'mock@example.test',
    WHATSAPP_FIRESTORE_PRIVATE_KEY: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' })
  });
  const state = load('signup-state.server');
  const vault = load('token-vault.server');
  const asset = load('asset.server');
  const storage = load('storage.server');
  const session = state.issueSignupSession('mock-admin');
  const nonce = state.validateSignupSession(session, 'mock-admin');
  assert.match(nonce, /^[a-f0-9]{64}$/);
  assert.throws(() => state.validateSignupSession(session, 'another-user'), /SIGNUP_SESSION_INVALID/);
  let calls = 0;
  const graph = async () => Response.json(++calls === 1
    ? { data: [{ id: '123', display_phone_number: '+55 21 99999-9999' }] }
    : { is_on_biz_app: true, platform_type: 'CLOUD_API' });
  assert.equal(await asset.verifyWhatsAppAsset({ accountId: '456', accessToken: 'mock' }, graph), '123');
  await assert.rejects(() => asset.verifyWhatsAppAsset({ accountId: '456', accessToken: 'mock' }, async () => Response.json({ data: [] })), /ASSET_VERIFICATION_FAILED/);
  let stored;
  const firestore = async (url, options) => {
    if (String(url).startsWith('https://oauth2.googleapis.com/')) return Response.json({ access_token: 'mock-google' });
    stored = JSON.parse(options.body);
    return Response.json({});
  };
  await storage.persistPendingWhatsAppConnection({ accountId: '456', phoneNumberId: '123', administratorUid: 'mock-admin', businessToken: 'mock-meta' }, firestore);
  assert.equal(vault.unsealBusinessToken(stored.fields.tokenCiphertext.stringValue, '456'), 'mock-meta');
  assert.equal(stored.fields.status.stringValue, 'pending_activation');
  await storage.consumeSignupSession(nonce, 'mock-admin', firestore);
  assert.equal(stored.fields.uid.stringValue, 'mock-admin');
  console.log('PASS: mocked state, asset, encrypted persistence and atomic session');
})().catch(err => { console.error(err.message); process.exitCode = 1; });
