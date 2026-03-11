'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Lead, VersionHistoryEntry, ProposalTemplate, ProposalArea } from '@/lib/types';
import { leadSchema, paymentMethods, contactSources, rejectionReasons } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/utils';

type EditLeadModalProps = {
  lead: Lead;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (lead: Lead) => void;
  currentSeller: string;
  proposalTemplates: ProposalTemplate[];
  proposalAreas: ProposalArea[];
};

export default function EditLeadModal({
  lead,
  isOpen,
  onOpenChange,
  onSave,
  currentSeller,
  proposalTemplates,
  proposalAreas,
}: EditLeadModalProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
    defaultValues: lead,
  });

  useEffect(() => {
    if (lead) {
       const processedHistory = (lead.versionHistory || []).map(entry => ({
        ...entry,
        editedAt: toDate(entry.editedAt) || undefined,
      }));

      form.reset({
        ...lead,
        role: lead.role || '',
        value: lead.value === null ? 0 : lead.value,
        paymentMethods: lead.paymentMethods.length > 0 ? lead.paymentMethods : [{ method: 'Boleto' }],
        createdAt: toDate(lead.createdAt), 
        versionHistory: processedHistory,
        budgetDate: lead.budgetDate || (toDate(lead.createdAt)?.toISOString().split('T')[0]),
      });
    }
  }, [lead, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'paymentMethods',
  });

  const onSubmit = (values: z.infer<typeof leadSchema>) => {
    const newVersionNumber = lead.proposalNumber ? (lead.proposalVersion + 1) : 0;

    const newHistoryEntry: VersionHistoryEntry = {
        version: newVersionNumber,
        editedBy: currentSeller,
        editedAt: new Date(), 
    };

    const newHistory = [...(values.versionHistory || []), newHistoryEntry];
    
    onSave({ 
      ...lead, 
      ...values, 
      editCount: (lead.editCount || 0) + 1,
      proposalVersion: newVersionNumber,
      versionHistory: newHistory,
    });
    onOpenChange(false);
    toast({
      title: 'Lead Atualizado!',
      description: `As informações de ${values.company} foram salvas.`,
    });
  };

  const contactSource = form.watch('contactSource.source');
  const activeAreas = useMemo(() => proposalAreas.filter(a => a.active || a.acronym === lead.proposalArea), [proposalAreas, lead.proposalArea]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Lead</DialogTitle>
          <DialogDescription>
            Altere as informações do lead abaixo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budgetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          Data do Orçamento
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="proposalArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área e Código do Serviço</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a área" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeAreas.map(area => (
                              <SelectItem key={area.id} value={area.acronym}>
                                {area.acronym} - {area.serviceCode} ({area.name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do contato" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Gerente de Compras" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="contato@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="11999998888" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proposalSummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resumo da Proposta</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva o serviço oferecido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor do Orçamento</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">R$</span>
                          <Input type="number" step="0.01" placeholder="0,00" {...field} className="pl-9" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="selectedTemplateId"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Modelo de Proposta Padrão</FormLabel>
                      <Select
                        onValueChange={value => field.onChange(value === 'none' ? null : value)}
                        value={field.value || 'none'}
                      >
                      <FormControl>
                          <SelectTrigger>
                          <SelectValue placeholder="Nenhum (usará proposta padrão)" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="none">Nenhum (usará proposta padrão)</SelectItem>
                          {proposalTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                          ))}
                      </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Formas de Pagamento</FormLabel>
                  <div className="space-y-2 mt-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                       <FormField
                          control={form.control}
                          name={`paymentMethods.${index}.method`}
                          render={({ field }) => (
                            <FormItem className='flex-1'>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o método" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {paymentMethods.map(method => (
                                    <SelectItem key={method} value={method}>{method}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ method: 'Boleto' })}>
                    Adicionar Pagamento
                  </Button>
                </div>


                <FormField
                  control={form.control}
                  name="contactSource.source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem do Contato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a origem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contactSources.map(source => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {contactSource === 'Indicação' && (
                  <FormField
                    control={form.control}
                    name="contactSource.indicatedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indicado por</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome de quem indicou" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                 <FormField
                  control={form.control}
                  name="rejectionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo da Perda (se aplicável)</FormLabel>
                       <Select onValueChange={value => field.onChange(value === 'none' ? undefined : value)} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motivo da perda" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {rejectionReasons.map(reason => (
                            <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>        
        </Form>
      </DialogContent>
    </Dialog>
  );
}
