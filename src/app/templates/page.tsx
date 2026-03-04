'use client';

import { useState, useEffect, useRef } from 'react';
import type { 
  ProposalTemplate, 
  Plan, 
  Service, 
  ComplexityDefinition, 
  PlanStructureItem, 
  InvestmentOption, 
  InvestmentOptionItem,
  DiverseServiceItem,
  UserProfile 
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  PlusCircle, 
  Save, 
  Pencil, 
  X, 
  Loader2, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  Link as LinkIcon, 
  Smile, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  LayoutDashboard,
  Coins,
  Table as TableIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { logClientEvent } from '@/lib/audit-client';
import { cn } from '@/lib/utils';

const COMMON_EMOJIS = ['✅', '❌', '⚠️', '🛡️', '🚀', '📈', '📊', '💼', '📄', '🤝', '🏢', '🏗️', '👷', '👨‍⚕️', '🩺', '💡', '🔍', '📍', '📞', '📧'];

export default function TemplatesPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const auth = useAuth();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [proposalObject, setProposalObject] = useState('');
  const [serviceScope, setServiceScope] = useState('');
  const [methodology, setMethodology] = useState('');
  const [psychosocialTools, setPsychosocialTools] = useState('');
  const [lgpdSecurity, setLgpdSecurity] = useState('');
  const [contractorResponsibilities, setContractorResponsibilities] = useState('');
  const [clientResponsibilities, setClientResponsibilities] = useState('');
  const [preliminaryErgonomicAnalysis, setPreliminaryErgonomicAnalysis] = useState('');
  const [postErgonomicImplementation, setPostErgonomicImplementation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [strategicVision, setStrategicVision] = useState('');
  const [investment, setInvestment] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [complexityDefinitions, setComplexityDefinitions] = useState<ComplexityDefinition[]>([]);
  const [planStructure, setPlanStructure] = useState<PlanStructureItem[]>([]);
  const [investmentOptions, setInvestmentOptions] = useState<InvestmentOption[]>([]);
  const [diverseServices, setDiverseServices] = useState<DiverseServiceItem[]>([]);
  const [exams, setExams] = useState<Service[]>([]);

  const templatesRef = useMemoFirebase(() => firestore ? collection(firestore, 'proposal-templates') : null, [firestore]);
  const { data: templates, isLoading: areTemplatesLoading } = useCollection<ProposalTemplate>(templatesRef);

  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const resetForm = () => {
    setName('');
    setProposalObject('');
    setServiceScope('');
    setMethodology('');
    setPsychosocialTools('');
    setLgpdSecurity('');
    setContractorResponsibilities('');
    setClientResponsibilities('');
    setPreliminaryErgonomicAnalysis('');
    setPostErgonomicImplementation('');
    setDeadline('');
    setStrategicVision('');
    setInvestment('');
    setPaymentTerms('');
    setPlans([]);
    setComplexityDefinitions([]);
    setPlanStructure([]);
    setInvestmentOptions([]);
    setDiverseServices([]);
    setExams([]);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!firestore || !isAdmin) return;
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome do modelo é obrigatório.' });
      return;
    }

    setIsSaving(true);
    const docId = editingId || doc(collection(firestore, 'proposal-templates')).id;
    const templateData: ProposalTemplate = {
      id: docId,
      name,
      proposalObject,
      serviceScope,
      methodology,
      psychosocialTools,
      lgpdSecurity,
      contractorResponsibilities,
      clientResponsibilities,
      preliminaryErgonomicAnalysis,
      postErgonomicImplementation,
      deadline,
      strategicVision,
      investment,
      paymentTerms,
      plans,
      complexityDefinitions,
      planStructure,
      investmentOptions,
      diverseServices,
      exams,
    };

    try {
      await setDoc(doc(firestore, 'proposal-templates', docId), templateData);
      logClientEvent(editingId ? 'Edição de Modelo' : 'Criação de Modelo', auth, `Modelo: ${name}`);
      toast({ title: 'Sucesso', description: 'Modelo de proposta salvo com sucesso.' });
      resetForm();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Ocorreu um problema ao salvar no banco de dados.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (template: ProposalTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setProposalObject(template.proposalObject || '');
    setServiceScope(template.serviceScope || '');
    setMethodology(template.methodology || '');
    setPsychosocialTools(template.psychosocialTools || '');
    setLgpdSecurity(template.lgpdSecurity || '');
    setContractorResponsibilities(template.contractorResponsibilities || '');
    setClientResponsibilities(template.clientResponsibilities || '');
    setPreliminaryErgonomicAnalysis(template.preliminaryErgonomicAnalysis || '');
    setPostErgonomicImplementation(template.postErgonomicImplementation || '');
    setDeadline(template.deadline || '');
    setStrategicVision(template.strategicVision || '');
    setInvestment(template.investment || '');
    setPaymentTerms(template.paymentTerms || '');
    setPlans(template.plans || []);
    setComplexityDefinitions(template.complexityDefinitions || []);
    setPlanStructure(template.planStructure || []);
    setInvestmentOptions(template.investmentOptions || []);
    setDiverseServices(template.diverseServices || []);
    setExams(template.exams || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !isAdmin) return;
    try {
      await deleteDoc(doc(firestore, 'proposal-templates', id));
      toast({ title: 'Removido', description: 'Modelo excluído com sucesso.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir o modelo.' });
    }
  };

  // Rich Text Helpers
  const insertFormat = (field: string, tag: 'b' | 'i' | 'u' | 'li' | 'link' | 'emoji', value?: string) => {
    const setters: Record<string, Function> = {
      proposalObject: setProposalObject,
      serviceScope: setServiceScope,
      methodology: setMethodology,
      psychosocialTools: setPsychosocialTools,
      lgpdSecurity: setLgpdSecurity,
      contractorResponsibilities: setContractorResponsibilities,
      clientResponsibilities: setClientResponsibilities,
      preliminaryErgonomicAnalysis: setPreliminaryErgonomicAnalysis,
      postErgonomicImplementation: setPostErgonomicImplementation,
      deadline: setDeadline,
      strategicVision: setStrategicVision,
      investment: setInvestment,
      paymentTerms: setPaymentTerms,
    };

    const setter = setters[field];
    if (!setter) return;

    if (tag === 'emoji') {
      setter((prev: string) => prev + value);
      return;
    }

    if (tag === 'link') {
      const url = window.prompt('Insira a URL:', 'https://');
      if (url) {
        setter((prev: string) => `${prev} <a href="${url}" target="_blank" style="color: #1b7689; font-weight: bold; text-decoration: underline;">Link</a> `);
      }
      return;
    }

    const tags: Record<string, [string, string]> = {
      b: ['<b>', '</b>'],
      i: ['<i>', '</i>'],
      u: ['<u>', '</u>'],
      li: ['<li>', '</li>'],
    };

    const [open, close] = tags[tag];
    setter((prev: string) => prev + open + close);
  };

  // List Management Helpers
  const addComplexity = (type: 'Baixa' | 'Média' | 'Alta') => {
    setComplexityDefinitions(prev => [
      ...prev,
      { id: `comp-${Date.now()}`, title: `${type} Complexidade`, description: '' }
    ]);
  };

  const addPlanStructureItem = () => {
    setPlanStructure(prev => [
      ...prev,
      { id: `struct-${Date.now()}`, plan: '', profile: '', objective: '' }
    ]);
  };

  const addPlan = () => {
    setPlans(prev => [
      ...prev,
      { 
        id: `plan-${Date.now()}`, 
        name: '', 
        employeeRange: '', 
        servicesIncluded: '', 
        paymentType: 'unique',
        investments: [],
        extraServices: [],
        purpose: '',
        differentiator: '',
        focus: '',
        auditSupport: '',
        strategicManagement: '',
        specificManagement: ''
      }
    ]);
  };

  const addInvestmentOption = () => {
    setInvestmentOptions(prev => [
      ...prev,
      { id: `opt-${Date.now()}`, title: 'Opção de Investimento', items: [{ id: '1', service: '', value: '' }], observations: '' }
    ]);
  };

  const addDiverseServiceItem = () => {
    setDiverseServices(prev => [
      ...prev,
      { 
        id: `ds-${Date.now()}`, 
        item: (prev.length + 1).toString(), 
        employeeRange: '', 
        servicesIncluded: '', 
        investment: '', 
        onDemand: '' 
      }
    ]);
  };

  if (isUserLoading || areTemplatesLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const FormatToolbar = ({ field }: { field: string }) => (
    <div className="flex items-center gap-1 mb-1 p-1 bg-muted/30 rounded-t-md border-b">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat(field, 'b')}><Bold className="h-4 w-4"/></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat(field, 'i')}><Italic className="h-4 w-4"/></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat(field, 'u')}><Underline className="h-4 w-4"/></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat(field, 'li')}><List className="h-4 w-4"/></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat(field, 'link')}><LinkIcon className="h-4 w-4"/></Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4"/></Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="grid grid-cols-6 gap-1">
            {COMMON_EMOJIS.map(emoji => (
              <Button key={emoji} variant="ghost" size="sm" className="h-8 w-8 p-0 text-lg" onClick={() => insertFormat(field, 'emoji', emoji)}>{emoji}</Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>{editingId ? 'Editar Modelo' : 'Criar Novo Modelo de Proposta'}</CardTitle>
          <CardDescription>Configure os textos e seções que serão carregados ao gerar uma proposta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome do Modelo (Interno)</Label>
              <Input placeholder="Ex: Modelo SST - PME" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Objeto da Proposta</Label>
              <FormatToolbar field="proposalObject" />
              <Textarea value={proposalObject} onChange={e => setProposalObject(e.target.value)} rows={3} className="rounded-t-none" />
            </div>

            <div className="space-y-2">
              <Label>Escopo do Serviço</Label>
              <FormatToolbar field="serviceScope" />
              <Textarea value={serviceScope} onChange={e => setServiceScope(e.target.value)} rows={4} className="rounded-t-none" />
            </div>

            <div className="space-y-2">
              <Label>Metodologia</Label>
              <FormatToolbar field="methodology" />
              <Textarea value={methodology} onChange={e => setMethodology(e.target.value)} rows={3} className="rounded-t-none" />
            </div>

            <div className="space-y-2">
              <Label>Ferramentas de avaliação dos Fatores psicossociais</Label>
              <FormatToolbar field="psychosocialTools" />
              <Textarea value={psychosocialTools} onChange={e => setPsychosocialTools(e.target.value)} rows={3} className="rounded-t-none" />
            </div>

            <div className="space-y-2">
              <Label>Segurança LGPD</Label>
              <FormatToolbar field="lgpdSecurity" />
              <Textarea value={lgpdSecurity} onChange={e => setLgpdSecurity(e.target.value)} rows={3} className="rounded-t-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-y py-6 bg-muted/10 px-4 rounded-lg">
              <div className="space-y-2">
                <Label className="text-primary font-bold">Da Contratada (Responsabilidades)</Label>
                <FormatToolbar field="contractorResponsibilities" />
                <Textarea value={contractorResponsibilities} onChange={e => setContractorResponsibilities(e.target.value)} rows={4} className="rounded-t-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold">Da Contratante (Responsabilidades)</Label>
                <FormatToolbar field="clientResponsibilities" />
                <Textarea value={clientResponsibilities} onChange={e => setClientResponsibilities(e.target.value)} rows={4} className="rounded-t-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Análise Ergonômica Preliminar</Label>
              <FormatToolbar field="preliminaryErgonomicAnalysis" />
              <Textarea value={preliminaryErgonomicAnalysis} onChange={e => setPreliminaryErgonomicAnalysis(e.target.value)} rows={3} className="rounded-t-none" />
            </div>

            <div className="space-y-2">
              <Label>Roteiro pós implementação da análise Ergonômica (não inclusa nesta proposta técnica)</Label>
              <FormatToolbar field="postErgonomicImplementation" />
              <Textarea value={postErgonomicImplementation} onChange={e => setPostErgonomicImplementation(e.target.value)} rows={3} className="rounded-t-none" />
            </div>

            <Card className="bg-primary/5 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">São considerados Contratos de Baixa Complexidade, Média Complexidade, Alta Complexidade:</CardTitle>
                <CardDescription>Defina os critérios técnicos para cada nível.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addComplexity('Baixa')}><Plus className="mr-2 h-4 w-4"/> Baixa</Button>
                  <Button variant="outline" size="sm" onClick={() => addComplexity('Média')}><Plus className="mr-2 h-4 w-4"/> Média</Button>
                  <Button variant="outline" size="sm" onClick={() => addComplexity('Alta')}><Plus className="mr-2 h-4 w-4"/> Alta</Button>
                </div>
                <div className="space-y-3">
                  {complexityDefinitions.map((def, idx) => (
                    <div key={def.id} className="p-3 border rounded-md bg-background relative group">
                      <Input 
                        value={def.title} 
                        onChange={e => {
                          const newDefs = [...complexityDefinitions];
                          newDefs[idx].title = e.target.value;
                          setComplexityDefinitions(newDefs);
                        }}
                        className="mb-2 font-bold"
                      />
                      <Textarea 
                        placeholder="Descrição técnica..."
                        value={def.description}
                        onChange={e => {
                          const newDefs = [...complexityDefinitions];
                          newDefs[idx].description = e.target.value;
                          setComplexityDefinitions(newDefs);
                        }}
                        rows={2}
                      />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setComplexityDefinitions(prev => prev.filter(d => d.id !== def.id))}
                      >
                        <Trash2 className="h-3 w-3"/>
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs italic text-muted-foreground pt-2">
                  As opções de planos são de acordo com a estratégia financeira da sua empresa.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-lg">Estrutura dos Planos</CardTitle>
                <CardDescription>Tabela comparativa de perfis e objetivos.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#1b7689] hover:bg-[#1b7689]">
                      <TableHead className="text-white">PLANO</TableHead>
                      <TableHead className="text-white">PERFIL</TableHead>
                      <TableHead className="text-white">OBJETIVO</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planStructure.map((item, idx) => (
                      <TableRow key={item.id} className="bg-[#d4e9ee]">
                        <TableCell><Input value={item.plan} onChange={e => {
                          const newS = [...planStructure];
                          newS[idx].plan = e.target.value;
                          setPlanStructure(newS);
                        }} className="border-none bg-transparent shadow-none"/></TableCell>
                        <TableCell><Input value={item.profile} onChange={e => {
                          const newS = [...planStructure];
                          newS[idx].profile = e.target.value;
                          setPlanStructure(newS);
                        }} className="border-none bg-transparent shadow-none"/></TableCell>
                        <TableCell><Input value={item.objective} onChange={e => {
                          const newS = [...planStructure];
                          newS[idx].objective = e.target.value;
                          setPlanStructure(newS);
                        }} className="border-none bg-transparent shadow-none"/></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => setPlanStructure(prev => prev.filter(s => s.id !== item.id))}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="outline" size="sm" className="mt-4 w-full border-dashed" onClick={addPlanStructureItem}>
                  <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Linha à Estrutura
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Prazo para Realização dos Serviços</Label>
              <FormatToolbar field="deadline" />
              <Textarea value={deadline} onChange={e => setDeadline(e.target.value)} rows={2} className="rounded-t-none" />
            </div>

            <div className="space-y-2">
              <Label>Nossa Visão Estratégica</Label>
              <FormatToolbar field="strategicVision" />
              <Textarea value={strategicVision} onChange={e => setStrategicVision(e.target.value)} rows={3} className="rounded-t-none" />
            </div>

            <div className="space-y-4 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2"><LayoutDashboard className="h-5 w-5 text-primary"/> Planos de Investimento</h3>
                <Button onClick={addPlan} variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Novo Plano</Button>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {plans.map((plan, pIdx) => (
                  <Card key={plan.id} className="border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <div className="space-y-1">
                          <Label>Nome do Plano</Label>
                          <Input value={plan.name} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].name = e.target.value;
                            setPlans(newP);
                          }} placeholder="Ex: Plano Essencial"/>
                        </div>
                        <div className="space-y-1">
                          <Label>Modelo de Contratação</Label>
                          <Select 
                            value={plan.paymentType} 
                            onValueChange={(v: any) => {
                              const newP = [...plans];
                              newP[pIdx].paymentType = v;
                              setPlans(newP);
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unique">Único</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="active_contract_monthly">Por Contrato ativo, mensal.</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setPlans(prev => prev.filter(p => p.id !== plan.id))} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Finalidade</Label>
                          <Textarea value={plan.purpose} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].purpose = e.target.value;
                            setPlans(newP);
                          }} className="text-xs min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Diferencial</Label>
                          <Textarea value={plan.differentiator} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].differentiator = e.target.value;
                            setPlans(newP);
                          }} className="text-xs min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Foco</Label>
                          <Input value={plan.focus} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].focus = e.target.value;
                            setPlans(newP);
                          }} className="text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Faixa de Funcionários</Label>
                          <Input value={plan.employeeRange} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].employeeRange = e.target.value;
                            setPlans(newP);
                          }} className="text-xs" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Serviços Inclusos</Label>
                          <Textarea value={plan.servicesIncluded} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].servicesIncluded = e.target.value;
                            setPlans(newP);
                          }} className="text-xs min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Suporte em auditorias e fiscalizações</Label>
                          <Textarea value={plan.auditSupport} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].auditSupport = e.target.value;
                            setPlans(newP);
                          }} className="text-xs min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Gestão Estratégica</Label>
                          <Textarea value={plan.strategicManagement} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].strategicManagement = e.target.value;
                            setPlans(newP);
                          }} className="text-xs min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Gestão específica por contrato</Label>
                          <Textarea value={plan.specificManagement} onChange={e => {
                            const newP = [...plans];
                            newP[pIdx].specificManagement = e.target.value;
                            setPlans(newP);
                          }} className="text-xs min-h-[60px]" />
                        </div>
                      </div>
                      
                      <div className="col-span-full border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <Label className="font-bold flex items-center gap-2"><Coins className="h-4 w-4"/> Composição do Investimento</Label>
                          <Button variant="outline" size="sm" onClick={() => {
                            const newP = [...plans];
                            newP[pIdx].investments = [...(newP[pIdx].investments || []), { label: '', value: 0 }];
                            setPlans(newP);
                          }}><Plus className="h-3 w-3 mr-1"/> Adicionar Item</Button>
                        </div>
                        <div className="space-y-2">
                          {plan.investments?.map((inv, invIdx) => (
                            <div key={invIdx} className="flex items-center gap-2">
                              <Input placeholder="Descrição (ex: PCMSO)" value={inv.label} onChange={e => {
                                const newP = [...plans];
                                newP[pIdx].investments![invIdx].label = e.target.value;
                                setPlans(newP);
                              }} className="flex-1" />
                              <div className="relative w-32">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                                <Input type="number" step="0.01" value={inv.value} onChange={e => {
                                  const newP = [...plans];
                                  newP[pIdx].investments![invIdx].value = parseFloat(e.target.value) || 0;
                                  setPlans(newP);
                                }} className="pl-7" />
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => {
                                const newP = [...plans];
                                newP[pIdx].investments = newP[pIdx].investments!.filter((_, i) => i !== invIdx);
                                setPlans(newP);
                              }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-full border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <Label className="font-bold">Serviços Adicionais</Label>
                          <Button variant="outline" size="sm" onClick={() => {
                            const newP = [...plans];
                            newP[pIdx].extraServices = [...(newP[pIdx].extraServices || []), { name: '', value: 0 }];
                            setPlans(newP);
                          }}><Plus className="h-3 w-3 mr-1"/> Adicionar Serviço</Button>
                        </div>
                        <div className="space-y-2">
                          {plan.extraServices?.map((es, esIdx) => (
                            <div key={esIdx} className="flex items-center gap-2">
                              <Input placeholder="Nome do serviço" value={es.name} onChange={e => {
                                const newP = [...plans];
                                newP[pIdx].extraServices![esIdx].name = e.target.value;
                                setPlans(newP);
                              }} className="flex-1" />
                              <div className="relative w-32">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                                <Input type="number" step="0.01" value={es.value} onChange={e => {
                                  const newP = [...plans];
                                  newP[pIdx].extraServices![esIdx].value = parseFloat(e.target.value) || 0;
                                  setPlans(newP);
                                }} className="pl-7" />
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => {
                                const newP = [...plans];
                                newP[pIdx].extraServices = newP[pIdx].extraServices!.filter((_, i) => i !== esIdx);
                                setPlans(newP);
                              }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TableIcon className="h-5 w-5 text-primary" /> 
                  Opções de Investimento Customizáveis
                </h3>
                <Button onClick={addInvestmentOption} variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> 
                  Nova Tabela
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {investmentOptions.map((opt, optIdx) => (
                  <Card key={opt.id} className="bg-muted/20">
                    <CardHeader className="flex flex-row justify-between items-center pb-4">
                      <Input value={opt.title} onChange={e => {
                        const newO = [...investmentOptions];
                        newO[optIdx].title = e.target.value;
                        setInvestmentOptions(newO);
                      }} className="font-bold max-w-sm" />
                      <Button variant="ghost" size="icon" onClick={() => setInvestmentOptions(prev => prev.filter(o => o.id !== opt.id))} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#8ec7d1] hover:bg-[#8ec7d1]">
                            <TableHead className="text-[#1b7689] font-bold">SERVIÇO</TableHead>
                            <TableHead className="text-[#1b7689] font-bold w-[250px] text-center">INVESTIMENTO</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {opt.items.map((item, itemIdx) => (
                            <TableRow key={item.id} className="bg-white">
                              <TableCell><Textarea value={item.service} onChange={e => {
                                const newO = [...investmentOptions];
                                newO[optIdx].items[itemIdx].service = e.target.value;
                                setInvestmentOptions(newO);
                              }} className="min-h-[40px] resize-none border-none shadow-none focus-visible:ring-0"/></TableCell>
                              <TableCell><Input value={item.value} onChange={e => {
                                const newO = [...investmentOptions];
                                newO[optIdx].items[itemIdx].value = e.target.value;
                                setInvestmentOptions(newO);
                              }} placeholder="Ex: R$ 120,00" className="text-center font-bold text-[#1b7689] border-none shadow-none focus-visible:ring-0"/></TableCell>
                              <TableCell><Button variant="ghost" size="icon" onClick={() => {
                                const newO = [...investmentOptions];
                                newO[optIdx].items = newO[optIdx].items.filter((_, i) => i !== itemIdx);
                                setInvestmentOptions(newO);
                              }}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button variant="ghost" size="sm" className="w-full border-t border-dashed rounded-none" onClick={() => {
                        const newO = [...investmentOptions];
                        newO[optIdx].items = [...newO[optIdx].items, { id: Date.now().toString(), service: '', value: '' }];
                        setInvestmentOptions(newO);
                      }}>+ Adicionar Linha</Button>
                      <div className="space-y-1">
                        <Label className="text-xs">Observações da Tabela</Label>
                        <Textarea value={opt.observations} onChange={e => {
                          const newO = [...investmentOptions];
                          newO[optIdx].observations = e.target.value;
                          setInvestmentOptions(newO);
                        }} className="text-xs" placeholder="Ex: Valores válidos por 30 dias..." />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TableIcon className="h-5 w-5 text-primary" /> 
                  Opções de Investimento - Serviços Diversos
                </h3>
                <Button onClick={addDiverseServiceItem} variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> 
                  Adicionar Linha
                </Button>
              </div>
              <Card className="bg-muted/20 overflow-hidden">
                <CardContent className="pt-6 overflow-x-auto p-0">
                  <Table className="w-full min-w-[800px] border-collapse">
                    <TableHeader>
                      <TableRow className="bg-[#1b7689] hover:bg-[#1b7689]">
                        <TableHead className="text-white font-bold w-[60px] text-center border-r border-white/20">Item</TableHead>
                        <TableHead className="text-white font-bold w-[150px] border-r border-white/20">Faixa de Funcionários</TableHead>
                        <TableHead className="text-white font-bold border-r border-white/20">Serviços Inclusos</TableHead>
                        <TableHead className="text-white font-bold w-[150px] text-center border-r border-white/20">Investimento</TableHead>
                        <TableHead className="text-white font-bold w-[120px] text-center">Por Demanda</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diverseServices.map((ds, dsIdx) => (
                        <TableRow key={ds.id} className="bg-[#d4e9ee] border-t border-[#1b7689]">
                          <TableCell className="text-center border-r border-[#1b7689]">
                            <Input value={ds.item} onChange={e => {
                              const newDS = [...diverseServices];
                              newDS[dsIdx].item = e.target.value;
                              setDiverseServices(newDS);
                            }} className="border-none bg-transparent shadow-none text-center h-full p-1" />
                          </TableCell>
                          <TableCell className="border-r border-[#1b7689]">
                            <Input value={ds.employeeRange} onChange={e => {
                              const newDS = [...diverseServices];
                              newDS[dsIdx].employeeRange = e.target.value;
                              setDiverseServices(newDS);
                            }} className="border-none bg-transparent shadow-none h-full p-1" placeholder="Ex: 1 a 5" />
                          </TableCell>
                          <TableCell className="border-r border-[#1b7689]">
                            <Textarea value={ds.servicesIncluded} onChange={e => {
                              const newDS = [...diverseServices];
                              newDS[dsIdx].servicesIncluded = e.target.value;
                              setDiverseServices(newDS);
                            }} className="border-none bg-transparent shadow-none min-h-[60px] resize-none p-1 text-xs" placeholder="Descrição do serviço..." />
                          </TableCell>
                          <TableCell className="text-center border-r border-[#1b7689]">
                            <Input value={ds.investment} onChange={e => {
                              const newDS = [...diverseServices];
                              newDS[dsIdx].investment = e.target.value;
                              setDiverseServices(newDS);
                            }} className="border-none bg-transparent shadow-none text-center font-bold h-full p-1" placeholder="R$ 0,00" />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input value={ds.onDemand} onChange={e => {
                              const newDS = [...diverseServices];
                              newDS[dsIdx].onDemand = e.target.value;
                              setDiverseServices(newDS);
                            }} className="border-none bg-transparent shadow-none text-center h-full p-1" placeholder="Ex: sim" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setDiverseServices(prev => prev.filter(item => item.id !== ds.id))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2 border-t pt-6">
              <Label>Condições de Pagamento Adicionais</Label>
              <FormatToolbar field="paymentTerms" />
              <Textarea value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} rows={3} className="rounded-t-none" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6">
            {editingId && <Button variant="ghost" onClick={resetForm}><X className="mr-2 h-4 w-4"/> Cancelar</Button>}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
              {editingId ? 'Atualizar Modelo' : 'Salvar Novo Modelo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelos Salvos</CardTitle>
          <CardDescription>Lista de todos os modelos de proposta configurados no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Modelo</TableHead>
                <TableHead>Seções</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates && templates.length > 0 ? (
                templates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {t.plans?.length > 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{t.plans.length} Planos</span>}
                        {t.investmentOptions?.length > 0 && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">{t.investmentOptions.length} Opções</span>}
                        {t.diverseServices?.length > 0 && <span className="text-[10px] bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded-full">{t.diverseServices.length} Serv. Diversos</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4"/></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir modelo "{t.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação removerá permanentemente este modelo de proposta. Orçamentos que já usam este modelo não serão afetados até que a proposta seja regerada.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(t.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nenhum modelo cadastrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
