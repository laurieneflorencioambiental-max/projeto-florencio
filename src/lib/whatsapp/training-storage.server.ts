import 'server-only';
import {getTestStorageContext} from './storage.server';
import {defaultKnowledge,validateKnowledge,type Knowledge} from '../../../webhook-receiver/lib/training.mjs';

export type KnowledgeVersion={revision:number;updatedAt:string|null;knowledge:Knowledge};
type KnowledgeDoc={version:KnowledgeVersion;updateTime:string|null};
const knowledgeCollection=(project:string)=>'https://firestore.googleapis.com/v1/projects/'+project+'/databases/crm-whatsapp/documents/whatsapp-test-agent-knowledge';
async function readKnowledgeDoc(slot:'draft'|'published',project:string,token:string,request:typeof fetch):Promise<KnowledgeDoc>{
  const response=await request(knowledgeCollection(project)+'/'+slot,{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(response.status===404)return {version:{revision:0,updatedAt:null,knowledge:defaultKnowledge()},updateTime:null};
  if(!response.ok)throw Error('KNOWLEDGE_UNAVAILABLE');
  const doc=await response.json(),fields=doc.fields;
  const revision=Number(fields?.revision?.integerValue);
  if(fields?.environment?.stringValue!=='test'||!Number.isSafeInteger(revision)||revision<1||typeof doc.updateTime!=='string')throw Error('KNOWLEDGE_UNAVAILABLE');
  return {version:{revision,updatedAt:fields.updatedAt?.timestampValue??null,knowledge:validateKnowledge(JSON.parse(fields.knowledgeJson.stringValue))},updateTime:doc.updateTime};
}
async function writeKnowledgeDoc(slot:'draft'|'published',current:KnowledgeDoc,knowledge:Knowledge,project:string,token:string,request:typeof fetch):Promise<KnowledgeVersion>{
  const revision=current.version.revision+1,updatedAt=new Date().toISOString();
  const fields={environment:{stringValue:'test'},revision:{integerValue:String(revision)},updatedAt:{timestampValue:updatedAt},knowledgeJson:{stringValue:JSON.stringify(knowledge)}};
  const url=new URL(knowledgeCollection(project)+(current.updateTime?'/'+slot:''));
  if(current.updateTime){url.searchParams.set('currentDocument.updateTime',current.updateTime);for(const name of Object.keys(fields))url.searchParams.append('updateMask.fieldPaths',name);}
  else url.searchParams.set('documentId',slot);
  const response=await request(url,{method:current.updateTime?'PATCH':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({fields}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if([409,412].includes(response.status))throw Error('KNOWLEDGE_CONFLICT');
  if(!response.ok)throw Error('KNOWLEDGE_UNAVAILABLE');
  return {revision,updatedAt,knowledge};
}
export async function getTestKnowledge(request:typeof fetch=fetch):Promise<{draft:KnowledgeVersion;published:KnowledgeVersion}>{
  const {project,token}=await getTestStorageContext(request);
  const [draft,published]=await Promise.all([readKnowledgeDoc('draft',project,token,request),readKnowledgeDoc('published',project,token,request)]);
  return {draft:draft.version,published:published.version};
}
export async function saveTestKnowledge(value:unknown,expectedRevision:number,request:typeof fetch=fetch):Promise<KnowledgeVersion>{
  const knowledge=validateKnowledge(value),{project,token}=await getTestStorageContext(request);
  const current=await readKnowledgeDoc('draft',project,token,request);
  if(current.version.revision!==expectedRevision)throw Error('KNOWLEDGE_CONFLICT');
  return writeKnowledgeDoc('draft',current,knowledge,project,token,request);
}
export async function publishTestKnowledge(draftRevision:number,expectedPublishedRevision:number,request:typeof fetch=fetch):Promise<KnowledgeVersion>{
  const {project,token}=await getTestStorageContext(request);
  const [draft,published]=await Promise.all([readKnowledgeDoc('draft',project,token,request),readKnowledgeDoc('published',project,token,request)]);
  if(draft.version.revision!==draftRevision||published.version.revision!==expectedPublishedRevision||draftRevision<1)throw Error('KNOWLEDGE_CONFLICT');
  return writeKnowledgeDoc('published',published,draft.version.knowledge,project,token,request);
}
