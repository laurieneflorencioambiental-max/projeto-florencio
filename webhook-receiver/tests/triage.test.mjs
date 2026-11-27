// Offline test of the actual receiver; all network calls are mocked.
import assert from 'node:assert/strict';
import {createHmac,generateKeyPairSync} from 'node:crypto';
import receiver, {analyzeNaturalAppointment,replyCandidate} from '../api/webhook.mjs';
const key = generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'});
Object.assign(process.env,{
 WHATSAPP_WEBHOOK_TEST_ENABLED:'true',WHATSAPP_WEBHOOK_VERIFY_TOKEN:'fixture',
 META_APP_SECRET:'fixture-secret',WHATSAPP_FIRESTORE_PRIVATE_KEY:key,
 WHATSAPP_N8N_WEBHOOK_URL:'https://fixture.trycloudflare.com/webhook/crm-florencio-whatsapp-teste',
 WHATSAPP_N8N_WEBHOOK_TOKEN:'a'.repeat(64)
});
let saved, forwarded; const appointments=new Map(); const attempts=new Map(); const sends=[]; let graphOutcome='accepted';
globalThis.fetch=async(url,opts)=>{
  const u=String(url);
  if(u.startsWith('https://oauth2.googleapis.com/')) return Response.json({access_token:'fixture'});
  if(u.startsWith('https://graph.facebook.com/')) {
    assert.equal(u,'https://graph.facebook.com/v27.0/1432881259912328/messages');
    sends.push(JSON.parse(opts.body));
    if(graphOutcome==='uncertain') throw new Error('mock timeout');
    if(graphOutcome==='rejected') return Response.json({error:{code:130497}},{status:400});
    return Response.json({messages:[{id:'wamid.outbound.mock'}]});
  }
  if(u.startsWith('https://firestore.googleapis.com/')) {
    if(u.includes('/whatsapp-test-reply-attempts')) {
      const target=new URL(u); const id=opts.method==='POST'?target.searchParams.get('documentId'):target.pathname.split('/').pop();
      if(opts.method==='POST') {if(attempts.has(id))return new Response('',{status:409});attempts.set(id,JSON.parse(opts.body));return Response.json({});}
      attempts.set(id,{fields:{...attempts.get(id).fields,...JSON.parse(opts.body).fields}});return Response.json({});
    }
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


const timestamp=String(Date.parse('2026-11-27T15:00:00Z')/1000);
const natural=(body,id='wamid.natural-1')=>({id,from:'SYNTHETIC-SENDER',timestamp,type:'text',text:{body}});
const full='Olá! Gostaria de agendar dois exames admissionais para segunda-feira para a Empresa Exemplo.';
assert.deepEqual(analyzeNaturalAppointment(natural(full),'agendamento').appointment,{
 messageId:'wamid.natural-1',company:'Empresa Exemplo',examType:'admissional',employeeCount:2,preferredDate:'2026-11-30'
});
assert.deepEqual(analyzeNaturalAppointment(natural('Quero agendar dois exames admissionais para segunda-feira.'),'agendamento').missing,['company']);
assert.deepEqual(analyzeNaturalAppointment(natural('Quero agendar para Empresa Exemplo.'),'agendamento').missing,['examType','employeeCount','preferredDate']);
assert.equal(analyzeNaturalAppointment(natural('Quero remarcar dois exames admissionais da Empresa Exemplo para amanhã.'),'agendamento'),null);
assert.equal(analyzeNaturalAppointment(natural('Quero agendar dois exames admissionais para amanhã da Empresa Exemplo.'),'central_relacionamento'),null);
assert.equal(analyzeNaturalAppointment(natural('Quero agendar dois exames admissionais para 31/11/2026 da Empresa Exemplo.'),'agendamento').appointment,null);
assert.equal(analyzeNaturalAppointment(natural('Quero agendar dois exames admissionais e demissionais para 30/11/2026 da Empresa Exemplo.'),'agendamento').appointment,null);
assert.equal(analyzeNaturalAppointment(natural('Quero agendar dois exames admissionais para 30/11/2026 ou 01/12/2026 da Empresa Exemplo.'),'agendamento').appointment,null);
assert.equal(analyzeNaturalAppointment(natural('Quero agendar dois exames admissionais para amanhã da Empresa Outra.'),'agendamento').appointment,null);
assert.match(analyzeNaturalAppointment(natural('Quero agendar dois exames admissionais para segunda-feira.'),'agendamento').draftReply,/empresa de teste/);
const naturalMessages=[natural(full),natural('Quero agendar dois exames admissionais para segunda-feira.','wamid.natural-2'),natural('Quero agendar para Empresa Exemplo.','wamid.natural-3')];
const naturalSigned=()=>{const p={object:'whatsapp_business_account',entry:[{id:'1177893114843156',changes:[{field:'messages',value:{metadata:{phone_number_id:'1432881259912328'},messages:naturalMessages}}]}]};const b=JSON.stringify(p);return new Request('https://example.test/api/webhook',{method:'POST',headers:{'x-hub-signature-256':'sha256='+createHmac('sha256','fixture-secret').update(b).digest('hex')},body:b});};
assert.equal((await receiver.fetch(naturalSigned())).status,200);
assert.equal(appointments.size,2);
assert.deepEqual(saved.fields.appointmentIntakeCounts.mapValue.fields,{complete:{integerValue:'1'},incomplete:{integerValue:'2'},missing_company:{integerValue:'1'},missing_examType:{integerValue:'1'},missing_employeeCount:{integerValue:'1'},missing_preferredDate:{integerValue:'1'}});
assert.deepEqual(forwarded,{environment:'test',messages:3,statuses:0});
assert.equal((await receiver.fetch(naturalSigned())).status,200);
assert.equal(appointments.size,2);
for(const value of [full,'SYNTHETIC-SENDER','wamid.natural-1','Para encaminhar seu agendamento de teste']) {
 assert(!JSON.stringify(saved).includes(value));assert(!JSON.stringify([...appointments.values()]).includes(value));
}
console.log('PASS: natural-language intake, missing fields, date/intent ambiguity, privacy, duplicate delivery and no outbound replies');


const allowed='5511999990000';
const now=String(Math.floor(Date.now()/1000));
const draftBody='Recebemos sua solicitação';
const fixtureConfig={recipient:allowed};
const current=body=>({type:'text',id:'wamid.reply-1',from:allowed,timestamp:now,text:{body}});
assert.equal(replyCandidate(current('test'),draftBody,null),null);
assert.equal(replyCandidate({...current('test'),from:'5511999990001'},draftBody,fixtureConfig),null);
assert.equal(replyCandidate({...current('test'),timestamp:String(Number(now)-86400)},draftBody,fixtureConfig),null);
assert.equal(replyCandidate({...current('test'),timestamp:String(Number(now)+60)},draftBody,fixtureConfig),null);
assert.equal(replyCandidate({...current('test'),type:'image'},draftBody,fixtureConfig),null);
assert.equal(replyCandidate({...current('test'),id:'invalid'},draftBody,fixtureConfig),null);
assert.deepEqual(replyCandidate(current('test'),draftBody,fixtureConfig),{id:'wamid.reply-1',body:draftBody});
const replySigned=(msg,phone='1432881259912328')=>{const p={object:'whatsapp_business_account',entry:[{id:'1177893114843156',changes:[{field:'messages',value:{metadata:{phone_number_id:phone},messages:[msg]}}]}]};const b=JSON.stringify(p);return new Request('https://example.test/api/webhook',{method:'POST',headers:{'x-hub-signature-256':'sha256='+createHmac('sha256','fixture-secret').update(b).digest('hex')},body:b});};
const request= current('Gostaria de agendar dois exames admissionais para amanhã para a Empresa Exemplo.');
assert.equal((await receiver.fetch(replySigned(request))).status,200);assert.equal(sends.length,0);
Object.assign(process.env,{WHATSAPP_TEST_REPLY_ENABLED:'true',WHATSAPP_TEST_ACCESS_TOKEN:'fixture-graph-token',WHATSAPP_TEST_RECIPIENT_DIGITS:allowed,WHATSAPP_TEST_GRAPH_VERSION:'v27.0'});
assert.equal((await receiver.fetch(replySigned(request,'other-phone'))).status,200);assert.equal(sends.length,0);
assert.equal((await receiver.fetch(replySigned({...request,from:'5511999990001'}))).status,200);assert.equal(sends.length,0);
assert.equal((await receiver.fetch(replySigned({...request,timestamp:String(Number(now)-86400)}))).status,200);assert.equal(sends.length,0);
assert.equal((await receiver.fetch(replySigned(request))).status,200);assert.equal(sends.length,1);
assert.equal(sends[0].to,allowed);assert.equal(sends[0].type,'text');assert.match(sends[0].text.body,/analisar a disponibilidade/);
assert.equal((await receiver.fetch(replySigned(request))).status,200);assert.equal(sends.length,1);
const incomplete={...current('Gostaria de agendar dois exames admissionais para amanhã.'),id:'wamid.reply-2'};
assert.equal((await receiver.fetch(replySigned(incomplete))).status,200);assert.equal(sends.length,2);
assert.match(sends[1].text.body,/empresa de teste/);assert.match(sends[1].text.body,/reenvie o pedido completo/);
const unsafe={...current('Quero agendar e estou com dor urgente.'),id:'wamid.reply-urgent'};
assert.equal((await receiver.fetch(replySigned(unsafe))).status,200);assert.equal(sends.length,2);
graphOutcome='rejected';const rejected={...incomplete,id:'wamid.reply-3'};
assert.equal((await receiver.fetch(replySigned(rejected))).status,200);assert.equal(sends.length,3);
assert.equal((await receiver.fetch(replySigned(rejected))).status,200);assert.equal(sends.length,3);
graphOutcome='uncertain';const uncertain={...incomplete,id:'wamid.reply-4'};
assert.equal((await receiver.fetch(replySigned(uncertain))).status,200);assert.equal(sends.length,4);
assert.equal((await receiver.fetch(replySigned(uncertain))).status,200);assert.equal(sends.length,4);
assert.deepEqual([...attempts.values()].map(x=>x.fields.state.stringValue),['accepted','accepted','rejected','uncertain']);
const serialized=JSON.stringify([...attempts.entries()]);
for(const value of [allowed,'wamid.reply-1','fixture-graph-token',sends[0].text.body])assert(!serialized.includes(value));
console.log('PASS: opt-in outbound, authorized test number, 24h gate, duplicate prevention, missing data response, failures and privacy');
