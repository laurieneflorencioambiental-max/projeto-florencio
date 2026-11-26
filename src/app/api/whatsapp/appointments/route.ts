import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAdministrator } from '@/lib/whatsapp/admin.server';
import { parseAppointmentInput, parseAppointmentStatus } from '@/lib/whatsapp/appointment-intake';
import { createTestAppointment, listTestAppointments, updateTestAppointmentStatus } from '@/lib/whatsapp/storage.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const reply=(status:number,body:Record<string,unknown>)=>NextResponse.json(body,{status,headers});
async function guard(req:NextRequest,mutating:boolean) {
  if (process.env.VERCEL_ENV!=='preview' || process.env.VERCEL_GIT_COMMIT_REF!=='feat/whatsapp-embedded-signup')
    return reply(503,{status:'disabled'});
  if (mutating && (!process.env.WHATSAPP_SIGNUP_ORIGIN || req.headers.get('origin')!==process.env.WHATSAPP_SIGNUP_ORIGIN))
    return reply(403,{status:'forbidden'});
  try { await requireWhatsAppAdministrator(req.headers.get('authorization')); }
  catch (error) {
    const reason=error instanceof Error ? error.message : '';
    const unavailable=['ADMIN_CONFIGURATION_MISSING','ADMIN_VERIFICATION_UNAVAILABLE'].includes(reason);
    console.warn('[whatsapp-appointments] '+(unavailable?'authorization_unavailable':'authorization_denied'));
    return unavailable?reply(503,{status:'unavailable'}):reply(403,{status:'forbidden'});
  }
  return null;
}
async function bodyOf(req:NextRequest):Promise<Record<string,unknown>> {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new Error('INVALID_APPOINTMENT');
  const raw=await req.text();
  if (raw.length>4096) throw new Error('INVALID_APPOINTMENT');
  let value;
  try {value=JSON.parse(raw);} catch {throw new Error('INVALID_APPOINTMENT');}
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('INVALID_APPOINTMENT');
  return value;
}
function failure(error:unknown) {
  const msg=error instanceof Error ? error.message : '';
  if (['INVALID_APPOINTMENT','INVALID_STATUS'].includes(msg)) return reply(400,{status:'invalid_input'});
  if (msg==='APPOINTMENT_ALREADY_EXISTS') return reply(409,{status:'already_exists'});
  if (msg==='APPOINTMENT_NOT_FOUND') return reply(404,{status:'not_found'});
  return reply(503,{status:'unavailable'});
}
export async function GET(req:NextRequest) {
  const blocked=await guard(req,false);if(blocked)return blocked;
  try {return reply(200,await listTestAppointments());}catch(error){return failure(error);}
}
export async function POST(req:NextRequest) {
  const blocked=await guard(req,true);if(blocked)return blocked;
  try {
    const body=await bodyOf(req);
    if (typeof body.id!=='string' || Object.keys(body).some(k=>!['id','input'].includes(k))) throw new Error('INVALID_APPOINTMENT');
    const item=await createTestAppointment(body.id,parseAppointmentInput(body.input));
    return reply(201,{item});
  }catch(error){return failure(error);}
}
export async function PATCH(req:NextRequest) {
  const blocked=await guard(req,true);if(blocked)return blocked;
  try {
    const body=await bodyOf(req);
    if (typeof body.id!=='string' || Object.keys(body).some(k=>!['id','status'].includes(k))) throw new Error('INVALID_APPOINTMENT');
    const item=await updateTestAppointmentStatus(body.id,parseAppointmentStatus(body.status));
    return reply(200,{item});
  }catch(error){return failure(error);}
}
