'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useState } from 'react';
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
import type { Lead, ProposalTemplate } from '@/lib/types';
import { leadSchema, paymentMethods, contactSources, rejectionReasons } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Calendar, Search, Check, ChevronsUpDown, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const newLeadSchema = leadSchema.omit({
  id: true,
  createdAt: true,
  status: true,
  createdBy: true,
  createdByUid: true,
  proposalGeneratedCount: true,
  whatsappSentCount: true,
  editCount: true,
  previousStatus: true,
  proposalNumber: true,
  proposalVersion: true,
  observations: true,
  versionHistory: true,
});

type AddLeadModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (lead: z.infer<typeof newLeadSchema>) => void;
  seller: string;
  proposalTemplates: ProposalTemplate[];
  existingLeads?: Lead[];
};

export default function AddLeadModal({
  isOpen,
  onOpenChange,
  onSave,
  seller,
  proposalTemplates,
  existingLeads = [],
}: AddLeadModalProps) {
  const { toast } = useToast();
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  const form = useForm<z.infer<typeof newLeadSchema>>({
    resolver: zodResolver(newLeadSchema),
    defaultValues: {
      name: '',
      role: '',
      company: '',
      cnpj: '',
      email: '',
      whatsapp: '',
      proposalSummary: '',
      value: 0,
      paymentMethods: [{ method: 'Boleto' }],
      contactSource: { source: 'Google', indicatedBy: '' },
      rejectionReason: undefined,
      selectedTemplateId: null,
      budgetDate: today,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'paymentMethods',
  });

  // Memória Inteligente: Agrupar leads por empresa para permitir reuso de dados
  const customerMemory = useMemo(() => {
    const map = new Map<string, any>();
    
    // Ordenar por data para pegar os dados mais recentes de cada empresa
    const sortedLeads = [...existingLeads].sort((a, b) => {
      const dateA = toDate(a.createdAt)?.getTime() || 0;
      const dateB = toDate(b.createdAt)?.getTime() || 0;
      return dateB - dateA;
    });

    sortedLeads.forEach(lead => {
      // Identificador único: CNPJ ou Nome da Empresa
      const id = lead.cnpj?.replace(/\D/g, '') || lead.company.toLowerCase().trim();
      
      if (!map.has(id)) {
        map.set(id, {
          company: lead.company,
          name: lead.name,
          role: lead.role || '',
          cnpj: lead.cnpj,
          email: lead.email,
          whatsapp: lead.whatsapp,
          paymentMethods: lead.paymentMethods,
          contactSource: lead.contactSource,
          selectedTemplateId: lead.selectedTemplateId,
        });
      }
    });

    return Array.from(map.values());
  }, [existingLeads]);

  const handleSelectCustomer = (customer: any) => {
    form.setValue('company', customer.company, { shouldValidate: true });
    form.setValue('name', customer.name, { shouldValidate: true });
    form.setValue('role', customer.role, { shouldValidate: true });
    form.setValue('cnpj', customer.cnpj, { shouldValidate: true });
    form.setValue('email', customer.email, { shouldValidate: true });
    form.setValue('whatsapp', customer.whatsapp, { shouldValidate: true });
    form.setValue('paymentMethods', customer.paymentMethods, { shouldValidate: true });
    form.setValue('contactSource', customer.contactSource, { shouldValidate: true });
    
    if (customer.selectedTemplateId) {
      form.setValue('selectedTemplateId', customer.selectedTemplateId, { shouldValidate: true });
    }

    setIsCustomerSelectorOpen(false);
    toast({
      title: 'Dados Carregados',
      description: `Informações da empresa ${customer.company} preenchidas automaticamente.`,
    });
  };

  const onSubmit = (values: z.infer<typeof newLeadSchema>) => {
    onSave(values);
    onOpenChange(false);
    form.reset();
    toast({
      title: 'Lead Adicionado!',
      description: `O orçamento para ${values.company} foi criado por ${seller}.`,
    });
  };

  const contactSource = form.watch('contactSource.source');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Novo Orçamento</DialogTitle>
          <DialogDescription>
            Preencha as informações para criar um novo lead. Você pode buscar dados de clientes atendidos anteriormente.
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de Memória de Clientes */}
        <div className="px-4 pt-2">
          <Popover open={isCustomerSelectorOpen} onOpenChange={setIsCustomerSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isCustomerSelectorOpen}
                className="w-full justify-between bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors h-12"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {customerMemory.length > 0 
                      ? 'Pesquisar Cliente Existente (Memória)...' 
                      : 'Nenhum cliente no histórico'}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Digite o nome da empresa ou CNPJ..." />
                <CommandList>
                  <CommandEmpty>Nenhuma empresa encontrada no histórico.</CommandEmpty>
                  <CommandGroup heading="Clientes Recentes">
                    {customerMemory.slice(0, 10).map((customer) => (
                      <CommandItem
                        key={customer.cnpj || customer.company}
                        value={customer.company + ' ' + (customer.cnpj || '')}
                        onSelect={() => handleSelectCustomer(customer)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold">{customer.company}</span>
                          <span className="text-xs text-muted-foreground">
                            {customer.name} • {customer.cnpj}
                          </span>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            form.getValues('company') === customer.company ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] p-4 pt-2">
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
                </div>
                
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
                      {form.watch(`paymentMethods.${index}.method`)?.includes('Cartão de Crédito') && (
                          <FormField
                            control={form.control}
                            name={`paymentMethods.${index}.cardFee`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative">
                                    <Input type="number" placeholder="Taxa" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="w-24 pr-6"/>
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      )}
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
              <Button type="submit">Salvar Orçamento</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
