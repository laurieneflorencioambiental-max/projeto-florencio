// Standalone receiver for the CRM's TEST WhatsApp assets.
// Deploy only this directory as a separate public service, never the CRM.
// Configuration is server-only. No message bodies, contacts or secrets are retained.
import { createHmac, createSign, timingSafeEqual } from 'node:crypto';

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

// Preliminary, deterministic categories. Not a clinical assessment or an automatic reply.
// Unknown, ambiguous, non-text and health-related requests go to human review.
function classifyTestMessage(message) {
  if (message?.type !== 'text' || typeof message.text?.body !== 'string') return 'central_relacionamento';
  const t = message.text.body.slice(0,4000).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (/\b(urgente|emergencia|acidente|dor|sintomas?|diagnostico|medicamento|inapto|resultado clinico)\b/.test(t)) return 'central_relacionamento';
  const rules = [
    ['agendamento', /\b(agend\w*|remarc\w*|marcar|horario|vaga|consulta|admissiona(?:l|is)|demissiona(?:l|is)|periodic[oa]s?|retorno ao trabalho|mudanca (?:de|do) risco)\b/],
    ['documentos', /\b(aso|documentos?|certificados?|laudos?|segunda via)\b/],
    ['area_tecnica', /\b(pgr|pcmso|ltcat|ppra|esocial|e-social|sst|treinamentos?|normas? regulamentadoras?|nr[- ]?\d{1,2})\b/],
    ['financeiro', /\b(boleto|pix|pagamento|fatura|nota fiscal|cobranca|vencimento|comprovante)\b/],
    ['comercial', /\b(orcamento|cotacao|proposta|contrato|plano|preco|valor|contratacao)\b/],
  ];
  const matches=rules.filter(([,pattern])=>pattern.test(t));
  if (matches.length===1) return matches[0][0];
  return 'central_relacionamento';
}

// Strict synthetic test format; never store arbitrary free text or a sender identifier.
function parseTestAppointment(message) {
  if (message?.type !== 'text' || typeof message.text?.body !== 'string' || typeof message.id !== 'string' || !/^wamid\.[A-Za-z0-9_+=/-]{1,300}$/.test(message.id)) return null;
  const match = /^AGENDAMENTO TESTE \| Empresa Exemplo \| (ADMISSIONAL|DEMISSIONAL|PERIODICO|RETORNO_AO_TRABALHO|MUDANCA_DE_RISCO|OUTRO) \| ([1-9]\d{0,2}|1000) \| (\d{2})\/(\d{2})\/(\d{4})$/.exec(message.text.body.trim());
  if (!match) return null;
  const date = `${match[5]}-${match[4]}-${match[3]}`;
  const parsed = new Date(date+'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==date) return null;
  return {messageId:message.id,company:'Empresa Exemplo',examType:match[1].toLowerCase(),employeeCount:Number(match[2]),preferredDate:date};
}

// Natural-language test intake. Only the fictitious company is accepted.
// Never persist the original message, sender, inferred names or medical details.
const missingLabels = {company:'empresa de teste (Empresa Exemplo)',examType:'tipo de exame',employeeCount:'quantidade de funcionários',preferredDate:'data desejada'};
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const numberWords = {um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
function localDay(timestamp) {
  // Meta sends Unix seconds; use the message date, not the delivery/retry date.
  if (typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp)) return null;
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Number(timestamp)*1000));
  const part = name => parts.find(p=>p.type===name)?.value;
  return new Date(part('year')+'-'+part('month')+'-'+part('day')+'T00:00:00Z');
}
function validDate(year,month,day) {
  const value = String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  const d=new Date(value+'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value ? value : null;
}
function preferredDate(text,timestamp) {
  const base=localDay(timestamp);
  const candidates = [];
  // Require an explicit year on numeric dates to avoid guessing.
  for (const match of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) candidates.push(validDate(match[3],match[2],match[1]));
  for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) candidates.push(validDate(match[1],match[2],match[3]));
  const relative=[...text.matchAll(/\b(hoje|amanha|segunda(?:-feira| feira)?|terca(?:-feira| feira)?|quarta(?:-feira| feira)?|quinta(?:-feira| feira)?|sexta(?:-feira| feira)?|sabado|domingo)\b/g)];
  for (const match of relative) {
    if (!base) {candidates.push(null);continue;}
    const value=match[1].split(/[- ]/)[0];
    const days={domingo:0,segunda:1,terca:2,quarta:3,quinta:4,sexta:5,sabado:6};
    const offset=value==='hoje'?0:value==='amanha'?1:(days[value]-base.getUTCDay()+7)%7 || 7;
    const date=new Date(base);date.setUTCDate(date.getUTCDate()+offset);
    candidates.push(date.toISOString().slice(0,10));
  }
  const unique=[...new Set(candidates)];
  if (unique.length!==1 || !unique[0] || (base && unique[0]<base.toISOString().slice(0,10))) return null;
  return unique[0];
}
function analyzeNaturalAppointment(message,category) {
  if (category!=='agendamento' || message?.type!=='text' || typeof message.text?.body!=='string') return null;
  const t=normalize(message.text.body.trim());
  if (!t || t.length>4000 || t.startsWith('agendamento teste |') ||
      !/\b(agend\w*|marcar|solicit\w*|preciso|gostaria|quero)\b/.test(t) ||
      /\b(cancel\w*|remarc\w*|desmarc\w*|nao|sem|talvez|adiar|duvida|sobre|confirmar)\b/.test(t)) return null;
  const examPatterns=[
    ['admissional',/\badmissiona(?:l|is)\b/],['demissional',/\bdemissiona(?:l|is)\b/],
    ['periodico',/\bperiodic[oa]s?\b/],['retorno_ao_trabalho',/\bretorno ao trabalho\b/],
    ['mudanca_de_risco',/\bmudanca (?:de|do) risco\b/]
  ];
  const exams=examPatterns.filter(([,p])=>p.test(t));
  const quantities=[...t.matchAll(/\b(\d{1,4}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+(?:exames?|funcionari[oa]s?|colaborador(?:es|as)?|pessoas?)\b/g)].map(m=>numberWords[m[1]]??Number(m[1]));
  const uniqueCounts=[...new Set(quantities)];
  const company=/\bempresa exemplo\b/.test(t)?'Empresa Exemplo':null;
  const examType=exams.length===1?exams[0][0]:null;
  const employeeCount=uniqueCounts.length===1 && uniqueCounts[0]>=1 && uniqueCounts[0]<=1000?uniqueCounts[0]:null;
  const date=preferredDate(t,message.timestamp);
  const input={company,examType,employeeCount,preferredDate:date};
  const missing=Object.keys(input).filter(k=>input[k]===null);
  const validId=typeof message.id==='string' && /^wamid\.[A-Za-z0-9_+=/-]{1,300}$/.test(message.id);
  return {missing,appointment:missing.length===0 && validId?{messageId:message.id,...input}:null,
    draftReply:missing.length?'Para encaminhar seu agendamento de teste, informe: '+missing.map(k=>missingLabels[k]).join(', ')+'.':'Recebemos sua solicitação de agendamento de teste. A equipe irá analisar a disponibilidade.'};
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

async function saveReceipt(raw, messages, statuses, secret, triageCounts, appointments, intakeCounts) {
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
  if (!response.ok || (await response.json())?.status !== 'received_test_only')
    throw new Error('workflow_not_confirmed');
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
  const triageCounts = Object.create(null);
  const appointments=[];
  const intakeCounts=Object.create(null);
  const countIntake = key => {intakeCounts[key]=(intakeCounts[key]??0)+1;};
  for (const entry of payload.entry) {
    if (entry?.id !== testWaba || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (change?.field !== 'messages' || change.value?.metadata?.phone_number_id !== testPhone) continue;
      if (Array.isArray(change.value.messages)) {
        for (const message of change.value.messages) {
          messages++;
          const category = classifyTestMessage(message);
          triageCounts[category] = (triageCounts[category] ?? 0) + 1;
          const appointment=parseTestAppointment(message);
          if (appointment) appointments.push(appointment);
          else {
            const intake=analyzeNaturalAppointment(message,category);
            if (intake?.appointment) {
              appointments.push(intake.appointment);
              countIntake('complete');
            } else if (intake?.missing.length) {
              countIntake('incomplete');
              for (const field of intake.missing) countIntake('missing_'+field);
            }
            // Draft replies are intentionally not sent, logged or persisted.
          }
        }
      }
      statuses += Array.isArray(change.value.statuses) ? change.value.statuses.length : 0;
    }
  }
  if (!messages && !statuses) { console.info('[WhatsApp test] signed notification outside test assets or empty, ignored'); return reply(200,'ignored'); }
  try { await saveReceipt(raw,messages,statuses,secret,triageCounts,appointments,intakeCounts); console.info('[WhatsApp test] receipt stored');
    if (messages) console.info('[WhatsApp test] preliminary categories '+JSON.stringify(triageCounts)); }
  catch { console.error('[WhatsApp test] receipt storage failed'); return reply(503,'retry'); }
  // Test workflow only acknowledges metadata. Do not cause Meta retries when
  // the temporary local tunnel is offline; receipts remain available.
  try { await forwardTestMetadata(messages,statuses); }
  catch { console.warn('[WhatsApp test] N8N metadata delivery not confirmed'); }
  return reply(200,'ok');
}
export {analyzeNaturalAppointment};
export default {fetch:handler};
