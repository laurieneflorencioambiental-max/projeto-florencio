'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useState, useEffect } from 'react';
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
import type { Lead, ProposalTemplate, ProposalArea } from '@/lib/types';
import { leadSchema, paymentMethods, contactSources, rejectionReasons } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Calendar, Check, ChevronsUpDown, History, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const normalizeTemplateSearch = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const filterTemplates = (value: string, search: string, keywords?: string[]) => {
  const haystack = normalizeTemplateSearch((keywords || [value]).join(' '));
  const terms = normalizeTemplateSearch(search).split(/\s+/);
  return terms.every(term => haystack.includes(term)) ? 1 : 0;
};

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
  proposalAreaAcronym: true,
  proposalServiceCode: true,
  proposalViewed: true,
  proposalViewedAt: true,
  proposalViewCount: true,
  proposalLastViewedAt: true,
});

type AddLeadModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (lead: z.infer<typeof newLeadSchema>) => void;
  seller: string;
  proposalTemplates: ProposalTemplate[];
  existingLeads?: Lead[];
  proposalAreas: ProposalArea[];
};

export default function AddLeadModal({
  isOpen,
  onOpenChange,
  onSave,
  seller,
  proposalTemplates,
  existingLeads = [],
  proposalAreas,
}: AddLeadModalProps) {
  const { toast } = useToast();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [templateSearchOpen, setTemplateSearchOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) setTemplateSearchOpen(false);
  }, [isOpen]);
  
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
      rejectionReason: null,
      selectedTemplateId: null,
      budgetDate: today,
      proposalArea: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'paymentMethods',
  });

  const customerMemory = useMemo(() => {
    const map = new Map<string, any>();
    
    const sortedLeads = [...existingLeads].sort((a, b) => {
      const dateA = toDate(a.createdAt)?.getTime() || 0;
      const dateB = toDate(b.createdAt)?.getTime() || 0;
      return dateB - dateA;
    });

    sortedLeads.forEach(lead => {
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
          proposalArea: lead.proposalArea || '',
        });
      }
    });

    return Array.from(map.values());
  }, [existingLeads]);

  const companySearchValue = form.watch('company');
  const filteredSuggestions = useMemo(() => {
    if (!companySearchValue || companySearchValue.length < 2) return [];
    return customerMemory.filter(c => 
      c.company.toLowerCase().includes(companySearchValue.toLowerCase()) ||
      (c.cnpj && c.cnpj.includes(companySearchValue))
    ).slice(0, 5);
  }, [customerMemory, companySearchValue]);

  const handleSelectCustomer = (customer: any) => {
    form.setValue('company', customer.company, { shouldValidate: true });
    form.setValue('name', customer.name, { shouldValidate: true });
    form.setValue('role', customer.role, { shouldValidate: true });
    form.setValue('cnpj', customer.cnpj, { shouldValidate: true });
    form.setValue('email', customer.email, { shouldValidate: true });
    form.setValue('whatsapp', customer.whatsapp, { shouldValidate: true });
    form.setValue('paymentMethods', customer.paymentMethods, { shouldValidate: true });
    form.setValue('contactSource', customer.contactSource, { shouldValidate: true });
    form.setValue('proposalArea', customer.proposalArea || '', { shouldValidate: true });
    
    if (customer.selectedTemplateId) {
      form.setValue('selectedTemplateId', customer.selectedTemplateId, { shouldValidate: true });
    }

    setShowSuggestions(false);
    toast({
      title: 'Dados Carregados',
      description: `Informações de ${customer.company} preenchidas.`,
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

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const activeAreas = useMemo(() => proposalAreas.filter(a => a.active), [proposalAreas]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Novo Orçamento</DialogTitle>
          <DialogDescription>
            Preencha as informações do lead. Digite o nome de uma empresa já atendida para sugestões.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[65vh] p-4 pt-2">
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
                    <FormItem className="relative">
                      <FormLabel>Empresa</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="Nome da empresa..." 
                            {...field} 
                            autoComplete="off"
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={handleBlur}
                          />
                          {companySearchValue && (
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                          )}
                        </div>
                      </FormControl>
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <div className="bg-muted/50 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Empresas encontradas na memória
                          </div>
                          <ul className="max-h-[200px] overflow-y-auto">
                            {filteredSuggestions.map((customer) => (
                              <li 
                                key={customer.cnpj || customer.company}
                                className="px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer flex flex-col border-b last:border-0 transition-colors"
                                onMouseDown={() => handleSelectCustomer(customer)}
                              >
                                <span className="font-bold text-primary">{customer.company}</span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.name} {customer.cnpj ? `• ${customer.cnpj}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                      <Popover open={templateSearchOpen} onOpenChange={setTemplateSearchOpen} modal>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              ref={field.ref}
                              className="w-full justify-between gap-2 bg-background px-3 font-normal"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span className="truncate">
                                  {field.value
                                    ? proposalTemplates.find(template => template.id === field.value)?.name || 'Modelo indisponível'
                                    : 'Nenhum (usará proposta padrão)'}
                                </span>
                              </span>
                              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-content-available-width)] p-0"
                        >
                          <Command label="Pesquisar modelos de proposta" filter={filterTemplates}>
                            <CommandInput placeholder="Pesquisar por nome, código ou trecho..." />
                            <CommandList className="max-h-[min(300px,calc(var(--radix-popover-content-available-height)-3rem))]">
                              <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="none"
                                  keywords={['Nenhum (usará proposta padrão)']}
                                  onSelect={() => {
                                    field.onChange(null);
                                    field.onBlur();
                                    setTemplateSearchOpen(false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4 shrink-0', !field.value ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                                  Nenhum (usará proposta padrão)
                                </CommandItem>
                                {proposalTemplates.map(template => (
                                  <CommandItem
                                    key={template.id}
                                    value={`template:${template.id}`}
                                    keywords={[template.name, template.id, template.proposalObject || '', template.serviceScope || '']}
                                    onSelect={() => {
                                      field.onChange(template.id);
                                      field.onBlur();
                                      setTemplateSearchOpen(false);
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4 shrink-0', field.value === template.id ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                                    <span className="min-w-0 break-words">{template.name}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
