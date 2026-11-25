const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/whatsapp/embedded-signup.server.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true
});
assert.equal(compiled.diagnostics.length, 0);
const mod = { exports: {} };
const testRequire = (name) => name === 'server-only' ? {} : require(name);
new Function('require', 'module', 'exports', compiled.outputText)(testRequire, mod, mod.exports);
const exchange = mod.exports.exchangeEmbeddedSignupCode;
(async () => {
  delete process.env.META_APP_ID;
  delete process.env.META_APP_SECRET;
  delete process.env.META_GRAPH_API_VERSION;
  await assert.rejects(() => exchange('fake-code'), /META_CONFIGURATION_MISSING/);
  Object.assign(process.env, { META_APP_ID: 'test-app', META_APP_SECRET: 'test-secret', META_GRAPH_API_VERSION: 'v27.0' });
  await assert.rejects(() => exchange(''), /INVALID_SIGNUP_CODE/);
  const result = await exchange('fake-code', async (url, options) => {
    assert.equal(url.hostname, 'graph.facebook.com');
    assert.equal(options.redirect, 'error');
    return Response.json({ access_token: 'fake-token', expires_in: 3600 });
  });
  assert.deepEqual(result, { accessToken: 'fake-token', expiresIn: 3600 });
  await assert.rejects(() => exchange('fake-code', async () => new Response('', { status: 400 })), /META_TOKEN_EXCHANGE_REJECTED/);
  await assert.rejects(() => exchange('fake-code', async () => Response.json({})), /META_TOKEN_RESPONSE_INVALID/);
  await assert.rejects(() => exchange('fake-code', async () => { throw new Error('mock'); }), /META_TOKEN_EXCHANGE_UNAVAILABLE/);
  console.log('PASS: 6 mock cases');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
