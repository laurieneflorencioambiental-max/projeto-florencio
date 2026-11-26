'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useUser } from '@/firebase';
import { examTypes, appointmentStatuses, isOverdue, type Appointment, type ExamType, type AppointmentStatus } from '@/lib/whatsapp/appointment-intake';

const examLabels:Record<ExamType,string>={admissional:'Admissional',demissional:'Demissional',periodico:'Periódico',retorno_ao_trabalho:'Retorno ao trabalho',mudanca_de_risco:'Mudança de risco ocupacional',outro:'Outro'};
const statusLabels:Record<AppointmentStatus,string>={pendente:'Pendente',em_atendimento:'Em atendimento',resolvido:'Resolvido',cancelado:'Cancelado'};
const endpoint='/api/whatsapp/appointments';
const button='rounded-md border px-4 py-2 font-medium disabled:opacity-50';
const field='w-full rounded-md border bg-background p-2 text-sm';

export default function AppointmentTestPage() {
  const {user}=useUser();
  const [items,setItems]=useState<Appointment[]>([]);
  const [hasMore,setHasMore]=useState(false);
  const [company,setCompany]=useState('');
  const [examType,setExamType]=useState<ExamType>('admissional');
  const [count,setCount]=useState('1');
  const [date,setDate]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [now,setNow]=useState(Date.now());
  const nextId=useRef<string|null>(null);
  async function call(method:string,body?:unknown,signal?:AbortSignal) {
    if(!user) throw new Error('unauthorized');
    const response=await fetch(endpoint,{method,headers:{Authorization:'Bearer '+await user.getIdToken(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal});
    if(!response.ok) throw new Error(String(response.status));
    return response.json();
  }
  async function refresh(signal?:AbortSignal) {
    const data=await call('GET',undefined,signal);
    setItems(Array.isArray(data.items)?data.items:[]);setHasMore(Boolean(data.hasMore));
  }
  useEffect(()=>{
    setItems([]);setHasMore(false);
    if(!user)return;
    const abort=new AbortController();
    refresh(abort.signal).catch(()=>{if(!abort.signal.aborted)setMessage('Fila indisponível ou acesso não autorizado.');});
    return ()=>abort.abort();
  },[user]);
  useEffect(()=>{const interval=setInterval(()=>setNow(Date.now()),60000);return ()=>clearInterval(interval);},[]);
  async function submit(event:FormEvent) {
    event.preventDefault();if(busy||!user)return;
    setBusy(true);setMessage('');
    try {
      nextId.current??=crypto.randomUUID();
      await call('POST',{id:nextId.current,input:{company,examType,employeeCount:Number(count),preferredDate:date}});
      nextId.current=null;setCompany('');setCount('1');setDate('');
      await refresh();setMessage('Solicitação registrada. Aguarda validação da equipe.');
    } catch(e) {
      if(e instanceof Error && e.message==='409'){nextId.current=null;await refresh().catch(()=>{});setMessage('Solicitação já registrada; confira a fila.');}
      else setMessage('Não foi possível registrar a solicitação. Confira os dados e tente novamente.');
    }finally{setBusy(false);}
  }
  async function changeStatus(id:string,status:AppointmentStatus) {
    if(busy)return;setBusy(true);setMessage('');
    try {await call('PATCH',{id,status});await refresh();setMessage('Situação atualizada.');}
    catch{setMessage('Não foi possível alterar a situação.');}
    finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <header className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">WhatsApp • Ambiente de testes</p>
      <h1 className="text-3xl font-semibold">Solicitações de agendamento</h1>
      <p className="text-sm text-muted-foreground">Fila de solicitações para a equipe. Não confirma horários e não armazena o histórico de mensagens.</p>
      <p className="rounded-md border p-3 text-sm">Utilize somente dados fictícios nesta fase. Não informe nomes de funcionários, resultados de exames ou documentos.</p>
    </header>
    {!user?<p>Entre com sua conta autorizada para acessar a fila.</p>:<>
      <section className="rounded-lg border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Nova solicitação de teste</h2>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Empresa<input className={field} required maxLength={100} value={company} onChange={e=>{setCompany(e.target.value);nextId.current=null;}} placeholder="Empresa Exemplo"/></label>
          <label className="space-y-1 text-sm">Tipo de exame<select className={field} value={examType} onChange={e=>{setExamType(e.target.value as ExamType);nextId.current=null;}}>{examTypes.map(t=><option key={t} value={t}>{examLabels[t]}</option>)}</select></label>
          <label className="space-y-1 text-sm">Quantidade de funcionários<input className={field} type="number" min={1} max={1000} required value={count} onChange={e=>{setCount(e.target.value);nextId.current=null;}}/></label>
          <label className="space-y-1 text-sm">Data de preferência<input className={field} type="date" required value={date} onChange={e=>{setDate(e.target.value);nextId.current=null;}}/></label>
          <div className="sm:col-span-2"><button className={button+' bg-primary text-primary-foreground'} disabled={busy} type="submit">Registrar solicitação</button></div>
        </form>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Fila de atendimento</h2><button className={button} disabled={busy} onClick={()=>{setBusy(true);refresh().catch(()=>setMessage('Fila indisponível.')).finally(()=>setBusy(false));}}>Atualizar</button></div>
        {message&&<p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
        {items.length===0?<p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhuma solicitação carregada.</p>:<div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm text-left"><thead className="bg-muted text-muted-foreground"><tr>{['Empresa','Exame','Qtd.','Data pretendida','Situação'].map(h=><th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>{items.map(item=><tr key={item.id} className="border-t">
          <td className="p-3 font-medium">{item.company}{isOverdue(item,now)&&<span className="block text-xs text-amber-700 dark:text-amber-400">Pendente há 24h ou mais</span>}</td>
          <td className="p-3">{examLabels[item.examType]}</td><td className="p-3">{item.employeeCount}</td>
          <td className="p-3 whitespace-nowrap">{item.preferredDate.split('-').reverse().join('/')}</td>
          <td className="p-3"><select aria-label={'Situação de '+item.company} disabled={busy} className={field} value={item.status} onChange={e=>void changeStatus(item.id,e.target.value as AppointmentStatus)}>{appointmentStatuses.map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}</select></td>
        </tr>)}</tbody></table></div>}
        {hasMore&&<p className="text-xs text-muted-foreground">Exibindo as 50 solicitações mais recentes.</p>}
      </section>
    </>}
  </main>;
}
