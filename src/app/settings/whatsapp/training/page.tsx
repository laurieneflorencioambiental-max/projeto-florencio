'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useAuth,useUser} from '@/firebase';
import {signInWithEmailAndPassword,signOut} from 'firebase/auth';
import type {Knowledge,RuleEntry,Sector,ConversationState,Simulation,SystemReplies} from '../../../../../webhook-receiver/lib/training.mjs';
import type {KnowledgeVersion} from '@/lib/whatsapp/training-storage.server';

const labels:Record<Sector,string>={agendamento:'Agendamento',documentos:'Documentação',comercial:'Comercial',financeiro:'Financeiro',area_tecnica:'Área técnica',central_relacionamento:'Central de relacionamento'};
const sectors=Object.keys(labels) as Sector[];
const replyLabels:Record<keyof SystemReplies,string>={asoForm:'Formulário de ASO',serviceInfo:'Locais e horários',addressReply:'Endereço completo',handoffReply:'Transferência para humano'};
const sources:Record<string,string>={knowledge:'Base de conhecimento',aso_form:'Formulário padrão de ASO',service_info:'Informações padrões de atendimento',address:'Orientação de endereço',handoff:'Encaminhamento humano',handoff_check:'Verificar insistência',human_active:'Bot pausado — atendimento humano',ambiguous:'Intenção ambígua',human_review:'Revisão humana',appointment_fallback:'Solicitação de agendamento'};
const field='w-full rounded-md border bg-background px-3 py-2 text-sm';
const button='rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50';
const primary=button+' bg-primary text-primary-foreground';
const endpoint='/api/whatsapp/training';
type Tab='contexto'|'setores'|'respostas';

export default function TrainingPage(){
  const {user,isUserLoading}=useUser();const auth=useAuth();
  const [draft,setDraft]=useState<KnowledgeVersion|null>(null),[published,setPublished]=useState<KnowledgeVersion|null>(null);
  const [knowledge,setKnowledge]=useState<Knowledge|null>(null),[tab,setTab]=useState<Tab>('contexto'),[sector,setSector]=useState<Sector>('agendamento');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[authMessage,setAuthMessage]=useState('');
  const [question,setQuestion]=useState(''),[simulation,setSimulation]=useState<Simulation|null>(null),[simState,setSimState]=useState<ConversationState>('new');
  const [simSource,setSimSource]=useState<'draft'|'published'>('draft');
  const dirty=!!knowledge&&!!draft&&JSON.stringify(knowledge)!==JSON.stringify(draft.knowledge);
  async function call(body?:unknown,signal?:AbortSignal){
    if(!user)throw Error('unauthorized');
    const response=await fetch(endpoint,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal});
    if(!response.ok)throw Error(String(response.status));return response.json();
  }
  async function load(signal?:AbortSignal){
    const data=await call(undefined,signal);if(signal?.aborted)return;
    setDraft(data.draft);setPublished(data.published);setKnowledge(data.draft.knowledge);setMessage('');
  }
  useEffect(()=>{setKnowledge(null);setDraft(null);setPublished(null);setAuthMessage('');setSimulation(null);
    if(!user)return;const ctrl=new AbortController();
    load(ctrl.signal).catch(err=>{if(!ctrl.signal.aborted)setAuthMessage(err.message==='403'?'Esta conta não tem autorização para a central.':'Não foi possível verificar o acesso. Atualize a página.');});
    return()=>ctrl.abort();
  },[user]);
  async function login(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!auth||busy)return;const form=event.currentTarget,values=new FormData(form);setBusy(true);setAuthMessage('');
    try{await signInWithEmailAndPassword(auth,String(values.get('email')??'').trim(),String(values.get('password')??''));form.reset();}
    catch{setAuthMessage('Não foi possível entrar. Confira suas credenciais.');}finally{setBusy(false);}}
  async function logout(){if(!auth||busy)return;setBusy(true);try{await signOut(auth);}finally{setBusy(false);}}
  function updateSector(values:Partial<Knowledge['sectors'][Sector]>){setKnowledge(prev=>prev?{...prev,sectors:{...prev.sectors,[sector]:{...prev.sectors[sector],...values}}}:prev);}
  function updateEntry(id:string,value:Partial<RuleEntry>){setKnowledge(prev=>prev?{...prev,sectors:{...prev.sectors,[sector]:{...prev.sectors[sector],entries:prev.sectors[sector].entries.map(e=>e.id===id?{...e,...value}:e)}}}:prev);}
  function addEntry(){if(!knowledge||knowledge.sectors[sector].entries.length>=30)return;updateSector({entries:[...knowledge.sectors[sector].entries,{id:crypto.randomUUID(),title:'',keywords:[''],response:'',enabled:true}]});}
  function removeEntry(id:string){if(knowledge)updateSector({entries:knowledge.sectors[sector].entries.filter(e=>e.id!==id)});}
  const errorMessage=(error:unknown)=>error instanceof Error&&error.message==='409'?'Outra alteração foi salva. Atualize a página antes de tentar novamente.':'Confira se os campos de respostas e palavras-chave estão preenchidos. Se persistir, tente novamente.';
  async function save(){if(!knowledge||!draft||busy)return;setBusy(true);setMessage('');try{
    const result=await call({action:'save',knowledge,expectedRevision:draft.revision});setDraft(result.draft);setKnowledge(result.draft.knowledge);setMessage('Rascunho salvo. O WhatsApp ainda utiliza a versão ativa.');
  }catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}}
  async function activate(){if(!draft||!published||dirty||draft.revision<1||busy)return;setBusy(true);setMessage('');try{
    const result=await call({action:'publish',draftRevision:draft.revision,expectedPublishedRevision:published.revision});setPublished(result.published);setMessage('Versão ativada no WhatsApp de testes.');
  }catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}}
  async function simulate(event:FormEvent){event.preventDefault();if(!knowledge||!published||!question.trim()||busy)return;setBusy(true);setSimulation(null);try{
    const result=await call({action:'simulate',text:question,state:simState,knowledge:simSource==='draft'?knowledge:published.knowledge});setSimulation(result.result);setSimState(result.result.nextState);
  }catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}}
  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
    <header className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">WhatsApp • Ambiente de testes</p><h1 className="text-3xl font-semibold">Central de treinamento do Agente Virtual</h1></div><Link className={button} href="/settings/whatsapp/appointments">Fila de atendimento</Link></div>
      <p className="text-sm text-muted-foreground">Organize o conhecimento da empresa, prepare respostas por setor e simule o comportamento antes de ativar uma versão. O modo atual é baseado em regras, sem IA generativa.</p>
    </header>
    {authMessage&&<p role="alert" className="rounded-md border p-3 text-sm">{authMessage}</p>}
    {isUserLoading?<p>Verificando sessão...</p>:!user?<section className="max-w-md rounded-lg border p-5 space-y-4"><h2 className="text-xl font-semibold">Entrar no ambiente de testes</h2><form onSubmit={login} className="grid gap-4"><label>E-mail<input className={field} type="email" name="email" autoComplete="username" required/></label><label>Senha<input className={field} type="password" name="password" autoComplete="current-password" required/></label><button className={primary} disabled={busy}>Entrar</button></form></section>:!knowledge||!draft||!published?<p>{authMessage?'Central indisponível para esta sessão.':'Carregando conhecimento...'}</p>:<>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="space-y-1"><p className="text-sm font-semibold">Versão ativa: {published.revision===0?'Padrão inicial':published.revision} <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-900 dark:bg-green-900 dark:text-green-100">Testes</span></p><p className="text-xs text-muted-foreground">Rascunho {draft.revision}{dirty?' • Alterações não salvas':''} · {published.updatedAt?'Ativada em '+new Date(published.updatedAt).toLocaleString('pt-BR'):'Respostas originais'}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={save} className={button} disabled={busy||!dirty}>Salvar rascunho</button><button onClick={activate} className={primary} disabled={busy||dirty||draft.revision<1||JSON.stringify(draft.knowledge)===JSON.stringify(published.knowledge)}>Ativar nos testes</button><button onClick={logout} className={button} disabled={busy}>Sair</button></div>
      </div>
      {message&&<p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className="rounded-lg border p-4 sm:p-5 space-y-4" aria-label="Editor de conhecimento">
          <div className="flex flex-wrap gap-2 border-b pb-3">{([['contexto','Contexto geral'],['setores','Conhecimento por setor'],['respostas','Respostas padrão']] as [Tab,string][]).map(([id,label])=><button key={id} aria-pressed={tab===id} className={tab===id?primary:button} onClick={()=>setTab(id)}>{label}</button>)}</div>
          {tab==='contexto'&&<div className="space-y-3"><h2 className="text-lg font-semibold">Instruções da empresa</h2><p className="text-sm text-muted-foreground">Contexto interno para documentar políticas, tom e limites. Nesta versão baseada em regras, orientações livres são registradas para consulta e futura IA; para alterar uma resposta real, cadastre uma regra ou edite as respostas padrão.</p><label className="block space-y-1 text-sm">Contexto geral<textarea rows={11} className={field} value={knowledge.context} maxLength={8000} onChange={e=>setKnowledge({...knowledge,context:e.target.value})}/></label></div>}
          {tab==='setores'&&<div className="space-y-4"><h2 className="text-lg font-semibold">Conhecimento por setor</h2><label className="block space-y-1 text-sm">Setor<select className={field} value={sector} onChange={e=>setSector(e.target.value as Sector)}>{sectors.map(id=><option key={id} value={id}>{labels[id]}</option>)}</select></label>
            <label className="block space-y-1 text-sm">Contexto interno do setor<textarea rows={4} className={field} value={knowledge.sectors[sector].context} onChange={e=>updateSector({context:e.target.value})} maxLength={8000}/></label>
            <p className="text-sm text-muted-foreground">Cadastre perguntas ou palavras-chave alternativas, uma por linha, e a resposta aprovada. O bot utiliza a correspondência mais específica.</p>
            <div className="flex justify-between items-center"><h3 className="font-semibold">Perguntas e respostas ({knowledge.sectors[sector].entries.length})</h3><button onClick={addEntry} className={button} disabled={knowledge.sectors[sector].entries.length>=30}>+ Nova regra</button></div>
            {knowledge.sectors[sector].entries.length===0?<p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nenhuma regra personalizada. Adicione a primeira.</p>:knowledge.sectors[sector].entries.map(entry=><div key={entry.id} className="rounded-md border p-3 space-y-3"><div className="flex justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={entry.enabled} onChange={e=>updateEntry(entry.id,{enabled:e.target.checked})}/>Ativa</label><button className="text-sm text-destructive" onClick={()=>removeEntry(entry.id)}>Remover regra</button></div><label className="block space-y-1 text-sm">Título<input className={field} value={entry.title} maxLength={120} onChange={e=>updateEntry(entry.id,{title:e.target.value})} placeholder="Ex.: Segunda via de boleto"/></label><label className="block space-y-1 text-sm">Palavras-chave / frases<textarea rows={3} className={field} value={entry.keywords.join('\n')} onChange={e=>updateEntry(entry.id,{keywords:e.target.value.split('\n')})} placeholder="segunda via de boleto"/></label><label className="block space-y-1 text-sm">Resposta aprovada<textarea rows={5} className={field} maxLength={1900} value={entry.response} onChange={e=>updateEntry(entry.id,{response:e.target.value})}/></label></div>)}
          </div>}
          {tab==='respostas'&&<div className="space-y-4"><h2 className="text-lg font-semibold">Respostas padrão</h2><p className="text-sm text-muted-foreground">Edite os textos já validados. Os gatilhos e a proteção de atendimento humano continuam preservados.</p>{(Object.keys(replyLabels) as (keyof SystemReplies)[]).map(key=><label key={key} className="block space-y-1 text-sm"><span className="font-medium">{replyLabels[key]}</span><textarea className={field} rows={key==='asoForm'?14:key==='serviceInfo'?9:4} maxLength={1900} value={knowledge.systemReplies[key]} onChange={e=>setKnowledge({...knowledge,systemReplies:{...knowledge.systemReplies,[key]:e.target.value}})}/></label>)}</div>}
        </section>
        <aside className="rounded-lg border p-4 sm:p-5 space-y-4" aria-label="Simulador do agente">
          <div><h2 className="text-lg font-semibold">Simulador de conversa</h2><p className="text-sm text-muted-foreground">Não envia mensagens nem grava o histórico. Use somente perguntas fictícias.</p></div>
          <label className="block space-y-1 text-sm">Versão para simular<select className={field} value={simSource} onChange={e=>setSimSource(e.target.value as 'draft'|'published')}><option value="draft">Rascunho, inclusive alterações na tela</option><option value="published">Versão ativa</option></select></label>
          <label className="block space-y-1 text-sm">Estado da conversa<select className={field} value={simState} onChange={e=>setSimState(e.target.value as ConversationState)}><option value="new">Nova conversa</option><option value="address_answered">Endereço já foi orientado</option><option value="human_active">Atendimento humano em andamento</option></select></label>
          <form onSubmit={simulate} className="space-y-2"><label className="block space-y-1 text-sm">Mensagem do cliente<textarea className={field} rows={4} maxLength={4000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ex.: Quero agendar um ASO."/></label><div className="flex gap-2"><button type="submit" className={primary} disabled={busy||!question.trim()}>Simular resposta</button><button type="button" className={button} onClick={()=>{setSimulation(null);setQuestion('');setSimState('new');}}>Nova conversa</button></div></form>
          {simulation&&<div className="space-y-3 rounded-lg bg-muted/50 p-3" aria-live="polite"><div className="text-xs text-muted-foreground">{labels[simulation.sector]} · {sources[simulation.source]??simulation.source}{simulation.title?' · '+simulation.title:''}</div><div className="rounded-lg border bg-background p-3 whitespace-pre-wrap text-sm">{simulation.body??'Nenhuma resposta automática. Encaminhar para revisão humana ou manter o bot pausado.'}</div></div>}
        </aside>
      </div>
    </>}
  </main>;
}
