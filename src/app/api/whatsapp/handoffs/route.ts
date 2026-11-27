import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAdministrator } from '@/lib/whatsapp/admin.server';
import { listTestHandoffs, updateTestHandoffStatus } from '@/lib/whatsapp/storage.server';

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
    console.warn('[whatsapp-handoffs] '+(unavailable?'authorization_unavailable':'authorization_denied'));
    return unavailable?reply(503,{status:'unavailable'}):reply(403,{status:'forbidden'});
  }
  return null;
}
export async function GET(req:NextRequest) {
  const blocked=await guard(req,false);if(blocked)return blocked;
  try{return reply(200,{items:await listTestHandoffs()});}catch{return reply(503,{status:'unavailable'});}
}
export async function PATCH(req:NextRequest) {
  const blocked=await guard(req,true);if(blocked)return blocked;
  try{
    if(!req.headers.get('content-type')?.startsWith('application/json'))return reply(400,{status:'invalid_input'});
    const raw=await req.text();if(raw.length>1024)return reply(400,{status:'invalid_input'});
    let value:unknown;try{value=JSON.parse(raw);}catch{return reply(400,{status:'invalid_input'});}
    if(!value || typeof value!=='object' || Array.isArray(value))return reply(400,{status:'invalid_input'});
    const body=value as Record<string,unknown>;
    if(Object.keys(body).some(k=>!['id','status'].includes(k)) || typeof body.id!=='string' ||
      (body.status!=='em_atendimento' && body.status!=='resolvido'))return reply(400,{status:'invalid_input'});
    return reply(200,{item:await updateTestHandoffStatus(body.id,body.status)});
  }catch(error){
    const reason=error instanceof Error?error.message:'';
    if(reason==='HANDOFF_INVALID')return reply(400,{status:'invalid_input'});
    if(reason==='HANDOFF_NOT_FOUND')return reply(404,{status:'not_found'});
    if(reason==='HANDOFF_CONFLICT')return reply(409,{status:'conflict'});
    return reply(503,{status:'unavailable'});
  }
}
