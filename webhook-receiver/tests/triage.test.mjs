// Offline test of the actual receiver; all network calls are mocked.
import assert from 'node:assert/strict';
import {createHmac,generateKeyPairSync} from 'node:crypto';
import receiver from '../api/webhook.mjs';
const key = generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'});
Object.assign(process.env,{
 WHATSAPP_WEBHOOK_TEST_ENABLED:'true',WHATSAPP_WEBHOOK_VERIFY_TOKEN:'fixture',
 META_APP_SECRET:'fixture-secret',WHATSAPP_FIRESTORE_PRIVATE_KEY:key,
 WHATSAPP_N8N_WEBHOOK_URL:'https://fixture.trycloudflare.com/webhook/crm-florencio-whatsapp-teste',
 WHATSAPP_N8N_WEBHOOK_TOKEN:'a'.repeat(64)
});
let saved, forwarded;
globalThis.fetch=async(url,opts)=>{
  const u=String(url);
  if(u.startsWith('https://oauth2.googleapis.com/')) return Response.json({access_token:'fixture'});
  if(u.startsWith('https://firestore.googleapis.com/')) {saved=JSON.parse(opts.body);return Response.json({});}
  if(u.startsWith('https://fixture.trycloudflare.com/')) {forwarded=JSON.parse(opts.body);return Response.json({status:'received_test_only'});}
  throw new Error('unexpected destination');
};
const examples=['Quero agendar um exame admissional','Preciso da segunda via do ASO','Preciso de boleto','Preciso de orçamento','Olá!','Quero agendar e pagar o boleto','Estou com dor urgente','Texto sem categoria'];
const messages=examples.map(body=>({type:'text',text:{body}}));
messages.push({type:'image',image:{id:'mock'}});
const payload={object:'whatsapp_business_account',entry:[{id:'1177893114843156',changes:[{field:'messages',value:{metadata:{phone_number_id:'1432881259912328'},messages}}]}]};
const raw=JSON.stringify(payload);
const signature='sha256='+createHmac('sha256','fixture-secret').update(raw).digest('hex');
const response=await receiver.fetch(new Request('https://example.test/api/webhook',{method:'POST',headers:{'x-hub-signature-256':signature},body:raw}));
assert.equal(response.status,200);
assert.deepEqual(saved.fields.triageCounts.mapValue.fields,{
 agendamento:{integerValue:'1'},documentos:{integerValue:'1'},financeiro:{integerValue:'1'},comercial:{integerValue:'1'},recepcao:{integerValue:'1'},triagem_manual:{integerValue:'4'}
});
assert.deepEqual(forwarded,{environment:'test',messages:9,statuses:0});
for (const sample of examples) assert(!JSON.stringify(saved).includes(sample));
console.log('PASS: categories, ambiguity, non-text, no body persistence, unchanged N8N forwarding');
