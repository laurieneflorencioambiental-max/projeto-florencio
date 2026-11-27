const ASO_FORM = `🏥 Informações necessárias para o encaminhamento:

Nome da empresa:
CNPJ:
Nome completo do funcionário:
Tipo de exame (admissional, periódico, demissional, mudança de riscos ocupacionais):
RG:
CPF:
Setor:
Função + CBO:
Data de nascimento:
Local da Clínica:
Data do atendimento:
Número do celular do funcionário: (21)
E-mail da empresa:

Caso haja, preencha as informações abaixo:

Faz trabalho em altura?
Faz trabalho em Espaço Confinado?
(necessário fazer exame complementar)

Descreva os riscos:

Físico:
Químico:
Biológico:
Ergonômico:
Acidentes:

Nome do médico coordenador do PCMSO:
CRM:

Não nos responsabilizamos pelas informações não informadas; inclusões posteriores sujeitas a cobrança.

✅ Favor preencher as informações acima, para enviarmos o encaminhamento.

✅ Para agilizar o atendimento, favor #Não# enviar as informações separadas. Preencher tudo nesse formulário.

✅ O encaminhamento irá para o celular do funcionário via SMS, com cópia para o e-mail do Gestor.`;

const SERVICE_INFO = `🩺 Florêncio Ambiental:
Local de Atendimento - Medicina do Trabalho:

📍Centro do Rio de Janeiro
📍Nova Iguaçu
📍Duque de Caxias
📍Vila Kosmos / Vila da Penha
📍Niterói
📍Macaé
📍Guapimirim

🕚 Horário de atendimento da Medicina do Trabalho: de segunda a sexta, de 8h às 11h.`;

const ADDRESS_REPLY = 'O endereço completo da clínica será informado no encaminhamento, que será enviado ao celular do funcionário por SMS e com cópia para o e-mail do gestor.';
const HANDOFF_REPLY = 'Compreendo. Vou encaminhar seu atendimento a um atendente humano para que possa ajudá-lo. Por favor, aguarde.';

function serviceIntent(message) {
  if(message?.type!=='text' || typeof message.text?.body!=='string') return {aso:false,info:false,address:false,human:false,resistance:false};
  const t=normalize(message.text.body.trim());
  if(!t || t.length>4000 || t.startsWith('agendamento teste |') ||
    /\b(urgente|emergencia|acidente|dor|sintomas?|diagnostico|medicamento|inapto|resultado clinico|resultado de exame)\b/.test(t)) return {aso:false,info:false,address:false,human:false,resistance:false};
  // Completed forms may contain identifying information. Never echo their fields.
  if(/\bcpf\s*:/i.test(t) && /\brg\s*:/i.test(t)) return {aso:false,info:false,address:false,human:false,resistance:false};
  const existing=/\b(segunda via|2a via|2ª via|copia|reimprimir|baixar|resultado|pronto|laudo pronto|ja (?:fiz|realizei|agendei)|cancel\w*|remarc\w*|desmarc\w*|adiar)\b/.test(t);
  const other=/\b(boleto|pix|pagamento|fatura|nota fiscal|cobranca|orcamento|cotacao|preco|valor|proposta|contrato)\b/.test(t);
  const negated=/\bnao\s+(?:quero|preciso|gostaria|desejo|vou|pretendo|agend\w*|gerar|marcar|emitir|fazer)\b/.test(t);
  const asoSubject=/\b(?:asos?|atestado de saude ocupacional|exames? (?:ocupacionais?|admissiona(?:l|is)|demissiona(?:l|is)|periodic[oa]s?)|admissiona(?:l|is)|demissiona(?:l|is)|periodic[oa]s?|mudanca (?:de|do) riscos?(?: ocupacionais)?|retorno ao trabalho)\b/.test(t);
  const action=/\b(agend\w*|marcar|gerar|emitir|solicit\w*|encaminh\w*|preciso|gostaria|quero|desejo|fazer|realizar|providenciar|tirar)\b/.test(t);
  const aso=!existing && !other && !negated && asoSubject && action;
  const human=/\b(?:atendente|atendimento humano|pessoa humana|falar com (?:uma pessoa|alguem|o responsavel)|transferir (?:para|o atendimento))\b/.test(t) && !/\bnao (?:quero|preciso) (?:de |falar com )?(?:um )?atendente\b/.test(t);
  const address=!other && !existing && /\b(?:enderecos?|rua|logradouro|numero da clinica|cep|localizacao exata|local exato|ponto de referencia|como chegar|link do maps)\b/.test(t);
  const resistance=/\b(?:insisto|ja pedi|ja perguntei|nao quero esperar|nao vou esperar|nao quero o encaminhamento|nao quero preencher|nao vou preencher|preciso agora|quero agora|me passa agora|me mande agora|mesmo assim|quero o endereco agora|preciso do endereco agora)\b/.test(t);
  const info=!existing && !other && !negated && (
    /\b(?:onde|qual|quais|como chegar|me informa|me informe|me passa|gostaria de saber)\b[\s\S]{0,70}\b(?:clinicas?|local|locais|enderecos?|unidades?|atendem|horarios?|horas?|funcionamento|fica|ficam)\b/.test(t) ||
    /\b(?:onde (?:e|sao|ocorre|ocorrem) (?:o |os )?atendimentos?|locais? de atendimento|horarios? de atendimento|horarios? da (?:clinica|medicina do trabalho)|horario de funcionamento|endereco da clinica|enderecos das clinicas|que horas (?:atende|atendem|abre|fecha))\b/.test(t) ||
    /^(?:local|locais|endereco|enderecos|horario|horarios)(?: de atendimento)?[?!.\s]*$/.test(t)
  );
  return {aso,info,address,human,resistance};
}
function serviceReply(message,replies=DEFAULT_SYSTEM_REPLIES) {
  const intent=serviceIntent(message);
  if(intent.human) return replies.handoffReply;
  if(intent.address) return (intent.aso?replies.asoForm+'\n\n':'')+replies.addressReply;
  if(intent.aso && intent.info) return replies.asoForm+'\n\n'+replies.serviceInfo;
  if(intent.aso) return replies.asoForm;
  if(intent.info) return replies.serviceInfo;
  return null;
}

// Preliminary, deterministic categories. Not a clinical assessment or an automatic reply.
// Unknown, ambiguous, non-text and health-related requests go to human review.
function classifyTestMessage(message) {
  if (message?.type !== 'text' || typeof message.text?.body !== 'string') return 'central_relacionamento';
  const t = message.text.body.slice(0,4000).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (/\b(urgente|emergencia|acidente|dor|sintomas?|diagnostico|medicamento|inapto|resultado clinico)\b/.test(t)) return 'central_relacionamento';
  const intent=serviceIntent(message);
  if(intent.aso || intent.info || intent.address || intent.human || intent.resistance) return 'agendamento';
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
    draftReply:missing.length?'Para encaminhar seu agendamento de teste, informe: '+missing.map(k=>missingLabels[k]).join(', ')+'. Por favor, reenvie o pedido completo com esses dados.':'Recebemos sua solicitação de agendamento de teste. A equipe irá analisar a disponibilidade.'};
}


const SECTORS=['agendamento','documentos','comercial','financeiro','area_tecnica','central_relacionamento'];
const DEFAULT_SYSTEM_REPLIES=Object.freeze({asoForm:ASO_FORM,serviceInfo:SERVICE_INFO,addressReply:ADDRESS_REPLY,handoffReply:HANDOFF_REPLY});
const DEFAULT_CONTEXT='Atendimento cordial, objetivo e profissional. Não inventar informações, não confirmar horários sem validação e encaminhar situações ambíguas para atendimento humano.';
const sectorDefaults={
  agendamento:'ASOs, exames ocupacionais, formulário de encaminhamento, locais e horários. Endereço completo apenas no encaminhamento.',
  documentos:'Solicitações de ASOs já emitidos, certificados, laudos e segunda via. Não divulgar documentos sem validação humana.',
  comercial:'Propostas, orçamento e contratação de serviços.',
  financeiro:'Boletos, pagamentos, cobranças e notas fiscais.',
  area_tecnica:'PGR, PCMSO, LTCAT, eSocial, SST e treinamentos.',
  central_relacionamento:'Triagem, dúvidas sem categoria definida e atendimento humano.'
};
function defaultKnowledge() {
  return {schemaVersion:1,context:DEFAULT_CONTEXT,systemReplies:{...DEFAULT_SYSTEM_REPLIES},
    sectors:Object.fromEntries(SECTORS.map(id=>[id,{context:sectorDefaults[id],entries:[]}]))};
}
const plain=(v,max,required=false)=>typeof v==='string' && v.length<=max && (!required||v.trim().length>0);
function validateKnowledge(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||value.schemaVersion!==1||
    !plain(value.context,8000)||!value.systemReplies||!value.sectors) throw Error('INVALID_KNOWLEDGE');
  if(Object.keys(value).some(k=>!['schemaVersion','context','systemReplies','sectors'].includes(k))) throw Error('INVALID_KNOWLEDGE');
  if(Object.keys(value.systemReplies).length!==4||Object.keys(value.sectors).length!==SECTORS.length)throw Error('INVALID_KNOWLEDGE');
  const systemReplies={};
  for(const key of Object.keys(DEFAULT_SYSTEM_REPLIES)){
    if(!plain(value.systemReplies[key],1900,true))throw Error('INVALID_KNOWLEDGE');
    systemReplies[key]=value.systemReplies[key].trim();
  }
  const sectors={};const ids=new Set();
  for(const sector of SECTORS){
    const input=value.sectors[sector];
    if(!input||!plain(input.context,8000)||!Array.isArray(input.entries)||input.entries.length>30)throw Error('INVALID_KNOWLEDGE');
    const entries=input.entries.map(entry=>{
      if(!entry||!plain(entry.id,80,true)||!/^[a-zA-Z0-9_-]+$/.test(entry.id)||ids.has(entry.id)||
        !plain(entry.title,120,true)||!Array.isArray(entry.keywords)||entry.keywords.length<1||entry.keywords.length>20||
        !entry.keywords.every(k=>plain(k,100,true)&&normalize(k).replace(/[^a-z0-9]/g,'').length>=3)||
        !plain(entry.response,1900,true)||typeof entry.enabled!=='boolean')throw Error('INVALID_KNOWLEDGE');
      ids.add(entry.id);return {id:entry.id,title:entry.title.trim(),keywords:entry.keywords.map(k=>k.trim()),response:entry.response.trim(),enabled:entry.enabled};
    });
    sectors[sector]={context:input.context.trim(),entries};
  }
  const clean={schemaVersion:1,context:value.context.trim(),systemReplies,sectors};
  if(JSON.stringify(clean).length>180000)throw Error('INVALID_KNOWLEDGE');
  return clean;
}
function safeForKnowledge(message) {
  if(message?.type!=='text'||typeof message.text?.body!=='string')return false;
  const t=normalize(message.text.body.trim());
  return !!t&&t.length<=4000&&!t.startsWith('agendamento teste |')&&
    !(/\bcpf\s*:/i.test(t)&&/\brg\s*:/i.test(t))&&
    !/\b(urgente|emergencia|acidente|dor|sintomas?|diagnostico|medicamento|inapto|resultado clinico|resultado de exame)\b/.test(t);
}
const words=t=>' '+normalize(t).replace(/[^a-z0-9]+/g,' ').trim()+' ';
function selectKnowledgeReply(message,knowledge,defaultBody=null) {
  const category=classifyTestMessage(message);
  const intent=serviceIntent(message);
  if(!safeForKnowledge(message))return {sector:category,body:null,source:'human_review',intent};
  const system=serviceReply(message,knowledge.systemReplies);
  if(system)return {sector:'agendamento',body:system,source:intent.human?'handoff':intent.address?'address':intent.aso?'aso_form':'service_info',intent};
  if(intent.resistance)return {sector:'agendamento',body:null,source:'handoff_check',intent};
  const haystack=words(message.text.body);
  const matches=[];
  for(const sector of SECTORS)for(const entry of knowledge.sectors[sector].entries) {
    if(!entry.enabled)continue;
    const terms=entry.keywords.filter(k=>haystack.includes(words(k)));
    if(terms.length)matches.push({sector,entry,score:Math.max(...terms.map(k=>words(k).trim().length))});
  }
  matches.sort((a,b)=>b.score-a.score);
  if(matches.length) {
    // Conflicting matches go to human review rather than guessing.
    const best=matches[0];
    if(matches.some((m,i)=>i>0&&m.score===best.score&&m.entry.response!==best.entry.response))return {sector:'central_relacionamento',body:null,source:'ambiguous',intent};
    return {sector:best.sector,body:best.entry.response,source:'knowledge',entryId:best.entry.id,title:best.entry.title,intent};
  }
  return {sector:category,body:defaultBody,source:defaultBody?'appointment_fallback':'human_review',intent};
}
function simulateKnowledge(text,knowledge,state='new') {
  if(typeof text!=='string'||!text.trim()||text.length>4000||!['new','address_answered','human_active'].includes(state))throw Error('INVALID_SIMULATION');
  const message={id:'wamid.simulation',type:'text',timestamp:String(Math.floor(Date.now()/1000)),text:{body:text}};
  const intent=serviceIntent(message),category=classifyTestMessage(message);
  const strict=parseTestAppointment(message);
  const intake=safeForKnowledge(message)&&!intent.human&&!intent.address&&!intent.resistance&&!(intent.info&&!intent.aso)?analyzeNaturalAppointment(message,category):null;
  const fallback=strict?'Recebemos sua solicitação de agendamento de teste. A equipe irá analisar a disponibilidade.':(intake?.appointment||intake?.missing.length)?intake.draftReply:null;
  const selected=strict?{sector:category,body:fallback,source:'appointment_fallback',intent}:selectKnowledgeReply(message,knowledge,fallback);
  if(state==='human_active')return {...selected,body:null,source:'human_active',nextState:'human_active'};
  if(intent.human||(intent.address&&(state==='address_answered'||intent.resistance))||(intent.resistance&&state==='address_answered'))
    return {...selected,body:knowledge.systemReplies.handoffReply,source:'handoff',nextState:'human_active'};
  return {...selected,nextState:intent.address?'address_answered':state};
}
export {ASO_FORM,SERVICE_INFO,ADDRESS_REPLY,HANDOFF_REPLY,SECTORS,DEFAULT_SYSTEM_REPLIES,normalize,serviceIntent,serviceReply,classifyTestMessage,parseTestAppointment,analyzeNaturalAppointment,defaultKnowledge,validateKnowledge,safeForKnowledge,selectKnowledgeReply,simulateKnowledge};
