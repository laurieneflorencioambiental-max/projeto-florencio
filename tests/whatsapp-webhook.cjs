// Offline fixture test; no calls to Meta and no production records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createHmac} = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '../src/app/api/whatsapp/webhook/route.ts'), 'utf8');
const out = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(out.diagnostics.length,0);
const moduleFixture = {exports:{}};
const receipts = [];
const req = id => id === 'next/server'
  ? {NextResponse: Response}
  : id === '@/lib/whatsapp/storage.server'
    ? {persistTestWebhookReceipt: async input => { receipts.push(input); }}
    : require(id);
new Function('require','module','exports',out.outputText)(req,moduleFixture,moduleFixture.exports);
const {GET,POST} = moduleFixture.exports;
const secret = 'mock-fixture-secret-not-a-real-credential';
Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/whatsapp-embedded-signup',
  WHATSAPP_WEBHOOK_TEST_ENABLED:'true',WHATSAPP_WEBHOOK_VERIFY_TOKEN:'fixture-verify-token',META_APP_SECRET:secret});
const url = 'https://example.test/api/whatsapp/webhook';
const fixture = {object:'whatsapp_business_account',entry:[{id:'1177893114843156',changes:[{
  field:'messages',value:{metadata:{phone_number_id:'1432881259912328'},messages:[{id:'synthetic-message'}],statuses:[{status:'sent'}]}
}]}]};
function signedRequest(data) {
  const raw = JSON.stringify(data);
  return new Request(url,{method:'POST',headers:{'x-hub-signature-256':'sha256='+createHmac('sha256',secret).update(raw).digest('hex')},body:raw});
}
(async()=>{
  const verify = GET({nextUrl:new URL(url+'?hub.mode=subscribe&hub.verify_token=fixture-verify-token&hub.challenge=12345')});
  assert.equal(verify.status,200);assert.equal(await verify.text(),'12345');
  assert.equal(GET({nextUrl:new URL(url)}).status,403);
  assert.equal((await POST(signedRequest(fixture))).status,200);
  assert.equal(receipts.length,1);assert.equal(receipts[0].messages,1);assert.equal(receipts[0].statuses,1);
  assert.deepEqual(Object.keys(receipts[0]).sort(),['digest','messages','statuses']);
  const unrelated = {...fixture,entry:[{...fixture.entry[0],id:'000'}]};
  assert.equal((await POST(signedRequest(unrelated))).status,200);assert.equal(receipts.length,1);
  assert.equal((await POST(new Request(url,{method:'POST',body:'{}'}))).status,403);
  process.env.WHATSAPP_WEBHOOK_TEST_ENABLED='false';
  assert.equal((await POST(signedRequest(fixture))).status,503);
  console.log('[WhatsApp webhook] PASS: verification, signed test fixture, isolation and disabled gate');
})().catch(()=>{console.error('[WhatsApp webhook] fixture test failed');process.exitCode=1;});
