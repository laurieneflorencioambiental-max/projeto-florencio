// Mocked Firestore tests: no real customer data or network calls.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const crypto=require('node:crypto');
const cache={};
function load(name) {
  if(cache[name])return cache[name];
  const file=path.join(__dirname,'../src/lib/whatsapp',name+'.ts');
  const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal(out.diagnostics.length,0);
  const m={exports:{}};
  new Function('require','module','exports',out.outputText)(id=>id==='server-only'?{}:id.startsWith('./')?load(id.slice(2)):require(id),m,m.exports);
  return cache[name]=m.exports;
}
(async()=>{
  const model=load('appointment-intake');
  const store=load('storage.server');
  const input={company:'Empresa Exemplo',examType:'admissional',employeeCount:2,preferredDate:'2027-01-15'};
  assert.deepEqual(model.parseAppointmentInput(input),input);
  for(const x of [{...input,employeeCount:0},{...input,preferredDate:'2027-02-30'},{...input,message:'raw history'},{...input,examType:'unknown'}])
    assert.throws(()=>model.parseAppointmentInput(x));
  const now=Date.parse('2027-01-16T00:00:00Z');
  assert.equal(model.isOverdue({status:'pendente',lastInteractionAt:'2027-01-15T00:00:00Z'},now),true);
  assert.equal(model.isOverdue({status:'resolvido',lastInteractionAt:'2027-01-15T00:00:00Z'},now),false);
  Object.assign(process.env,{WHATSAPP_FIRESTORE_PROJECT_ID:'mock-project',WHATSAPP_FIRESTORE_CLIENT_EMAIL:'mock@example.test',
    WHATSAPP_FIRESTORE_PRIVATE_KEY:crypto.generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'})});
  const id=crypto.randomUUID();let record;
  const request=async(url,opts)=>{
    const u=new URL(String(url));
    if(u.hostname==='oauth2.googleapis.com')return Response.json({access_token:'mock'});
    assert.equal(u.hostname,'firestore.googleapis.com');
    assert(u.pathname.includes('/databases/crm-whatsapp/documents/whatsapp-test-appointment-requests'));
    if(opts.method==='POST'){
      assert.equal(u.searchParams.get('documentId'),id);
      const body=JSON.parse(opts.body);
      assert.equal(body.fields.environment.stringValue,'test');
      assert.equal(body.fields.status.stringValue,'pendente');
      assert.equal(body.fields.message,undefined);
      record={name:u.pathname.slice(4)+'/'+id,fields:body.fields,updateTime:'2027-01-01T00:00:00.000Z'};
      return Response.json(record);
    }
    if(opts.method==='PATCH'){
      assert.equal(u.searchParams.get('currentDocument.updateTime'),record.updateTime);
      assert.deepEqual(u.searchParams.getAll('updateMask.fieldPaths'),['status','updatedAt']);
      record.fields={...record.fields,...JSON.parse(opts.body).fields};
      return Response.json(record);
    }
    return u.pathname.endsWith('/'+id)?Response.json(record):Response.json({documents:[record]});
  };
  assert.equal((await store.createTestAppointment(id,input,request)).status,'pendente');
  assert.equal((await store.listTestAppointments(request)).items.length,1);
  assert.equal((await store.updateTestAppointmentStatus(id,'em_atendimento',request)).status,'em_atendimento');
  console.log('[WhatsApp appointments] PASS: validation, minimal storage, status update, 24h indicator');
})().catch(err=>{console.error('[WhatsApp appointments] fixture failed:',err.message);process.exitCode=1;});
