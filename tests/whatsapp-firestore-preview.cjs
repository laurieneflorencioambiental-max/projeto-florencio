// Read/write integration smoke test (synthetic document, removed after verification). Runs only on the dedicated Vercel preview.
const {createSign, randomUUID} = require('node:crypto');

async function main() {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_GIT_COMMIT_REF !== 'feat/whatsapp-embedded-signup') {
    console.log('[WhatsApp Firestore] skipped outside dedicated preview');
    return;
  }
  const fixture = require('node:child_process').spawnSync(process.execPath, [require('node:path').join(__dirname, 'whatsapp-webhook.cjs')], {stdio:'inherit'});
  if (fixture.status !== 0) throw new Error('WEBHOOK_FIXTURE_FAILED');
  const project = process.env.WHATSAPP_FIRESTORE_PROJECT_ID;
  const email = process.env.WHATSAPP_FIRESTORE_CLIENT_EMAIL;
  const key = process.env.WHATSAPP_FIRESTORE_PRIVATE_KEY;
  if (project !== 'studio-4254367347-1a796' ||
      email !== 'crm-whatsapp@studio-4254367347-1a796.iam.gserviceaccount.com' ||
      !key) throw new Error('CONFIGURATION_MISSING_OR_UNEXPECTED');
  const now = Math.floor(Date.now()/1000);
  const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const claim = encode({alg:'RS256',typ:'JWT'})+'.'+encode({
    iss:email,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+300
  });
  let signature;
  try {
    signature = createSign('RSA-SHA256').update(claim).sign(key.replace(/\\n/g,'\n')).toString('base64url');
  } catch { throw new Error('PRIVATE_KEY_FORMAT_INVALID'); }
  const response = await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:claim+'.'+signature}),
    redirect:'error',signal:AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('GOOGLE_AUTH_HTTP_'+response.status);
  const {access_token} = await response.json();
  if (typeof access_token !== 'string' || !access_token) throw new Error('GOOGLE_AUTH_TOKEN_MISSING');
  console.log('[WhatsApp Firestore] Google authentication OK');
  const url = 'https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/whatsapp-connectivity-check?pageSize=1&mask.fieldPaths=probe';
  const check = await fetch(url,{headers:{Authorization:'Bearer '+access_token},redirect:'error',signal:AbortSignal.timeout(15000)});
  if (!check.ok) throw new Error('FIRESTORE_READ_HTTP_'+check.status);
  console.log('[WhatsApp Firestore] dedicated database read OK');
  // A random ID and create-only semantics ensure no existing records are changed.
  const id = 'preview-probe-'+randomUUID();
  const base = 'https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/whatsapp-connectivity-check';
  const auth = {Authorization:'Bearer '+access_token};
  const create = await fetch(base+'?documentId='+id,{
    method:'POST',headers:{...auth,'Content-Type':'application/json'},
    body:JSON.stringify({fields:{probe:{stringValue:'synthetic-preview-only'}}}),
    redirect:'error',signal:AbortSignal.timeout(15000)
  });
  if (!create.ok) throw new Error('FIRESTORE_CREATE_HTTP_'+create.status);
  try {
    const verify = await fetch(base+'/'+id,{headers:auth,redirect:'error',signal:AbortSignal.timeout(15000)});
    if (!verify.ok) throw new Error('FIRESTORE_VERIFY_HTTP_'+verify.status);
    const doc = await verify.json();
    if (doc.fields?.probe?.stringValue !== 'synthetic-preview-only') throw new Error('FIRESTORE_VERIFY_MISMATCH');
    console.log('[WhatsApp Firestore] synthetic write and read-back OK');
  } finally {
    const remove = await fetch(base+'/'+id,{method:'DELETE',headers:auth,redirect:'error',signal:AbortSignal.timeout(15000)});
    if (!remove.ok) throw new Error('FIRESTORE_CLEANUP_HTTP_'+remove.status);
    console.log('[WhatsApp Firestore] synthetic document cleaned up');
  }
}
main().catch(err=>{
  const code = typeof err?.message === 'string' && /^(WEBHOOK_FIXTURE_FAILED|CONFIGURATION_MISSING_OR_UNEXPECTED|PRIVATE_KEY_FORMAT_INVALID|GOOGLE_AUTH_HTTP_\d{3}|GOOGLE_AUTH_TOKEN_MISSING|FIRESTORE_(READ|CREATE|VERIFY|CLEANUP)_HTTP_\d{3}|FIRESTORE_VERIFY_MISMATCH)$/.test(err.message) ? err.message : 'NETWORK_OR_UNEXPECTED_ERROR';
  console.error('[WhatsApp Firestore] '+code);
  process.exitCode=1;
});
