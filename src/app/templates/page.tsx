'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProposalTemplate, Plan, Exam } from '@/lib/types';
import {
  proposalTemplates as defaultProposalTemplates,
  planSchema,
  examSchema,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Trash2,
  PlusCircle,
  Save,
  Pencil,
  X,
  Copy,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const getSavedTemplates = (): ProposalTemplate[] => {
  try {
    const savedTemplates = localStorage.getItem('proposalTemplates');
    if (savedTemplates) {
      const parsed = JSON.parse(savedTemplates);
      // Ensure arrays exist and items have IDs
      return parsed.map((t: ProposalTemplate) => ({ 
          ...t, 
          plans: t.plans ? t.plans.map((p, index) => ({...p, id: p.id || `plan-${t.id}-${index}`})) : [],
          exams: t.exams ? t.exams.map((e, index) => ({...e, id: e.id || `exam-${t.id}-${index}`})) : [],
        }));
    }
  } catch (error) {
    console.error('Failed to parse templates from localStorage:', error);
  }
  // If nothing is saved, initialize with default and save it.
  try {
    const defaultWithArrays = defaultProposalTemplates.map(t => ({...t, plans: t.plans || [], exams: t.exams || []}));
    localStorage.setItem(
      'proposalTemplates',
      JSON.stringify(defaultWithArrays)
    );
  } catch (error) {
    console.error('Failed to save default templates to localStorage:', error);
  }
  return defaultProposalTemplates.map(t => ({...t, plans: t.plans || [], exams: t.exams || []}));
};

const saveTemplates = (templates: ProposalTemplate[]) => {
  try {
    localStorage.setItem('proposalTemplates', JSON.stringify(templates));
  } catch (error) {
    console.error('Failed to save templates to localStorage:', error);
  }
};

const templateFormSchema = z.object({
    name: z.string().min(1, 'O nome do modelo é obrigatório.'),
    proposalObject: z.string().min(1, 'O objeto da proposta é obrigatório.'),
    serviceScope: z.string(),
    clientResponsibilities: z.string(),
    contractorResponsibilities: z.string(),
    deadline: z.string(),
    investment: z.string(),
    strategicVision: z.string(),
    plans: z.array(planSchema),
    exams: z.array(examSchema).optional(),
});


export default function ManageTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      proposalObject: '',
      serviceScope: '',
      clientResponsibilities: '',
      contractorResponsibilities: '',
      deadline: '',
      investment: '',
      strategicVision: '',
      plans: [],
      exams: [],
    },
  });

  const { fields: planFields, append: appendPlan, remove: removePlan } = useFieldArray({
    control: form.control,
    name: 'plans',
  });

  const { fields: examFields, append: appendExam, remove: removeExam } = useFieldArray({
    control: form.control,
    name: 'exams',
  });

  const loadTemplates = useCallback(() => {
    setTemplates(getSavedTemplates());
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);
  
  const resetForm = () => {
    form.reset({
        name: '',
        proposalObject: '',
        serviceScope: '',
        clientResponsibilities: '',
        contractorResponsibilities: '',
        deadline: '',
        investment: '',
        strategicVision: '',
        plans: [],
        exams: [],
    });
    setEditingTemplateId(null);
  };

  const handleSaveTemplate = (data: z.infer<typeof templateFormSchema>) => {
    const currentTemplates = getSavedTemplates();
    let updatedTemplates;
    
    const plansWithIds = data.plans.map(p => ({ ...p, id: p.id || `plan-${Date.now()}-${Math.random()}` }));
    const examsWithIds = data.exams?.map(e => ({ ...e, id: e.id || `exam-${Date.now()}-${Math.random()}` })) || [];
    
    const fullTemplateData: Omit<ProposalTemplate, 'id'> = {
        ...data,
        plans: plansWithIds,
        exams: examsWithIds,
    };

    if (editingTemplateId) {
        updatedTemplates = currentTemplates.map(t =>
            t.id === editingTemplateId ? { ...fullTemplateData, id: editingTemplateId } : t
        );
        toast({ title: 'Sucesso', description: 'Modelo de proposta atualizado.' });
    } else {
        const newId = `template-${Date.now()}`;
        updatedTemplates = [...currentTemplates, { ...fullTemplateData, id: newId }];
        toast({ title: 'Sucesso', description: 'Novo modelo de proposta adicionado.' });
    }
    saveTemplates(updatedTemplates);
    loadTemplates();
    resetForm();
  };

  const handleStartEditing = (template: ProposalTemplate) => {
    setEditingTemplateId(template.id);
    form.reset({ ...template, plans: template.plans || [], exams: template.exams || [] });
    if (formCardRef.current) {
        formCardRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditing = () => {
    resetForm();
  };

  const handleDeleteTemplate = (id: string) => {
    const currentTemplates = getSavedTemplates();
    const updatedTemplates = currentTemplates.filter(t => t.id !== id);
    saveTemplates(updatedTemplates);
    loadTemplates();
    if(id === editingTemplateId) {
        resetForm();
    }
    toast({ title: 'Sucesso', description: 'Modelo de proposta removido.' });
  };

  const handleDuplicateTemplate = (template: ProposalTemplate) => {
    const newId = `template-${Date.now()}`;
    const duplicatedTemplate = {
      ...template,
      id: newId,
      name: `${template.name} (Cópia)`,
    };
    const currentTemplates = getSavedTemplates();
    const updatedTemplates = [...currentTemplates, duplicatedTemplate];
    saveTemplates(updatedTemplates);
    loadTemplates();
    toast({
      title: 'Sucesso',
      description: `Modelo "${template.name}" duplicado.`,
    });
  };

  const renderFormField = (label: string, fieldName: keyof Omit<ProposalTemplate, 'id' | 'name' | 'plans' | 'exams'>) => (
    <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
            <FormItem className="space-y-2">
                <Label htmlFor={`template-${fieldName}`}>{label}</Label>
                 <Textarea
                    id={`template-${fieldName}`}
                    placeholder={`Conteúdo para "${label}"`}
                    {...field}
                    rows={3}
                />
                <FormMessage />
            </FormItem>
        )}
    />
  );
  
  return (
    <div className="flex flex-col gap-8">
      <Card ref={formCardRef}>
        <CardHeader>
          <CardTitle>
            {editingTemplateId ? 'Editar Modelo' : 'Adicionar Novo Modelo'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveTemplate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label>Nome do Modelo</Label>
                    <FormControl>
                      <Input placeholder="Ex: Treinamento NR-35" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderFormField('Objeto da Proposta', 'proposalObject')}
              {renderFormField('Escopo do Serviço', 'serviceScope')}
              {renderFormField('Da Contratante', 'clientResponsibilities')}
              {renderFormField('Da Contratada', 'contractorResponsibilities')}
              {renderFormField('Prazo para Realização dos Serviços', 'deadline')}
              {renderFormField('Investimento', 'investment')}
              {renderFormField('Nossa Visão Estratégica', 'strategicVision')}

                {/* Plans Section */}
                <Card className="pt-4">
                    <CardHeader className="py-0">
                        <CardTitle className="text-lg">Planos de Investimento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {planFields.map((field, index) => (
                            <div key={field.id} className="border p-4 rounded-md space-y-3 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removePlan(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name={`plans.${index}.name`} render={({ field }) => (<FormItem><Label>Plano</Label><FormControl><Input placeholder="Ex: Plano Bronze 1.0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name={`plans.${index}.employeeRange`} render={({ field }) => (<FormItem><Label>Faixa de Funcionários</Label><FormControl><Input placeholder="Ex: 1 a 300" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name={`plans.${index}.servicesIncluded`} render={({ field }) => (<FormItem><Label>Serviços Inclusos</Label><FormControl><Textarea placeholder="Lista de serviços..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name={`plans.${index}.investment`} render={({ field }) => (<FormItem><Label>Investimento (R$)</Label><FormControl><Input type="number" placeholder="990.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`plans.${index}.paymentType`} render={({ field }) => (<FormItem><Label>Tipo de Pagamento</Label><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem className="flex items-center space-x-2"><RadioGroupItem value="unique" id={`unique-${index}`} /><Label htmlFor={`unique-${index}`}>Único</Label></FormItem><FormItem className="flex items-center space-x-2"><RadioGroupItem value="monthly" id={`monthly-${index}`} /><Label htmlFor={`monthly-${index}`}>Mensal</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                        ))}
                         <Button type="button" variant="outline" onClick={() => appendPlan({ id: `plan-${Date.now()}`, name: '', employeeRange: '', servicesIncluded: '', investment: 0, paymentType: 'unique' })}>
                            <Plus className="mr-2 h-4 w-4" /> Adicionar Plano
                        </Button>
                    </CardContent>
                </Card>

                {/* Exams Section */}
                <Card className="pt-4">
                    <CardHeader className="py-0">
                        <CardTitle className="text-lg">Investimentos - Exames</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {examFields.map((field, index) => (
                            <div key={field.id} className="border p-4 rounded-md space-y-3 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeExam(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <FormField control={form.control} name={`exams.${index}.service`} render={({ field }) => (<FormItem><Label>Serviço</Label><FormControl><Input placeholder="Ex: ASO" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name={`exams.${index}.description`} render={({ field }) => (<FormItem><Label>Descrição</Label><FormControl><Input placeholder="Ex: Clínico" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name={`exams.${index}.value`} render={({ field }) => (<FormItem><Label>Valor (R$)</Label><FormControl><Input type="number" placeholder="50.60" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                        ))}
                         <Button type="button" variant="outline" onClick={() => appendExam({ id: `exam-${Date.now()}`, service: '', description: '', value: 0 })}>
                            <Plus className="mr-2 h-4 w-4" /> Adicionar Exame
                        </Button>
                    </CardContent>
                </Card>


              <div className="flex justify-end gap-2 pt-4">
                {editingTemplateId && (
                  <Button type="button" variant="ghost" onClick={handleCancelEditing}>
                    <X className="mr-2 h-4 w-4" /> Cancelar Edição
                  </Button>
                )}
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> 
                  {editingTemplateId ? 'Salvar Alterações' : 'Adicionar Modelo'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-headline font-semibold mb-4">
          Modelos Existentes
        </h2>
        {templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum modelo cadastrado.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {templates.map(template => (
              <Card
                key={template.id}
                className="flex flex-col"
              >
                  <>
                    <CardHeader>
                      <CardTitle className="truncate">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="text-sm text-muted-foreground p-4 rounded-md bg-muted/50 border space-y-4 h-96 overflow-y-auto">
                        <div>
                            <h4 className='font-bold text-foreground'>Objeto da Proposta</h4>
                            <p className="whitespace-pre-wrap">{template.proposalObject}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Escopo do Serviço</h4>
                            <p className="whitespace-pre-wrap">{template.serviceScope}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Da Contratante</h4>
                            <p className="whitespace-pre-wrap">{template.clientResponsibilities}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Da Contratada</h4>
                            <p className="whitespace-pre-wrap">{template.contractorResponsibilities}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Prazo</h4>
                            <p className="whitespace-pre-wrap">{template.deadline}</p>
                        </div>
                        <div>
                            <h4 className='font-bold text-foreground'>Investimento</h4>
                            <p className="whitespace-pre-wrap">{template.investment}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Visão Estratégica</h4>
                            <p className="whitespace-pre-wrap">{template.strategicVision}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEditing(template)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Você tem certeza?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. Isso excluirá
                                permanentemente o modelo "
                                <span className="font-bold">{template.name}</span>
                                ".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

    