// Standalone receiver for the CRM's TEST WhatsApp assets.
// Deploy only this directory as a separate public service, never the CRM.
// Configuration is server-only. No message bodies, contacts or secrets are retained.
import { createHmac, createSign, timingSafeEqual } from 'node:crypto';
import {ASO_FORM,SERVICE_INFO,ADDRESS_REPLY,HANDOFF_REPLY,serviceIntent,serviceReply,classifyTestMessage,parseTestAppointment,analyzeNaturalAppointment,defaultKnowledge,validateKnowledge,safeForKnowledge,selectKnowledgeReply} from '../lib/training.mjs';

const project = 'studio-4254367347-1a796';
const account = 'crm-whatsapp@studio-4254367347-1a796.iam.gserviceaccount.com';
const testWaba = '1177893114843156';
const testPhone = '1432881259912328';
const headers = {'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-type':'text/plain; charset=utf-8'};
const reply = (status, body) => new Response(body,{status,headers});
const equal = (a,b) => a.length === b.length && timingSafeEqual(a,b);

async function boundedBody(request) {
  if (!request.body) throw new Error('empty');
  const reader = request.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > 256 * 1024) { await reader.cancel(); throw new Error('large'); }
      chunks.push(Buffer.from(item.value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks,size);
}

// Approved Florêncio Ambiental service information. No submitted form text is stored here.
// Outbound is opt-in, test account only, explicit verified recipient only.
// A marker is claimed before the API call; ambiguous transport errors are not retried.
// Accept display formatting but never accept additional digits or multiple destinations.
function normalizeTestRecipient(value) {
  if(typeof value!=='string') return null;
  const trimmed=value.trim();
  if(!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits=trimmed.replace(/\D/g,'');
  return /^\d{10,15}$/.test(digits)?digits:null;
}
function replyConfig() {
  const token=process.env.WHATSAPP_TEST_ACCESS_TOKEN?.trim();
  const recipient=normalizeTestRecipient(process.env.WHATSAPP_TEST_RECIPIENT_DIGITS);
  const version=process.env.WHATSAPP_TEST_GRAPH_VERSION;
  if (process.env.WHATSAPP_TEST_REPLY_ENABLED!=='true' || !token ||
      !recipient || !/^v\d{1,2}\.\d+$/.test(version??'')) return null;
  return {token,recipient,version};
}
function logReplyEligibility(message,body,config) {
  if(message?.type!=='text') return;
  const rawRecipient=process.env.WHATSAPP_TEST_RECIPIENT_DIGITS??'';
  const recipient=normalizeTestRecipient(rawRecipient)??'';
  const sender=typeof message.from==='string'?message.from:'';
  const epoch=typeof message.timestamp==='string' && /^\d{10}$/.test(message.timestamp)?Number(message.timestamp)*1000:NaN;
  const elapsed=Date.now()-epoch;
  const brazilCanonical=value=>/^55\d{2}9\d{8}$/.test(value)?value.slice(0,4)+value.slice(5):value;
  console.info('[WhatsApp test] reply eligibility '+JSON.stringify({
    enabled:process.env.WHATSAPP_TEST_REPLY_ENABLED==='true',configured:!!config,tokenPresent:!!process.env.WHATSAPP_TEST_ACCESS_TOKEN,
    recipientFormat:!!recipient,recipientRawDigits:/^\d{10,15}$/.test(rawRecipient),versionFormat:/^v\d{1,2}\.\d+$/.test(process.env.WHATSAPP_TEST_GRAPH_VERSION??''),
    senderExact:!!recipient && sender===recipient,
    senderBrazilEquivalent:!!recipient && !!sender && brazilCanonical(sender)===brazilCanonical(recipient),
    timestampWithinWindow:Number.isFinite(elapsed) && elapsed>=0 && elapsed<24*60*60*1000,
    idValid:typeof message.id==='string' && /^wamid\.[A-Za-z0-9_+=/-]{1,300}$/.test(message.id),
    hasReply:typeof body==='string' && !!body
  }));
}
function replyCandidate(message,body,config,now=Date.now()) {
  logReplyEligibility(message,body,config);
  if (!config || typeof body!=='string' || !body || message?.type!=='text' ||
      typeof message.id!=='string' || !/^wamid\.[A-Za-z0-9_+=/-]{1,300}$/.test(message.id) ||
      message.from!==config.recipient || typeof message.timestamp!=='string' ||
      !/^\d{10}$/.test(message.timestamp)) return null;
  const elapsed=now-Number(message.timestamp)*1000;
  if (elapsed<0 || elapsed>=24*60*60*1000) return null;
  return {id:message.id,body};
}
// Per-test-recipient coordination state, not conversation history.
// The document key is an HMAC; never persist a phone, text, or message identifier.
async function routeTestReply(candidate,config,accessToken,secret,systemReplies) {
  const intent=candidate.intent??{};
  const key=createHmac('sha256',secret).update('human-handoff:').update(config.recipient).digest('hex');
  const event=createHmac('sha256',secret).update('human-handoff-event:').update(candidate.id).digest('hex');
  const collection='https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/whatsapp-test-human-handoffs';
  const docUrl=collection+'/'+key;
  const auth={authorization:'Bearer '+accessToken,'content-type':'application/json'};
  for(let attempt=0;attempt<3;attempt++){
    const response=await fetch(docUrl,{headers:auth,redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok && response.status!==404) throw new Error('handoff_read_failed');
    const doc=response.ok?await response.json():null;
    const f=doc?.fields??{};
    const status=f.status?.stringValue;
    if(doc && (f.environment?.stringValue!=='test' || !['endereco_informado','pendente','em_atendimento','resolvido'].includes(status) || typeof doc.updateTime!=='string')) throw new Error('handoff_invalid');
    if(status==='pendente'||status==='em_atendimento'){
      return status==='pendente' && f.lastEventDigest?.stringValue===event?systemReplies.handoffReply:null;
    }
    const last=Date.parse(f.lastAddressAt?.timestampValue??'');
    const withinAddressWindow=status==='endereco_informado' && Number.isFinite(last) && Date.now()-last<24*60*60*1000;
    const repeated=withinAddressWindow && f.lastEventDigest?.stringValue!==event;
    const escalate=intent.human || (intent.address && (repeated || intent.resistance)) || (intent.resistance && withinAddressWindow);
    if(!escalate && !intent.address) return candidate.body;
    if(!escalate && withinAddressWindow && f.lastEventDigest?.stringValue===event) return candidate.body;
    const now=new Date().toISOString();
    const fields={
      environment:{stringValue:'test'},sector:{stringValue:'agendamento'},
      status:{stringValue:escalate?'pendente':'endereco_informado'},
      reason:{stringValue:escalate?(intent.human?'human_requested':'address_insistence'):'address_info'},
      lastEventDigest:{stringValue:event},lastAddressAt:{timestampValue:now},
      createdAt:{timestampValue:now},updatedAt:{timestampValue:now}
    };
    const url=new URL(doc?docUrl:collection);
    if(doc) {
      url.searchParams.set('currentDocument.updateTime',doc.updateTime);
      for(const field of Object.keys(fields)) url.searchParams.append('updateMask.fieldPaths',field);
    } else url.searchParams.set('documentId',key);
    const write=await fetch(url,{method:doc?'PATCH':'POST',headers:auth,body:JSON.stringify({fields}),redirect:'error',signal:AbortSignal.timeout(8000)});
    if([409,412].includes(write.status)) continue;
    if(!write.ok) throw new Error('handoff_write_failed');
    if(escalate) console.info('[WhatsApp test] human handoff queued');
    return escalate?systemReplies.handoffReply:candidate.body;
  }
  throw new Error('handoff_conflict');
}

async function sendTestReply(candidate,config,accessToken,secret) {
  const digest=createHmac('sha256',secret).update('reply:').update(candidate.id).digest('hex');
  const collection='https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/whatsapp-test-reply-attempts';
  const url=new URL(collection);url.searchParams.set('documentId',digest);
  const auth={authorization:'Bearer '+accessToken,'content-type':'application/json'};
  const marker=await fetch(url,{method:'POST',headers:auth,body:JSON.stringify({fields:{
    environment:{stringValue:'test'},state:{stringValue:'claimed'},createdAt:{timestampValue:new Date().toISOString()}
  }}),redirect:'error',signal:AbortSignal.timeout(8000)});
  if (marker.status===409) return;
  if (!marker.ok) throw new Error('reply_claim_failed');
  let state='uncertain';
  try {
    const response=await fetch('https://graph.facebook.com/'+config.version+'/'+testPhone+'/messages',{
      method:'POST',headers:{authorization:'Bearer '+config.token,'content-type':'application/json'},
      body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:config.recipient,type:'text',text:{preview_url:false,body:candidate.body}}),
      redirect:'error',signal:AbortSignal.timeout(8000)
    });
    const result=await response.json();
    const code=Number.isSafeInteger(result?.error?.code)?result.error.code:null;
    if (response.ok && typeof result?.messages?.[0]?.id==='string') state='accepted';
    else state='rejected';
    console.info('[WhatsApp test] automated reply '+state+(code===null?'':' code='+code));
  } catch { console.warn('[WhatsApp test] automated reply outcome uncertain; no automatic retry'); }
  // Only technical outcome. No body, phone, message ID or API response is stored.
  const outcome=new URL(collection+'/'+digest);
  outcome.searchParams.append('updateMask.fieldPaths','state');
  outcome.searchParams.append('updateMask.fieldPaths','updatedAt');
  const saved=await fetch(outcome,{method:'PATCH',headers:auth,body:JSON.stringify({fields:{
    state:{stringValue:state},updatedAt:{timestampValue:new Date().toISOString()}
  }}),redirect:'error',signal:AbortSignal.timeout(8000)});
  if (!saved.ok) console.warn('[WhatsApp test] reply outcome not persisted; no automatic retry');
}
function logTestDelivery(status,config) {
  if (!config || status?.recipient_id!==config.recipient || !['sent','delivered','read','failed'].includes(status.status)) return;
  const code=Number.isSafeInteger(status.errors?.[0]?.code)?status.errors[0].code:null;
  console.info('[WhatsApp test] outbound status '+status.status+(code===null?'':' code='+code));
}

function appointmentId(messageId,secret) {
  const hex = createHmac('sha256',secret).update('appointment:').update(messageId).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

async function saveTestAppointment(input,accessToken,secret) {
  const url=new URL('https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/whatsapp-test-appointment-requests');
  url.searchParams.set('documentId',appointmentId(input.messageId,secret));
  const now=new Date().toISOString();
  const result=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},body:JSON.stringify({fields:{
    company:{stringValue:input.company},examType:{stringValue:input.examType},employeeCount:{integerValue:String(input.employeeCount)},preferredDate:{stringValue:input.preferredDate},status:{stringValue:'pendente'},sector:{stringValue:'agendamento'},environment:{stringValue:'test'},source:{stringValue:'whatsapp_test'},createdAt:{timestampValue:now},lastInteractionAt:{timestampValue:now},updatedAt:{timestampValue:now}
  }}),redirect:'error',signal:AbortSignal.timeout(8000)});
  if (!result.ok && result.status!==409) throw new Error('appointment_storage');
}

async function getFirestoreToken() {
  const key = process.env.WHATSAPP_FIRESTORE_PRIVATE_KEY;
  if (!key) throw new Error('configuration');
  const now = Math.floor(Date.now()/1000);
  const enc = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const claim = enc({alg:'RS256',typ:'JWT'})+'.'+enc({
    iss:account,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+300
  });
  const signature = createSign('RSA-SHA256').update(claim).sign(key.replace(/\\n/g,'\n')).toString('base64url');
  const oauth = await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:claim+'.'+signature}),
    redirect:'error',signal:AbortSignal.timeout(8000)
  });
  if (!oauth.ok) throw new Error('oauth');
  const {access_token} = await oauth.json();
  if (typeof access_token !== 'string' || !access_token) throw new Error('oauth');
  return access_token;
}

async function loadTestKnowledge(accessToken) {
  const url='https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/whatsapp-test-agent-knowledge/published';
  try {
    const response=await fetch(url,{headers:{authorization:'Bearer '+accessToken},redirect:'error',signal:AbortSignal.timeout(8000)});
    if(response.status===404)return defaultKnowledge();
    if(!response.ok)throw Error('knowledge_unavailable');
    const doc=await response.json();
    if(doc?.fields?.environment?.stringValue!=='test')throw Error('knowledge_invalid');
    return validateKnowledge(JSON.parse(doc.fields.knowledgeJson.stringValue));
  } catch {console.warn('[WhatsApp test] knowledge unavailable; using approved built-in defaults');return defaultKnowledge();}
}

async function saveReceipt(raw,messages,statuses,secret,triageCounts,appointments,intakeCounts,access_token) {
  const digest = createHmac('sha256',secret).update('receipt:').update(raw).digest('hex');
  const url = new URL('https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/whatsapp-test-webhook-receipts');
  url.searchParams.set('documentId',digest);
  const result = await fetch(url,{
    method:'POST',headers:{authorization:'Bearer '+access_token,'content-type':'application/json'},
    body:JSON.stringify({fields:{
      messages:{integerValue:String(messages)},statuses:{integerValue:String(statuses)},
      receivedAt:{timestampValue:new Date().toISOString()},environment:{stringValue:'test'},
      triageCounts:{mapValue:{fields:Object.fromEntries(Object.entries(triageCounts).map(([name,count])=>[name,{integerValue:String(count)}]))}},
      appointmentIntakeCounts:{mapValue:{fields:Object.fromEntries(Object.entries(intakeCounts).map(([name,count])=>[name,{integerValue:String(count)}]))}}
    }}),redirect:'error',signal:AbortSignal.timeout(8000)
  });
  if (!result.ok && result.status !== 409) throw new Error('storage');
  for (const appointment of appointments) await saveTestAppointment(appointment,access_token,secret);
  if (appointments.length) console.info('[WhatsApp test] structured appointments confirmed',appointments.length);
  return access_token;
}

// Optional metadata-only forwarding to the approved local test workflow.
// No customer identifier, message body, attachment, or token is written to logs.
async function forwardTestMetadata(messages,statuses) {
  const target = process.env.WHATSAPP_N8N_WEBHOOK_URL;
  if (!target) return;
  const key = process.env.WHATSAPP_N8N_WEBHOOK_TOKEN;
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) throw new Error('invalid_bridge_configuration');
  const url = new URL(target);
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname) ||
      url.pathname !== '/webhook/crm-florencio-whatsapp-teste' ||
      url.port || url.search || url.hash || url.username || url.password)
    throw new Error('invalid_bridge_destination');
  const response = await fetch(url,{
    method:'POST',headers:{'content-type':'application/json','x-florencio-webhook-token':key},
    body:JSON.stringify({environment:'test',messages,statuses}),
    redirect:'error',signal:AbortSignal.timeout(8000)
  });
  if (!response.ok) {console.warn('[WhatsApp test] N8N bridge HTTP '+response.status);throw new Error('workflow_not_confirmed');}
  if ((await response.json())?.status !== 'received_test_only') throw new Error('workflow_not_confirmed');
  console.info('[WhatsApp test] N8N metadata acknowledged');
}

async function handler(request) {
  if (process.env.WHATSAPP_WEBHOOK_TEST_ENABLED !== 'true') return reply(503,'disabled');
  const verify = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const secret = process.env.META_APP_SECRET;
  if (!verify || !secret || !process.env.WHATSAPP_FIRESTORE_PRIVATE_KEY) return reply(503,'unconfigured');
  if (request.method === 'GET') {
    const p = new URL(request.url).searchParams;
    const challenge = p.get('hub.challenge') ?? '';
    if (p.get('hub.mode') !== 'subscribe' ||
        !equal(Buffer.from(p.get('hub.verify_token') ?? ''),Buffer.from(verify)) ||
        !/^\d{1,128}$/.test(challenge)) return reply(403,'forbidden');
    console.info('[WhatsApp test] verification accepted');
    return reply(200,challenge);
  }
  if (request.method !== 'POST') return reply(405,'method_not_allowed');
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  if (!/^sha256=[0-9a-f]{64}$/i.test(signature)) { console.info('[WhatsApp test] rejected signature format'); return reply(403,'forbidden'); }
  let raw;
  try { raw = await boundedBody(request); } catch { return reply(413,'invalid_request'); }
  const expected = createHmac('sha256',secret).update(raw).digest();
  if (!equal(expected,Buffer.from(signature.slice(7),'hex'))) { console.info('[WhatsApp test] rejected signature'); return reply(403,'forbidden'); }
  console.info('[WhatsApp test] signed notification received');
  let payload;
  try { payload = JSON.parse(raw.toString('utf8')); } catch { return reply(400,'invalid_request'); }
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return reply(400,'invalid_request');
  let messages=0,statuses=0;
  const testChanges=[];
  for(const entry of payload.entry){
    if(entry?.id!==testWaba||!Array.isArray(entry.changes))continue;
    for(const change of entry.changes)if(change?.field==='messages'&&change.value?.metadata?.phone_number_id===testPhone)testChanges.push(change);
  }
  if(!testChanges.some(change=>(Array.isArray(change.value.messages)&&change.value.messages.length)||(Array.isArray(change.value.statuses)&&change.value.statuses.length)))return reply(200,'ignored');
  let accessToken,knowledge;
  try{accessToken=await getFirestoreToken();knowledge=testChanges.some(c=>Array.isArray(c.value.messages)&&c.value.messages.length)?await loadTestKnowledge(accessToken):defaultKnowledge();}
  catch{console.error('[WhatsApp test] receipt storage failed');return reply(503,'retry');}
  const triageCounts = Object.create(null);
  const appointments=[];
  const replies=[];
  const outbound=replyConfig();
  const intakeCounts=Object.create(null);
  const countIntake = key => {intakeCounts[key]=(intakeCounts[key]??0)+1;};
  for (const change of testChanges) {
      if (Array.isArray(change.value.messages)) {
        for (const message of change.value.messages) {
          messages++;
          const category = classifyTestMessage(message);
          const appointment=parseTestAppointment(message);
          if (appointment) {
            triageCounts[category]=(triageCounts[category]??0)+1;
            appointments.push(appointment);
            const candidate=replyCandidate(message,'Recebemos sua solicitação de agendamento de teste. A equipe irá analisar a disponibilidade.',outbound);
            if (candidate) replies.push(candidate);
          } else {
            const intent=serviceIntent(message);
            const formSubmission=message?.type==='text' && typeof message.text?.body==='string' &&
              /\bcpf\s*:/i.test(message.text.body) && /\brg\s*:/i.test(message.text.body);
            const intake=formSubmission || intent.human || intent.address || intent.resistance || (intent.info && !intent.aso) ? null : analyzeNaturalAppointment(message,category);
            if (intake?.appointment) {
              appointments.push(intake.appointment);
              countIntake('complete');
            } else if (intake?.missing.length) {
              countIntake('incomplete');
              for (const field of intake.missing) countIntake('missing_'+field);
            }
            const selected=selectKnowledgeReply(message,knowledge,(intake?.appointment || intake?.missing.length ? intake.draftReply : null));
            triageCounts[selected.sector]=(triageCounts[selected.sector]??0)+1;
            const body=selected.body;
            const candidate=replyCandidate(message,body ?? (intent.resistance?'__handoff_check__':null),outbound);
            if (candidate) replies.push({...candidate,body,intent});
          }
        }
      }
      if (Array.isArray(change.value.statuses)) {
        statuses+=change.value.statuses.length;
        for (const status of change.value.statuses) logTestDelivery(status,outbound);
      }
  }
  if (!messages && !statuses) { console.info('[WhatsApp test] signed notification outside test assets or empty, ignored'); return reply(200,'ignored'); }
  try { await saveReceipt(raw,messages,statuses,secret,triageCounts,appointments,intakeCounts,accessToken); console.info('[WhatsApp test] receipt stored');
    if (messages) console.info('[WhatsApp test] preliminary categories '+JSON.stringify(triageCounts)); }
  catch { console.error('[WhatsApp test] receipt storage failed'); return reply(503,'retry'); }
  // At most one API attempt per incoming message. Keep receipt/appointment independent.
  for (const candidate of replies) {
    try {const body=await routeTestReply(candidate,outbound,accessToken,secret,knowledge.systemReplies);if(body)await sendTestReply({...candidate,body},outbound,accessToken,secret);}
    catch {console.warn('[WhatsApp test] reply attempt not confirmed; no automatic retry');}
  }
  // Test workflow only acknowledges metadata. Do not cause Meta retries when
  // the temporary local tunnel is offline; receipts remain available.
  try { await forwardTestMetadata(messages,statuses); }
  catch { console.warn('[WhatsApp test] N8N metadata delivery not confirmed'); }
  return reply(200,'ok');
}
export {analyzeNaturalAppointment,replyCandidate,serviceIntent,serviceReply,ASO_FORM,SERVICE_INFO,ADDRESS_REPLY,HANDOFF_REPLY,normalizeTestRecipient};
export default {fetch:handler};
