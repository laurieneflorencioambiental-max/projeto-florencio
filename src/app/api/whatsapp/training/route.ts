import { NextRequest, NextResponse } from 'next/server';
import {simulateKnowledge,validateKnowledge} from '../../../../../webhook-receiver/lib/training.mjs';
import { requireWhatsAppAdministrator } from '@/lib/whatsapp/admin.server';
import { getTestKnowledge, saveTestKnowledge, publishTestKnowledge } from '@/lib/whatsapp/training-storage.server';

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
    console.warn('[whatsapp-training] '+(unavailable?'authorization_unavailable':'authorization_denied'));
    return unavailable?reply(503,{status:'unavailable'}):reply(403,{status:'forbidden'});
  }
  return null;
}

export async function GET(req:NextRequest){
  const blocked=await guard(req,false);if(blocked)return blocked;
  try{return reply(200,await getTestKnowledge());}catch{return reply(503,{status:'unavailable'});}
}
export async function POST(req:NextRequest){
  const blocked=await guard(req,true);if(blocked)return blocked;
  try{
    if(!req.headers.get('content-type')?.startsWith('application/json'))return reply(400,{status:'invalid_input'});
    const raw=await req.text();if(raw.length>200000)return reply(400,{status:'invalid_input'});
    let value:unknown;try{value=JSON.parse(raw);}catch{return reply(400,{status:'invalid_input'});}
    if(!value||typeof value!=='object'||Array.isArray(value))return reply(400,{status:'invalid_input'});
    const body=value as Record<string,unknown>;
    const revision=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
    if(body.action==='save'&&revision(body.expectedRevision))return reply(200,{draft:await saveTestKnowledge(body.knowledge,body.expectedRevision)});
    if(body.action==='publish'&&revision(body.draftRevision)&&revision(body.expectedPublishedRevision))return reply(200,{published:await publishTestKnowledge(body.draftRevision,body.expectedPublishedRevision)});
    if(body.action==='simulate'&&typeof body.text==='string'&&(body.state==='new'||body.state==='address_answered'||body.state==='human_active')){
      return reply(200,{result:simulateKnowledge(body.text,validateKnowledge(body.knowledge),body.state)});
    }
    return reply(400,{status:'invalid_input'});
  }catch(error){
    const reason=error instanceof Error?error.message:'';
    if(['INVALID_KNOWLEDGE','INVALID_SIMULATION'].includes(reason))return reply(400,{status:'invalid_input'});
    if(reason==='KNOWLEDGE_CONFLICT')return reply(409,{status:'conflict'});
    return reply(503,{status:'unavailable'});
  }
}
