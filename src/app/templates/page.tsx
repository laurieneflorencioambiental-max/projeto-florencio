'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Plus, 
  ShieldCheck,
  LayoutDashboard,
  Coins,
  Table as TableIcon,
  Search,
  BookMarked,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logClientEvent } from '@/lib/audit-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Carregamento dinâmico do editor rico apenas no cliente (SSR: false)
const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor'), {
  ssr: false,
  loading: () => <Skeleton className="h-32 w-full" />,
});

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

  // Catalog State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);

  const templatesRef = useMemoFirebase(() => firestore ? collection(firestore, 'proposal-templates') : null, [firestore]);
  const { data: templates, isLoading: areTemplatesLoading } = useCollection<ProposalTemplate>(templatesRef);

  const servicesRef = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
  const { data: servicesCatalog, isLoading: areServicesLoading } = useCollection<Service>(servicesRef);

  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  const filteredCatalog = useMemo(() => {
    if (!servicesCatalog) return [];
    return servicesCatalog.filter(s => 
      s.service.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(catalogSearch.toLowerCase())
    );
  }, [servicesCatalog, catalogSearch]);

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

  const handleSave = () => {
    if (!firestore || !isAdmin) return;
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome do modelo é obrigatório.' });
      return;
    }

    setIsSaving(true);
    const docId = editingId || doc(collection(firestore, 'proposal-templates')).id;
    const templateRef = doc(firestore, 'proposal-templates', docId);
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

    setDoc(templateRef, templateData)
      .then(() => {
        if (auth) logClientEvent(editingId ? 'Edição de Modelo' : 'Criação de Modelo', auth, `Modelo: ${name}`);
        toast({ title: 'Sucesso', description: 'Modelo de proposta salvo com sucesso.' });
        resetForm();
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: templateRef.path,
          operation: editingId ? 'update' : 'create',
          requestResourceData: templateData,
        }));
      })
      .finally(() => {
        setIsSaving(false);
      });
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

  const handleDuplicate = (template: ProposalTemplate) => {
    if (!firestore || !isAdmin) return;
    
    const newDocRef = doc(collection(firestore, 'proposal-templates'));
    const duplicatedData: ProposalTemplate = {
      ...template,
      id: newDocRef.id,
      name: `${template.name} (Cópia)`,
    };

    setDoc(newDocRef, duplicatedData)
      .then(() => {
        if (auth) logClientEvent('Duplicação de Modelo', auth, `Modelo: ${template.name}`);
        toast({ title: 'Modelo Duplicado', description: `Uma cópia de "${template.name}" foi criada com sucesso.` });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newDocRef.path,
          operation: 'create',
          requestResourceData: duplicatedData,
        }));
      });
  };

  const handleDelete = (id: string) => {
    if (!firestore || !isAdmin) return;
    const templateRef = doc(firestore, 'proposal-templates', id);
    
    deleteDoc(templateRef)
      .then(() => {
        toast({ title: 'Removido', description: 'Modelo excluído com sucesso.' });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: templateRef.path,
          operation: 'delete',
        }));
      });
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
        investment: 0,
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

  const handleAddFromCatalog = () => {
    if (!servicesCatalog) return;
    const selectedServices = servicesCatalog.filter(s => selectedCatalogIds.includes(s.id));
    
    const newExams = [...exams];
    selectedServices.forEach(s => {
        newExams.push({
            id: `copy-${Date.now()}-${s.id}`,
            service: s.service,
            description: s.description,
            value: s.value
        });
    });

    setExams(newExams);
    setIsCatalogModalOpen(false);
    setSelectedCatalogIds([]);
    setCatalogSearch('');
    toast({ title: 'Serviços Adicionados', description: `${selectedServices.length} itens incorporados ao modelo.` });
  };

  if (isUserLoading || areTemplatesLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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
              <RichTextEditor value={proposalObject} onChange={setProposalObject} minHeight="min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label>Escopo do Serviço</Label>
              <RichTextEditor value={serviceScope} onChange={setServiceScope} minHeight="min-h-[120px]" />
            </div>

            <div className="space-y-2">
              <Label>Metodologia</Label>
              <RichTextEditor value={methodology} onChange={setMethodology} minHeight="min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label>Ferramentas de avaliação dos Fatores psicossociais</Label>
              <RichTextEditor value={psychosocialTools} onChange={setPsychosocialTools} minHeight="min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label>Segurança LGPD</Label>
              <RichTextEditor value={lgpdSecurity} onChange={setLgpdSecurity} minHeight="min-h-[80px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-y py-6 bg-muted/10 px-4 rounded-lg">
              <div className="space-y-2">
                <Label className="text-primary font-bold">Da Contratada (Responsabilidades)</Label>
                <RichTextEditor value={contractorResponsibilities} onChange={setContractorResponsibilities} minHeight="min-h-[120px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold">Da Contratante (Responsabilidades)</Label>
                <RichTextEditor value={clientResponsibilities} onChange={setClientResponsibilities} minHeight="min-h-[120px]" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Análise Ergonômica Preliminar</Label>
              <RichTextEditor value={preliminaryErgonomicAnalysis} onChange={setPreliminaryErgonomicAnalysis} minHeight="min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label>Roteiro pós implementação da análise Ergonômica (não inclusa nesta proposta técnica)</Label>
              <RichTextEditor value={postErgonomicImplementation} onChange={setPostErgonomicImplementation} minHeight="min-h-[80px]" />
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
                      <RichTextEditor 
                        value={def.description}
                        onChange={val => {
                          const newDefs = [...complexityDefinitions];
                          newDefs[idx].description = val;
                          setComplexityDefinitions(newDefs);
                        }}
                        minHeight="min-h-[60px]"
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
              <RichTextEditor value={deadline} onChange={setDeadline} minHeight="min-h-[60px]" />
            </div>

            <div className="space-y-2">
              <Label>Nossa Visão Estratégica</Label>
              <RichTextEditor value={strategicVision} onChange={setStrategicVision} minHeight="min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label>Investimento</Label>
              <RichTextEditor value={investment} onChange={setInvestment} minHeight="min-h-[80px]" placeholder="Digite manualmente os valores e condições..." />
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
                              <SelectItem value="unique">Pagamento Único</SelectItem>
                              <SelectItem value="monthly">Pagamento Mensal</SelectItem>
                              <SelectItem value="active_contract_monthly">Pagamento Por Contrato ativo, mensal</SelectItem>
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
                          <RichTextEditor value={plan.purpose} onChange={val => {
                            const newP = [...plans];
                            newP[pIdx].purpose = val;
                            setPlans(newP);
                          }} minHeight="min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Diferencial</Label>
                          <RichTextEditor value={plan.differentiator} onChange={val => {
                            const newP = [...plans];
                            newP[pIdx].differentiator = val;
                            setPlans(newP);
                          }} minHeight="min-h-[60px]" />
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
                          <RichTextEditor value={plan.servicesIncluded} onChange={val => {
                            const newP = [...plans];
                            newP[pIdx].servicesIncluded = val;
                            setPlans(newP);
                          }} minHeight="min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Suporte em auditorias e fiscalizações</Label>
                          <RichTextEditor value={plan.auditSupport} onChange={val => {
                            const newP = [...plans];
                            newP[pIdx].auditSupport = val;
                            setPlans(newP);
                          }} minHeight="min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Gestão Estratégica</Label>
                          <RichTextEditor value={plan.strategicManagement} onChange={val => {
                            const newP = [...plans];
                            newP[pIdx].strategicManagement = val;
                            setPlans(newP);
                          }} minHeight="min-h-[60px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Gestão específica por contrato</Label>
                          <RichTextEditor value={plan.specificManagement} onChange={val => {
                            const newP = [...plans];
                            newP[pIdx].specificManagement = val;
                            setPlans(newP);
                          }} minHeight="min-h-[60px]" />
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
                              <TableCell><RichTextEditor value={item.service} onChange={val => {
                                const newO = [...investmentOptions];
                                newO[optIdx].items[itemIdx].service = val;
                                setInvestmentOptions(newO);
                              }} minHeight="min-h-[40px]" /></TableCell>
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
                        <RichTextEditor value={opt.observations || ''} onChange={val => {
                          const newO = [...investmentOptions];
                          newO[optIdx].observations = val;
                          setInvestmentOptions(newO);
                        }} minHeight="min-h-[60px]" placeholder="Ex: Valores válidos por 30 dias..." />
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
              {diverseServices && diverseServices.length > 0 && (
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
                              <RichTextEditor value={ds.servicesIncluded} onChange={val => {
                                const newDS = [...diverseServices];
                                newDS[dsIdx].servicesIncluded = val;
                                setDiverseServices(newDS);
                              }} minHeight="min-h-[60px]" />
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
              )}
            </div>

            <div className="space-y-4 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-primary" /> 
                  Investimentos Adicionais - Exames/Serviços Avulsos
                </h3>
                <div className="flex gap-2">
                    <Button onClick={() => setIsCatalogModalOpen(true)} variant="outline" size="sm">
                        <Search className="mr-2 h-4 w-4" /> 
                        Buscar do Catálogo
                    </Button>
                    <Button onClick={() => setExams(prev => [...prev, { id: `manual-${Date.now()}`, service: '', description: '', value: 0 }])} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" /> 
                        Inserir Manualmente
                    </Button>
                </div>
              </div>
              
              {exams.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-primary/5">
                                <TableHead>Serviço</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="w-[150px]">Valor</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {exams.map((exam, idx) => (
                                <TableRow key={exam.id}>
                                    <TableCell>
                                        <Input 
                                            value={exam.service} 
                                            onChange={e => {
                                                const newExams = [...exams];
                                                newExams[idx].service = e.target.value;
                                                setExams(newExams);
                                            }} 
                                            placeholder="Nome do serviço..."
                                            className="h-8 text-sm"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            value={exam.description} 
                                            onChange={e => {
                                                const newExams = [...exams];
                                                newExams[idx].description = e.target.value;
                                                setExams(newExams);
                                            }} 
                                            placeholder="Notas/Unidade..."
                                            className="h-8 text-sm"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                value={exam.value} 
                                                onChange={e => {
                                                    const newExams = [...exams];
                                                    newExams[idx].value = parseFloat(e.target.value) || 0;
                                                    setExams(newExams);
                                                }} 
                                                className="h-8 text-sm pl-7"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => setExams(prev => prev.filter((_, i) => i !== idx))}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-6">
              <Label>Condições de Pagamento Adicionais</Label>
              <RichTextEditor value={paymentTerms || ''} onChange={setPaymentTerms} minHeight="min-h-[80px]" />
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
                        {t.investmentOptions && t.investmentOptions.length > 0 && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">{t.investmentOptions.length} Opções</span>}
                        {t.diverseServices && t.diverseServices.length > 0 && <span className="text-[10px] bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded-full">{t.diverseServices.length} Serv. Diversos</span>}
                        {t.exams && t.exams.length > 0 && <span className="text-[10px] bg-green-500/10 text-green-700 px-1.5 py-0.5 rounded-full">{t.exams.length} Exames</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} title="Editar"><Pencil className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(t)} title="Duplicar"><Copy className="h-4 w-4"/></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive" title="Excluir"><Trash2 className="h-4 w-4"/></Button>
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

      {/* Catalog Selector Modal */}
      <Dialog open={isCatalogModalOpen} onOpenChange={setIsCatalogModalOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <BookMarked className="h-5 w-5" />
                    Catálogo de Serviços
                </DialogTitle>
                <DialogDescription>
                    Pesquise e selecione serviços para adicionar a este modelo de proposta.
                </DialogDescription>
            </DialogHeader>
            
            <div className="relative my-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Pesquisar por nome ou descrição..." 
                    className="pl-9"
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                />
            </div>

            <ScrollArea className="flex-1 border rounded-md">
                {areServicesLoading ? (
                    <div className="flex flex-col items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground mt-2">Carregando catálogo...</p>
                    </div>
                ) : filteredCatalog.length > 0 ? (
                    <div className="p-0">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Serviço</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Valor Padrão</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCatalog.map(service => (
                                    <TableRow 
                                        key={service.id} 
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => {
                                            setSelectedCatalogIds(prev => 
                                                prev.includes(service.id) 
                                                ? prev.filter(id => id !== service.id) 
                                                : [...prev, service.id]
                                            );
                                        }}
                                    >
                                        <TableCell onClick={e => e.stopPropagation()}>
                                            <Checkbox 
                                                checked={selectedCatalogIds.includes(service.id)} 
                                                onCheckedChange={() => {
                                                    setSelectedCatalogIds(prev => 
                                                        prev.includes(service.id) 
                                                        ? prev.filter(id => id !== service.id) 
                                                        : [...prev, service.id]
                                                    );
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{service.service}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{service.description}</TableCell>
                                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(service.value)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-muted-foreground">
                        Nenhum serviço encontrado no catálogo para "{catalogSearch}".
                    </div>
                )}
            </ScrollArea>

            <DialogFooter className="pt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {selectedCatalogIds.length} item(ns) selecionado(s)
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => {
                        setIsCatalogModalOpen(false);
                        setSelectedCatalogIds([]);
                    }}>Cancelar</Button>
                    <Button onClick={handleAddFromCatalog} disabled={selectedCatalogIds.length === 0}>
                        Adicionar ao Modelo
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
