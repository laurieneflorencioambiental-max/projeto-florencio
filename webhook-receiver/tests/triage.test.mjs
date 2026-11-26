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
let saved, forwarded; const appointments=new Map();
globalThis.fetch=async(url,opts)=>{
  const u=String(url);
  if(u.startsWith('https://oauth2.googleapis.com/')) return Response.json({access_token:'fixture'});
  if(u.startsWith('https://firestore.googleapis.com/')) {
    if(u.includes('/whatsapp-test-appointment-requests?')) {const id=new URL(u).searchParams.get('documentId'); if(appointments.has(id)) return new Response('',{status:409});appointments.set(id,JSON.parse(opts.body));return Response.json({});}
    saved=JSON.parse(opts.body);return Response.json({});
  }
  if(u.startsWith('https://fixture.trycloudflare.com/')) {forwarded=JSON.parse(opts.body);return Response.json({status:'received_test_only'});}
  throw new Error('unexpected destination');
};
const examples=['Quero agendar um exame admissional','Preciso da segunda via do ASO','Preciso de boleto','Preciso de orçamento','Olá!','Preciso de orientação sobre PGR e LTCAT','Dúvida sobre eSocial','Quero agendar e pagar o boleto','Estou com dor urgente','Texto sem categoria'];
const messages=examples.map(body=>({type:'text',text:{body}}));
messages.push({type:'image',image:{id:'mock'}});
const payload={object:'whatsapp_business_account',entry:[{id:'1177893114843156',changes:[{field:'messages',value:{metadata:{phone_number_id:'1432881259912328'},messages}}]}]};
const raw=JSON.stringify(payload);
const signature='sha256='+createHmac('sha256','fixture-secret').update(raw).digest('hex');
const response=await receiver.fetch(new Request('https://example.test/api/webhook',{method:'POST',headers:{'x-hub-signature-256':signature},body:raw}));
assert.equal(response.status,200);
assert.deepEqual(saved.fields.triageCounts.mapValue.fields,{
 agendamento:{integerValue:'1'},documentos:{integerValue:'1'},financeiro:{integerValue:'1'},comercial:{integerValue:'1'},central_relacionamento:{integerValue:'5'},area_tecnica:{integerValue:'2'}
});
assert.deepEqual(forwarded,{environment:'test',messages:11,statuses:0});
for (const sample of examples) assert(!JSON.stringify(saved).includes(sample));
console.log('PASS: categories, ambiguity, non-text, no body persistence, unchanged N8N forwarding');

const sample='AGENDAMENTO TESTE | Empresa Exemplo | ADMISSIONAL | 2 | 30/11/2026';
const sampleMessages=[{id:'wamid.fixture-1',from:'TEST-SENDER',type:'text',text:{body:sample}},{id:'wamid.fixture-2',type:'text',text:{body:sample.replace('30/11','31/11')}},{id:'wamid.fixture-3',type:'text',text:{body:sample.replace('Empresa Exemplo','Dado pessoal qualquer')}}];
const signed=(phone)=>{const p={object:'whatsapp_business_account',entry:[{id:'1177893114843156',changes:[{field:'messages',value:{metadata:{phone_number_id:phone},messages:sampleMessages}}]}]};const b=JSON.stringify(p);return new Request('https://example.test/api/webhook',{method:'POST',headers:{'x-hub-signature-256':'sha256='+createHmac('sha256','fixture-secret').update(b).digest('hex')},body:b});};
assert.equal((await receiver.fetch(signed('wrong-phone'))).status,200);assert.equal(appointments.size,0);
assert.equal((await receiver.fetch(signed('1432881259912328'))).status,200);assert.equal(appointments.size,1);
assert.equal((await receiver.fetch(signed('1432881259912328'))).status,200);assert.equal(appointments.size,1);
const [id,doc]=[...appointments.entries()][0];assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);assert.equal(doc.fields.company.stringValue,'Empresa Exemplo');assert.equal(doc.fields.employeeCount.integerValue,'2');assert.equal(doc.fields.preferredDate.stringValue,'2026-11-30');assert.equal(doc.fields.status.stringValue,'pendente');assert.equal(doc.fields.source.stringValue,'whatsapp_test');
for(const value of [sample,'wamid.fixture-1','TEST-SENDER','Dado pessoal qualquer'])assert(!JSON.stringify(doc).includes(value));
console.log('PASS: isolated test asset, strict structured appointment, duplicates, invalid dates and no sender or raw message storage');
