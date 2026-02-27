'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProposalTemplate, Plan, Service, ExtraService, InvestmentItem, ComplexityDefinition, PlanStructureItem, InvestmentOption, InvestmentOptionItem } from '@/lib/types';
import { planSchema, serviceSchema, investmentItemSchema, complexityDefinitionSchema, planStructureItemSchema, investmentOptionSchema } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle, Save, Pencil, X, Copy, Plus, Loader2, Bold, Italic, Underline, List, Link as LinkIcon, Smile, ShieldAlert, LayoutGrid, Coins } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, addDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logClientEvent } from '@/lib/audit-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const templateFormSchema = z.object({
  name: z.string().min(1, 'O nome do modelo é obrigatório.'),
  proposalObject: z.string().optional().default(''),
  serviceScope: z.string().optional().default(''),
  methodology: z.string().optional().default(''),
  psychosocialTools: z.string().optional().default(''),
  lgpdSecurity: z.string().optional().default(''),
  clientResponsibilities: z.string().optional().default(''),
  contractorResponsibilities: z.string().optional().default(''),
  preliminaryErgonomicAnalysis: z.string().optional().default(''),
  postErgonomicImplementation: z.string().optional().default(''),
  deadline: z.string().optional().default(''),
  investment: z.string().optional().default(''),
  strategicVision: z.string().optional().default(''),
  paymentTerms: z.string().optional().default(''),
  plans: z.array(planSchema).optional().default([]),
  exams: z.array(serviceSchema).optional().default([]),
  complexityDefinitions: z.array(complexityDefinitionSchema).optional().default([]),
  planStructure: z.array(planStructureItemSchema).optional().default([]),
  investmentOptions: z.array(investmentOptionSchema).optional().default([]),
});

const COMMON_EMOJIS = ['✅', '❌', '⚠️', '🛡️', '🚀', '📈', '📊', '💼', '📄', '🤝', '🏢', '🏗️', '👷', '👨', '⚕️', '🩺', '💡', '🔍', '📍', '📞', '📧'];

// Componente de Barra de Ferramentas para Edição de Texto
function FormattingToolbar({ textareaId }: { textareaId: string }) {
  const insertTag = (tag: string, closingTag?: string) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let replacement = '';
    if (tag === 'ul') {
        replacement = `<ul>\n  <li>${selectedText || 'Item'}</li>\n</ul>`;
    } else if (tag === 'a') {
        const url = window.prompt('Insira a URL (ex: https://google.com):', 'https://');
        if (!url) return;
        replacement = `<a href="${url}" target="_blank" style="color: #1b7689; text-decoration: underline; font-weight: bold;">${selectedText || 'Clique aqui'}</a>`;
    } else {
        replacement = `<${tag}>${selectedText}</${closingTag || tag}>`;
    }

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const insertEmoji = (emoji: string) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, start) + emoji + text.substring(end);
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return (
    <div className="flex items-center gap-1 mb-1 p-1 border rounded-t-md bg-muted/20 flex-wrap">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertTag('b')} title="Negrito">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertTag('i')} title="Itálico">
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertTag('u')} title="Sublinhado">
        <Underline className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertTag('ul')} title="Lista">
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertTag('a')} title="Inserir Link">
        <LinkIcon className="h-4 w-4" />
      </Button>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Emojis">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="grid grid-cols-6 gap-1">
            {COMMON_EMOJIS.map(emoji => (
              <Button key={emoji} type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-lg" onClick={() => insertEmoji(emoji)}>
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Componente para gerenciar serviços extras dentro de cada plano
function ExtraServicesFields({ planIndex }: { planIndex: number }) {
  const { control } = useFormContext<z.infer<typeof templateFormSchema>>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `plans.${planIndex}.extraServices`,
  });

  return (
    <div className="mt-4 space-y-3 bg-muted/30 p-3 rounded-md border border-dashed">
      <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        Serviços Adicionais
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => append({ name: '', value: 0 })}
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar Serviço Adicional
        </Button>
      </Label>
      
      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <FormField
                control={control}
                name={`plans.${planIndex}.extraServices.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Nome do serviço" {...field} className="h-8 text-sm" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`plans.${planIndex}.extraServices.${index}.value`}
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs pl-7"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic text-center py-2">Nenhum serviço adicional cadastrado para este plano.</p>
      )}
    </div>
  );
}

// Componente para gerenciar múltiplos itens de investimento dentro de cada plano
function PlanInvestmentFields({ planIndex }: { planIndex: number }) {
  const { control } = useFormContext<z.infer<typeof templateFormSchema>>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `plans.${planIndex}.investments`,
  });

  return (
    <div className="mt-4 space-y-3 bg-primary/5 p-3 rounded-md border border-primary/20">
      <Label className="font-bold text-xs uppercase tracking-wider text-primary flex items-center justify-between">
        Detalhamento do Investimento
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs border-primary/30 text-primary"
          onClick={() => append({ label: '', value: 0 })}
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar Linha de Investimento
        </Button>
      </Label>
      
      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <FormField
                control={control}
                name={`plans.${planIndex}.investments.${index}.label`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Descrição do investimento" {...field} className="h-8 text-sm" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`plans.${planIndex}.investments.${index}.value`}
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs pl-7"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic text-center py-2">Use o botão "+" para adicionar os valores de investimento deste plano.</p>
      )}
    </div>
  );
}

// Componente para gerenciar itens de uma opção de investimento
function InvestmentOptionItemFields({ optionIndex }: { optionIndex: number }) {
    const { control } = useFormContext<z.infer<typeof templateFormSchema>>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `investmentOptions.${optionIndex}.items`,
    });

    return (
        <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold text-muted-foreground flex justify-between items-center">
                Itens da Tabela (Serviço e Valor)
                <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => append({ id: `item-${Date.now()}-${Math.random()}`, service: '', value: '' })}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Item
                </Button>
            </Label>
            {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                    <FormField
                        control={control}
                        name={`investmentOptions.${optionIndex}.items.${index}.service`}
                        render={({ field }) => (
                            <FormItem className="flex-[3]">
                                <FormControl><Textarea placeholder="Descrição do serviço" {...field} className="h-10 min-h-0 text-xs" /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`investmentOptions.${optionIndex}.items.${index}.value`}
                        render={({ field }) => (
                            <FormItem className="flex-[1]">
                                <FormControl><Input placeholder="ex: R$ 1.000,00" {...field} className="h-10 text-xs" /></FormControl>
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-8 text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ))}
        </div>
    );
}

export default function ManageTemplatesPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const auth = useAuth();

  const templatesCollectionRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'proposal-templates') : null, [firestore, user]);
  const { data: templates, isLoading: areTemplatesLoading } = useCollection<ProposalTemplate>(templatesCollectionRef);
  
  const servicesCollectionRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'services') : null, [firestore, user]);
  const { data: servicesCatalog, isLoading: areServicesLoading } = useCollection<Service>(servicesCollectionRef);

  const form = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      proposalObject: '',
      serviceScope: '',
      methodology: '',
      psychosocialTools: '',
      lgpdSecurity: '',
      clientResponsibilities: '',
      contractorResponsibilities: '',
      preliminaryErgonomicAnalysis: '',
      postErgonomicImplementation: '',
      deadline: '',
      investment: '',
      strategicVision: '',
      paymentTerms: '',
      plans: [],
      exams: [],
      complexityDefinitions: [],
      planStructure: [],
      investmentOptions: [],
    },
  });

  const { fields: planFields, append: appendPlan, remove: removePlan } = useFieldArray({ control: form.control, name: 'plans' });
  const { fields: examFields, append: appendExam, remove: removeExam } = useFieldArray({ control: form.control, name: 'exams' });
  const { fields: complexityFields, append: appendComplexity, remove: removeComplexity } = useFieldArray({ control: form.control, name: 'complexityDefinitions' });
  const { fields: planStructureFields, append: appendPlanStructure, remove: removePlanStructure } = useFieldArray({ control: form.control, name: 'planStructure' });
  const { fields: investmentOptionsFields, append: appendInvestmentOption, remove: removeInvestmentOption } = useFieldArray({ control: form.control, name: 'investmentOptions' });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const resetForm = () => {
    form.reset({ name: '', proposalObject: '', serviceScope: '', methodology: '', psychosocialTools: '', lgpdSecurity: '', clientResponsibilities: '', contractorResponsibilities: '', preliminaryErgonomicAnalysis: '', postErgonomicImplementation: '', deadline: '', investment: '', strategicVision: '', paymentTerms: '', plans: [], exams: [], complexityDefinitions: [], planStructure: [], investmentOptions: [] });
    setEditingTemplateId(null);
  };

  const handleSaveTemplate = async (data: z.infer<typeof templateFormSchema>) => {
    if (!firestore) return;

    const plansWithIds = (data.plans || []).map(p => ({
      ...p,
      id: p.id || `plan-${Date.now()}-${Math.random()}`,
      extraServices: p.extraServices || [],
      investments: p.investments || []
    }));
    const examsWithIds = data.exams?.map(e => ({ ...e, id: e.id || `exam-${Date.now()}-${Math.random()}` })) || [];
    const complexWithIds = data.complexityDefinitions?.map(c => ({ ...c, id: c.id || `complexity-${Date.now()}-${Math.random()}` })) || [];
    const structureWithIds = data.planStructure?.map(s => ({ ...s, id: s.id || `struct-${Date.now()}-${Math.random()}` })) || [];
    const optionsWithIds = data.investmentOptions?.map(o => ({
        ...o,
        id: o.id || `opt-${Date.now()}-${Math.random()}`,
        items: o.items.map(i => ({ ...i, id: i.id || `item-${Date.now()}-${Math.random()}` }))
    })) || [];

    const templateData = {
        ...data,
        plans: plansWithIds,
        exams: examsWithIds,
        complexityDefinitions: complexWithIds,
        planStructure: structureWithIds,
        investmentOptions: optionsWithIds
    };

    if (editingTemplateId) {
      const templateRef = doc(firestore, 'proposal-templates', editingTemplateId);
      await setDoc(templateRef, templateData, { merge: true });
      logClientEvent('Edição de Modelo', auth, `Modelo: ${data.name}`);
      toast({ title: 'Sucesso', description: 'Modelo de proposta atualizado.' });
    } else {
      const newDocRef = doc(templatesCollectionRef!);
      await setDoc(newDocRef, { ...templateData, id: newDocRef.id });
      logClientEvent('Criação de Modelo', auth, `Modelo: ${data.name}`);
      toast({ title: 'Sucesso', description: 'Novo modelo de proposta adicionado.' });
    }
    resetForm();
  };

  const handleStartEditing = (template: ProposalTemplate) => {
    setEditingTemplateId(template.id);
    form.reset({
      ...template,
      methodology: template.methodology || '',
      psychosocialTools: template.psychosocialTools || '',
      lgpdSecurity: template.lgpdSecurity || '',
      preliminaryErgonomicAnalysis: template.preliminaryErgonomicAnalysis || '',
      postErgonomicImplementation: template.postErgonomicImplementation || '',
      plans: template.plans?.map(p => ({ 
        ...p, 
        extraServices: p.extraServices || [],
        investments: p.investments || [],
        auditSupport: p.auditSupport || '',
        strategicManagement: p.strategicManagement || '',
        specificManagement: p.specificManagement || ''
      })) || [],
      exams: template.exams || [],
      complexityDefinitions: template.complexityDefinitions || [],
      planStructure: template.planStructure || [],
      investmentOptions: template.investmentOptions || [],
    });
    if (formCardRef.current) {
      formCardRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditing = () => {
    resetForm();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!firestore) return;
    const templateToDelete = templates?.find(t => t.id === id);
    await deleteDoc(doc(firestore, 'proposal-templates', id));
    if (templateToDelete) {
        logClientEvent('Exclusão de Modelo', auth, `Modelo: ${templateToDelete.name}`);
    }
    if (id === editingTemplateId) {
      resetForm();
    }
    toast({ title: 'Sucesso', description: 'Modelo de proposta removido.' });
  };

  const handleDuplicateTemplate = async (template: ProposalTemplate) => {
    if (!firestore) return;
    const { id, ...templateData } = template;
    const newDocRef = doc(templatesCollectionRef!);
    const duplicatedTemplate = {
      ...templateData,
      id: newDocRef.id,
      name: `${template.name} (Cópia)`,
    };
    await setDoc(newDocRef, duplicatedTemplate);
    toast({ title: 'Sucesso', description: `Modelo "${template.name}" duplicado.` });
  };

  const renderRichTextFormArea = (label: string, fieldName: string) => (
    <FormField
      control={form.control}
      name={fieldName as any}
      render={({ field }) => {
        const id = `field-${fieldName.replace(/\./g, '-')}`;
        return (
          <FormItem className="space-y-2">
            <Label htmlFor={id} className="font-semibold">{label}</Label>
            <FormattingToolbar textareaId={id} />
            <FormControl>
              <Textarea id={id} placeholder={`Conteúdo para "${label}"`} {...field} rows={3} className="rounded-t-none" />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };
  
  const handleAddExamFromCatalog = (serviceId: string) => {
    if (!servicesCatalog || !serviceId) return;
    const service = servicesCatalog.find(s => s.id === serviceId);
    if (service) {
      const isAlreadyAdded = form.getValues('exams')?.some(exam => exam.id === service.id);
      if (isAlreadyAdded) {
        toast({
          variant: 'destructive',
          title: 'Serviço já adicionado',
          description: 'Este serviço já faz parte da lista de exames avulsos deste modelo.'
        });
        return;
      }
      appendExam(service);
      toast({
        title: 'Serviço Adicionado',
        description: `${service.service} foi adicionado à lista.`
      });
    }
  };
  
  if (isUserLoading || !user || areTemplatesLoading || areServicesLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Card ref={formCardRef}>
        <CardHeader>
          <CardTitle>{editingTemplateId ? 'Editar Modelo' : 'Adicionar Novo Modelo'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveTemplate)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><Label className="font-semibold">Nome do Modelo</Label><FormControl><Input placeholder="Ex: Treinamento NR-35" {...field} /></FormControl><FormMessage /></FormItem>)} />
              {renderRichTextFormArea('Objeto da Proposta', 'proposalObject')}
              {renderRichTextFormArea('Escopo do Serviço', 'serviceScope')}
              
              {renderRichTextFormArea('Metodologia', 'methodology')}
              {renderRichTextFormArea('Ferramentas de avaliação dos Fatores psicossociais', 'psychosocialTools')}
              {renderRichTextFormArea('Segurança LGPD', 'lgpdSecurity')}
              
              {renderRichTextFormArea('Da Contratada', 'contractorResponsibilities')}
              {renderRichTextFormArea('Da Contratante', 'clientResponsibilities')}
              
              {renderRichTextFormArea('Análise Ergonômica Preliminar', 'preliminaryErgonomicAnalysis')}
              {renderRichTextFormArea('Roteiro pós implementação da análise Ergonômica (não inclusa nesta proposta técnica)', 'postErgonomicImplementation')}
              
              {renderRichTextFormArea('Prazo para Realização dos Serviços', 'deadline')}
              
              <Card className="pt-4">
                <CardHeader className="py-0">
                    <CardTitle className="text-lg">Complexidade dos Contratos</CardTitle>
                    <p className="text-sm text-muted-foreground">"São considerados Contratos de Baixa Complexidade, Média Complexidade, Alta Complexidade:"</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    {complexityFields.map((field, index) => (
                        <div key={field.id} className="border p-4 rounded-md space-y-3 relative bg-card shadow-sm">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeComplexity(index)}><Trash2 className="h-4 w-4" /></Button>
                            <FormField control={form.control} name={`complexityDefinitions.${index}.title`} render={({ field }) => (<FormItem><Label className="font-semibold">Título (ex: Baixa Complexidade)</Label><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            {renderRichTextFormArea('Descrição Explicativa', `complexityDefinitions.${index}.description`)}
                        </div>
                    ))}
                    <div className="flex gap-2 flex-wrap">
                        <Button type="button" variant="outline" size="sm" onClick={() => appendComplexity({ id: `complex-${Date.now()}-low`, title: 'Baixa Complexidade', description: '' })}><Plus className="mr-1 h-3 w-3" /> Baixa</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendComplexity({ id: `complex-${Date.now()}-mid`, title: 'Média Complexidade', description: '' })}><Plus className="mr-1 h-3 w-3" /> Média</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendComplexity({ id: `complex-${Date.now()}-high`, title: 'Alta Complexidade', description: '' })}><Plus className="mr-1 h-3 w-3" /> Alta</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => appendComplexity({ id: `complex-${Date.now()}`, title: '', description: '' })}><Plus className="mr-1 h-3 w-3" /> Outro nível</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 italic">
                        Abaixo seguem as opções dos Planos, de acordo com a estratégia financeira da sua empresa. Investimento - Opções - Baixa Complexidade, Média Complexidade, Alta Complexidade:
                    </p>
                </CardContent>
              </Card>

              <Card className="pt-4">
                <CardHeader className="py-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5" /> Estrutura dos Planos
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Avalie o plano que melhor se adequa a estrutura organizacional da sua empresa hoje:</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    {planStructureFields.map((field, index) => (
                        <div key={field.id} className="border p-4 rounded-md space-y-3 relative bg-card shadow-sm">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removePlanStructure(index)}><Trash2 className="h-4 w-4" /></Button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`planStructure.${index}.plan`} render={({ field }) => (<FormItem><Label className="font-semibold">Plano</Label><FormControl><Input placeholder="Ex: Essencial" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name={`planStructure.${index}.profile`} render={({ field }) => (<FormItem><Label className="font-semibold">Perfil</Label><FormControl><Input placeholder="Ex: Regularização" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name={`planStructure.${index}.objective`} render={({ field }) => (<FormItem><Label className="font-semibold">Objetivo</Label><FormControl><Input placeholder="Ex: Atendimento a exigência legal" {...field} /></FormControl></FormItem>)} />
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendPlanStructure({ id: `struct-${Date.now()}`, plan: '', profile: '', objective: '' })}><Plus className="mr-1 h-3 w-3" /> Adicionar Linha na Estrutura</Button>
                </CardContent>
              </Card>

              {renderRichTextFormArea('Investimento Geral', 'investment')}

              <Card className="pt-4">
                <CardHeader className="py-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Coins className="h-5 w-5" /> Opções de Investimento (Customizável)
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Adicione diferentes opções de investimento com tabelas detalhadas.</p>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {investmentOptionsFields.map((field, index) => (
                        <div key={field.id} className="border p-4 rounded-md space-y-4 relative bg-card shadow-sm">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeInvestmentOption(index)}><Trash2 className="h-4 w-4" /></Button>
                            <FormField
                                control={form.control}
                                name={`investmentOptions.${index}.title`}
                                render={({ field }) => (
                                    <FormItem>
                                        <Label className="font-bold">Título da Opção (ex: 7.1. Investimento - Opção 1:)</Label>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            
                            <InvestmentOptionItemFields optionIndex={index} />

                            <FormField
                                control={form.control}
                                name={`investmentOptions.${index}.observations`}
                                render={({ field }) => (
                                    <FormItem>
                                        <Label className="text-xs font-bold text-muted-foreground">Observações da Opção</Label>
                                        <FormControl><Textarea placeholder="ex: OBS: os serviços do item 6.1 não estão inclusos..." {...field} className="h-20 text-xs" /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendInvestmentOption({ id: `opt-${Date.now()}`, title: '', items: [], observations: '' })}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Nova Opção de Investimento
                    </Button>
                </CardContent>
              </Card>

              {renderRichTextFormArea('Nossa Visão Estratégica', 'strategicVision')}
              
              {renderRichTextFormArea('Condições de Pagamento Adicionais', 'paymentTerms')}

              <Card className="pt-4">
                <CardHeader className="py-0">
                    <CardTitle className="text-lg">Planos de Investimento</CardTitle>
                    <p className="text-sm text-muted-foreground">"As opções de planos são de acordo com a estratégia financeira da sua empresa."</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {planFields.map((field, index) => (
                    <div key={field.id} className="border p-4 rounded-md space-y-3 relative bg-card shadow-sm">
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removePlan(index)}><Trash2 className="h-4 w-4" /></Button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`plans.${index}.name`} render={({ field }) => (<FormItem><Label className="font-semibold">Plano</Label><FormControl><Input placeholder="Ex: Plano Bronze 1.0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`plans.${index}.employeeRange`} render={({ field }) => (<FormItem><Label className="font-semibold">Faixa de Funcionários</Label><FormControl><Input placeholder="Ex: 1 a 300" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {renderRichTextFormArea('Finalidade', `plans.${index}.purpose`)}
                        <FormField control={form.control} name={`plans.${index}.focus`} render={({ field }) => (<FormItem><Label className="font-semibold">Foco</Label><FormControl><Input placeholder="Ex: Prevenção de multas" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>

                      {renderRichTextFormArea('Diferencial', `plans.${index}.differentiator`)}
                      {renderRichTextFormArea('Serviços Inclusos', `plans.${index}.servicesIncluded`)}
                      {renderRichTextFormArea('Suporte em auditorias e fiscalizações', `plans.${index}.auditSupport`)}
                      {renderRichTextFormArea('Gestão Estratégica', `plans.${index}.strategicManagement`)}
                      {renderRichTextFormArea('Gestão específica por contrato', `plans.${index}.specificManagement`)}

                      <PlanInvestmentFields planIndex={index} />
                      <ExtraServicesFields planIndex={index} />

                      <div className="pt-4 border-t">
                        <FormField control={form.control} name={`plans.${index}.paymentType`} render={({ field }) => (
                          <FormItem>
                            <Label className="font-semibold">Modelo de Contratação</Label>
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2 pt-2">
                                <FormItem className="flex items-center space-x-2">
                                  <RadioGroupItem value="unique" id={`unique-${index}`} />
                                  <Label htmlFor={`unique-${index}`}>Único</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                  <RadioGroupItem value="monthly" id={`monthly-${index}`} />
                                  <Label htmlFor={`monthly-${index}`}>Mensal</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                  <RadioGroupItem value="active_contract_monthly" id={`active-contract-${index}`} />
                                  <Label htmlFor={`active-contract-${index}`}>Por Contrato ativo, mensal.</Label>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => appendPlan({ id: `plan-${Date.now()}`, name: '', employeeRange: '', servicesIncluded: '', investment: 0, investments: [], paymentType: 'unique', purpose: '', differentiator: '', focus: '', auditSupport: '', strategicManagement: '', specificManagement: '', extraServices: [] })}><Plus className="mr-2 h-4 w-4" /> Adicionar Plano</Button>
                </CardContent>
              </Card>

              <Card className="pt-4"><CardHeader className="py-0"><CardTitle className="text-lg">Investimentos - Exames/Serviços Avulsos (Gerais)</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {examFields.map((field, index) => (
                    <div key={field.id} className="border p-4 rounded-md space-y-3 relative bg-card shadow-sm">
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeExam(index)}><Trash2 className="h-4 w-4" /></Button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name={`exams.${index}.service`} render={({ field }) => (<FormItem><Label className="font-semibold">Serviço</Label><FormControl><Input placeholder="Ex: ASO" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`exams.${index}.description`} render={({ field }) => (<FormItem><Label className="font-semibold">Descrição</Label><FormControl><Input placeholder="Ex: Clínico" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`exams.${index}.value`} render={({ field }) => (
                          <FormItem>
                            <Label className="font-semibold">Valor</Label>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">R$</span>
                                <Input type="number" step="0.01" placeholder="0,00" {...field} className="pl-9" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-end gap-4 pt-4 border-t">
                      <div className="flex-1 min-w-[250px]">
                          <Label className="font-semibold">Adicionar do Catálogo</Label>
                          <Select onValueChange={handleAddExamFromCatalog} value="none">
                              <SelectTrigger>
                                  <SelectValue placeholder="Selecione um serviço do catálogo..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none" disabled>Selecione um serviço...</SelectItem>
                                  {servicesCatalog && servicesCatalog.length > 0 ? (
                                      servicesCatalog.map(service => (
                                          <SelectItem key={service.id} value={service.id}>
                                              {service.service} ({formatCurrency(service.value)})
                                          </SelectItem>
                                      ))
                                  ) : (
                                      <SelectItem value="no-data" disabled>Nenhum serviço no catálogo</SelectItem>
                                  )}
                              </SelectContent>
                          </Select>
                      </div>
                      <Button type="button" variant="outline" onClick={() => appendExam({ id: `exam-${Date.now()}`, service: '', description: '', value: 0 })}>
                          <Plus className="mr-2 h-4 w-4" /> Adicionar Serviço Manualmente
                      </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 pt-4">
                {editingTemplateId && (<Button type="button" variant="ghost" onClick={handleCancelEditing}><X className="mr-2 h-4 w-4" /> Cancelar Edição</Button>)}
                <Button type="submit"><Save className="mr-2 h-4 w-4" />{editingTemplateId ? 'Salvar Alterações' : 'Adicionar Modelo'}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-headline font-semibold mb-4">Modelos Existentes</h2>
        {(!templates || templates.length === 0) ? (
          <p className="text-center text-muted-foreground py-8">Nenhum modelo cadastrado.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {templates.map(template => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader><CardTitle className="truncate">{template.name}</CardTitle></CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-muted-foreground p-4 rounded-md bg-muted/50 border space-y-4 h-96 overflow-y-auto">
                    {template.proposalObject && <div><h4 className='font-bold text-foreground'>Objeto da Proposta</h4><div className="whitespace-pre-wrap prose prose-xs" dangerouslySetInnerHTML={{ __html: template.proposalObject }} /></div>}
                    {template.serviceScope && <div><h4 className='font-bold text-foreground'>Escopo do Serviço</h4><div className="whitespace-pre-wrap prose prose-xs" dangerouslySetInnerHTML={{ __html: template.serviceScope }} /></div>}
                    
                    {template.complexityDefinitions && template.complexityDefinitions.length > 0 && (
                        <div>
                            <h4 className='font-bold text-foreground'>Definições de Complexidade</h4>
                            <ul className="list-disc list-inside">
                                {template.complexityDefinitions.map(c => <li key={c.id}>{c.title}</li>)}
                            </ul>
                        </div>
                    )}

                    {template.contractorResponsibilities && <div><h4 className='font-bold text-foreground'>Da Contratada</h4><div className="whitespace-pre-wrap prose prose-xs" dangerouslySetInnerHTML={{ __html: template.contractorResponsibilities }} /></div>}
                    {template.clientResponsibilities && <div><h4 className='font-bold text-foreground'>Da Contratante</h4><div className="whitespace-pre-wrap prose prose-xs" dangerouslySetInnerHTML={{ __html: template.clientResponsibilities }} /></div>}
                    
                    {template.deadline && <div><h4 className='font-bold text-foreground'>Prazo</h4><div className="whitespace-pre-wrap prose prose-xs" dangerouslySetInnerHTML={{ __html: template.deadline }} /></div>}
                    
                    {template.investmentOptions && template.investmentOptions.length > 0 && (
                        <div>
                            <h4 className='font-bold text-foreground'>Opções de Investimento ({template.investmentOptions.length})</h4>
                            <ul className="list-disc list-inside">
                                {template.investmentOptions.map(o => <li key={o.id}>{o.title || '(Sem título)'}</li>)}
                            </ul>
                        </div>
                    )}

                    {template.investment && <div><h4 className='font-bold text-foreground'>Investimento Geral</h4><div className="whitespace-pre-wrap prose prose-xs" dangerouslySetInnerHTML={{ __html: template.investment }} /></div>}
                    {template.strategicVision && <div><h4 className='font-bold text-foreground'>Visão Estratégica</h4><div className="whitespace-pre-wrap prose prose-xs" dangerouslySetInnerHTML={{ __html: template.strategicVision }} /></div>}
                    {template.paymentTerms && (
                      <div><h4 className='font-bold text-foreground'>Condições de Pagamento Adicionais</h4><div className="whitespace-pre-wrap prose prose-xs" dangerouslySetInnerHTML={{ __html: template.paymentTerms }} /></div>
                    )}
                    {template.plans && template.plans.length > 0 && (
                      <div>
                        <h4 className='font-bold text-foreground'>Planos Cadastrados ({template.plans.length})</h4>
                        <ul className="list-disc list-inside">
                          {template.plans.map(p => (
                            <li key={p.id}>
                                {p.name} - 
                                <span className="font-bold text-primary ml-1">
                                {p.investments && p.investments.length > 0 
                                    ? formatCurrency(p.investments.reduce((sum, inv) => sum + inv.value, 0))
                                    : formatCurrency(p.investment || 0)
                                }
                                </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDuplicateTemplate(template)}><Copy className="mr-2 h-4 w-4" />Duplicar</Button>
                  <Button variant="outline" size="sm" onClick={() => handleStartEditing(template)}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Excluir</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente o modelo "<span className="font-bold">{template.name}</span>".</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
