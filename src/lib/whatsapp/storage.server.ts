import 'server-only';
import { createSign } from 'node:crypto';
import { sealBusinessToken } from './token-vault.server';
import { parseAppointmentInput, parseAppointmentStatus, type Appointment, type AppointmentInput, type AppointmentStatus } from './appointment-intake';

function config() {
  const project = process.env.WHATSAPP_FIRESTORE_PROJECT_ID;
  const email = process.env.WHATSAPP_FIRESTORE_CLIENT_EMAIL;
  const key = process.env.WHATSAPP_FIRESTORE_PRIVATE_KEY;
  if (!project || !/^[a-z][a-z0-9-]{4,62}$/.test(project) || !email || !key)
    throw new Error('WHATSAPP_STORAGE_CONFIGURATION_MISSING');
  return { project, email, key: key.replace(/\\n/g, '\n') };
}

async function accessToken(request: typeof fetch, cfg: ReturnType<typeof config>) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claim = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({
    iss: cfg.email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 300,
  });
  const signature = createSign('RSA-SHA256').update(claim).sign(cfg.key).toString('base64url');
  const response = await request('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: claim + '.' + signature }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('WHATSAPP_STORAGE_AUTH_FAILED');
  const json = await response.json();
  if (typeof json.access_token !== 'string' || !json.access_token) throw new Error('WHATSAPP_STORAGE_AUTH_FAILED');
  return json.access_token as string;
}

export async function persistPendingWhatsAppConnection(input: {
  accountId: string; phoneNumberId: string; administratorUid: string; businessToken: string;
}, request: typeof fetch = fetch): Promise<void> {
  if (!/^\d+$/.test(input.accountId) || !/^\d+$/.test(input.phoneNumberId) || !input.administratorUid)
    throw new Error('WHATSAPP_STORAGE_INPUT_INVALID');
  const cfg = config();
  const sealed = sealBusinessToken(input.businessToken, input.accountId);
  try {
    const token = await accessToken(request, cfg);
    const url = new URL('https://firestore.googleapis.com/v1/projects/' + cfg.project + '/databases/crm-whatsapp/documents/whatsapp-private-connections');
    url.searchParams.set('documentId', input.accountId);
    const response = await request(url, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        accountId: { stringValue: input.accountId },
        phoneNumberId: { stringValue: input.phoneNumberId },
        administratorUid: { stringValue: input.administratorUid },
        tokenCiphertext: { stringValue: sealed },
        status: { stringValue: 'pending_activation' },
        createdAt: { timestampValue: new Date().toISOString() },
      }}),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('WHATSAPP_STORAGE_WRITE_FAILED');
  } catch { throw new Error('WHATSAPP_STORAGE_UNAVAILABLE'); }
}

/** Create a one-time marker atomically. Existing markers are rejected. */
export async function consumeSignupSession(nonce: string, uid: string, request: typeof fetch = fetch): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(nonce) || !uid) throw new Error('SIGNUP_SESSION_INVALID');
  const cfg = config();
  const token = await accessToken(request, cfg);
  const url = new URL('https://firestore.googleapis.com/v1/projects/' + cfg.project + '/databases/crm-whatsapp/documents/whatsapp-private-sessions');
  url.searchParams.set('documentId', nonce);
  const response = await request(url, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { uid: { stringValue: uid }, consumedAt: { timestampValue: new Date().toISOString() } } }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('SIGNUP_SESSION_UNAVAILABLE_OR_USED');
}

/** Store only aggregate test metadata, never message content or sender details. */
export async function persistTestWebhookReceipt(input: {
  digest: string; messages: number; statuses: number;
}, request: typeof fetch = fetch): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(input.digest) ||
      !Number.isSafeInteger(input.messages) || input.messages < 0 ||
      !Number.isSafeInteger(input.statuses) || input.statuses < 0)
    throw new Error('WHATSAPP_RECEIPT_INVALID');
  const cfg = config();
  const token = await accessToken(request, cfg);
  const url = new URL('https://firestore.googleapis.com/v1/projects/' + cfg.project + '/databases/crm-whatsapp/documents/whatsapp-test-webhook-receipts');
  url.searchParams.set('documentId', input.digest);
  const response = await request(url, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      messages: { integerValue: String(input.messages) },
      statuses: { integerValue: String(input.statuses) },
      receivedAt: { timestampValue: new Date().toISOString() },
      environment: { stringValue: 'test' },
    }}),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  // A retried delivery is already recorded; no duplicate receipt is created.
  if (!response.ok && response.status !== 409) throw new Error('WHATSAPP_RECEIPT_WRITE_FAILED');
}

const appointmentCollection = 'whatsapp-test-appointment-requests';
function appointmentUrl(project:string): URL {
  return new URL('https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/'+appointmentCollection);
}
const appointmentIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function mapAppointment(doc:unknown): Appointment {
  if (!doc || typeof doc!=='object') throw new Error('INVALID_APPOINTMENT_RECORD');
  const d=doc as {name?:string;fields?:Record<string,{stringValue?:string;integerValue?:string;timestampValue?:string}>};
  const f=d.fields;
  const id=d.name?.split('/').pop() ?? '';
  if (!f || !appointmentIdPattern.test(id) || f.environment?.stringValue!=='test') throw new Error('INVALID_APPOINTMENT_RECORD');
  return {
    id,...parseAppointmentInput({company:f.company?.stringValue,examType:f.examType?.stringValue,
      employeeCount:Number(f.employeeCount?.integerValue),preferredDate:f.preferredDate?.stringValue}),
    status:parseAppointmentStatus(f.status?.stringValue),
    createdAt:f.createdAt?.timestampValue ?? '',lastInteractionAt:f.lastInteractionAt?.timestampValue ?? '',
    updatedAt:f.updatedAt?.timestampValue ?? '',
  };
}
export async function createTestAppointment(id:string, input:AppointmentInput, request:typeof fetch=fetch):Promise<Appointment> {
  if (!appointmentIdPattern.test(id)) throw new Error('INVALID_APPOINTMENT');
  const valid=parseAppointmentInput(input);
  const cfg=config(), token=await accessToken(request,cfg);
  const url=appointmentUrl(cfg.project);
  url.searchParams.set('documentId',id);
  const now=new Date().toISOString();
  const response=await request(url,{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({fields:{
      company:{stringValue:valid.company},examType:{stringValue:valid.examType},employeeCount:{integerValue:String(valid.employeeCount)},
      preferredDate:{stringValue:valid.preferredDate},status:{stringValue:'pendente'},sector:{stringValue:'agendamento'},
      environment:{stringValue:'test'},source:{stringValue:'admin_test'},createdAt:{timestampValue:now},
      lastInteractionAt:{timestampValue:now},updatedAt:{timestampValue:now}
    }}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)
  });
  if (response.status===409) throw new Error('APPOINTMENT_ALREADY_EXISTS');
  if (!response.ok) throw new Error('APPOINTMENT_STORAGE_FAILED');
  return mapAppointment(await response.json());
}
export async function listTestAppointments(request:typeof fetch=fetch):Promise<{items:Appointment[];hasMore:boolean}> {
  const cfg=config(),token=await accessToken(request,cfg);const url=appointmentUrl(cfg.project);
  url.searchParams.set('pageSize','50');url.searchParams.set('orderBy','createdAt desc');
  const response=await request(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('APPOINTMENT_STORAGE_FAILED');
  const data=await response.json();
  if (data.documents!==undefined && !Array.isArray(data.documents)) throw new Error('APPOINTMENT_STORAGE_FAILED');
  return {items:(data.documents??[]).map(mapAppointment),hasMore:typeof data.nextPageToken==='string' && !!data.nextPageToken};
}
export async function updateTestAppointmentStatus(id:string,status:AppointmentStatus,request:typeof fetch=fetch):Promise<Appointment> {
  if (!appointmentIdPattern.test(id)) throw new Error('INVALID_APPOINTMENT');
  const valid=parseAppointmentStatus(status);
  const cfg=config(),token=await accessToken(request,cfg);
  const url=new URL(appointmentUrl(cfg.project).href+'/'+id);
  // First verify it is a test record; conditional version prevents concurrent overwrite.
  const existing=await request(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if (existing.status===404) throw new Error('APPOINTMENT_NOT_FOUND');
  if (!existing.ok) throw new Error('APPOINTMENT_STORAGE_FAILED');
  const doc=await existing.json();mapAppointment(doc);
  if (typeof doc.updateTime!=='string') throw new Error('APPOINTMENT_STORAGE_FAILED');
  url.searchParams.append('updateMask.fieldPaths','status');
  url.searchParams.append('updateMask.fieldPaths','updatedAt');
  url.searchParams.set('currentDocument.updateTime',doc.updateTime);
  const response=await request(url,{
    method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({fields:{status:{stringValue:valid},updatedAt:{timestampValue:new Date().toISOString()}}}),
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('APPOINTMENT_STORAGE_FAILED');
  return mapAppointment(await response.json());
}
