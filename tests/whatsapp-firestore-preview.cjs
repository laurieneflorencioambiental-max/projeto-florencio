// Read-only integration smoke test. Runs only on the dedicated Vercel preview.
const {createSign} = require('node:crypto');

async function main() {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_GIT_COMMIT_REF !== 'feat/whatsapp-embedded-signup') {
    console.log('[WhatsApp Firestore] skipped outside dedicated preview');
    return;
  }
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
  console.log('[WhatsApp Firestore] dedicated database read OK (no data written)');
}
main().catch(err=>{
  const code = typeof err?.message === 'string' && /^(CONFIGURATION_MISSING_OR_UNEXPECTED|PRIVATE_KEY_FORMAT_INVALID|GOOGLE_AUTH_HTTP_\d{3}|GOOGLE_AUTH_TOKEN_MISSING|FIRESTORE_READ_HTTP_\d{3})$/.test(err.message) ? err.message : 'NETWORK_OR_UNEXPECTED_ERROR';
  console.error('[WhatsApp Firestore] '+code);
  process.exitCode=1;
});
