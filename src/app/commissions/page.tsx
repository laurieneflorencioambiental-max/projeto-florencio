'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users,
  PlusCircle,
  Trash2,
  Save,
  Loader2,
  FileText,
  ShieldAlert,
  Pencil,
  FileDown,
  Link as LinkIcon,
  Send,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { CommissionTemplate, UserProfile, Service } from '@/lib/types';
import { collection, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { logClientEvent } from '@/lib/audit-client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PartnershipDetailsModal from '@/components/commissions/partnership-details-modal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


export default function CommissionsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();

  const [serviceName, setServiceName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerWhatsapp, setPartnerWhatsapp] = useState('');
  const [baseServiceValue, setBaseServiceValue] = useState(0);
  const [commissionPercentage, setCommissionPercentage] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(0);

  const [templateName, setTemplateName] = useState('');
  
  const calculatorCardRef = useRef<HTMLDivElement>(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPartnerForDetails, setSelectedPartnerForDetails] = useState<{name: string, templates: CommissionTemplate[]}>({name: '', templates: []});

  const [isEditPartnerModalOpen, setIsEditPartnerModalOpen] = useState(false);
  const [isUpdatingPartner, setIsUpdatingPartner] = useState(false);
  const [currentEditingPartner, setCurrentEditingPartner] = useState<{ oldName: string; name: string; whatsapp: string } | null>(null);

  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  const templatesRef = useMemoFirebase(() => firestore && isAdmin ? collection(firestore, 'commission-templates') : null, [firestore, isAdmin]);
  const { data: savedTemplates, isLoading: areTemplatesLoading } = useCollection<CommissionTemplate>(templatesRef);

  const servicesRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'services') : null, [firestore, user]);
  const { data: servicesCatalog, isLoading: areServicesLoading } = useCollection<Service>(servicesRef);

  const calculation = useMemo(() => {
    const commissionValue = baseServiceValue * (commissionPercentage / 100);
    const subtotal = baseServiceValue + commissionValue;
    const taxValue = subtotal * (taxPercentage / 100);
    const finalClientPrice = subtotal + taxValue;
    
    return {
      commissionValue,
      subtotal,
      taxValue,
      finalClientPrice,
    };
  }, [baseServiceValue, commissionPercentage, taxPercentage]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };
  
  const resetForm = () => {
    setServiceName('');
    setPartnerName('');
    setPartnerWhatsapp('');
    setBaseServiceValue(0);
    setCommissionPercentage(0);
    setTaxPercentage(0);
    setTemplateName('');
  }

  const handleSaveNewTemplate = () => {
    if (!firestore) return;
    if (!templateName.trim()) {
        toast({
            variant: 'destructive',
            title: 'Nome ausente',
            description: 'Por favor, dê um nome para este modelo de comissão antes de salvar.'
        });
        return;
    }

    const newDocRef = doc(collection(firestore, 'commission-templates'));
    const newTemplate: Omit<CommissionTemplate, 'id'> = {
        name: templateName,
        partnerName: partnerName,
        partnerWhatsapp: partnerWhatsapp,
        serviceName: serviceName,
        baseServiceValue: baseServiceValue,
        commissionPercentage: commissionPercentage,
        taxPercentage: taxPercentage,
        finalClientPrice: calculation.finalClientPrice,
        partnerCommissionValue: calculation.commissionValue,
    };

    setDoc(newDocRef, { ...newTemplate, id: newDocRef.id })
      .then(() => {
        if (auth) logClientEvent('Criação de Modelo de Comissão', auth, `Modelo: ${templateName}`);
        toast({ title: 'Novo Modelo de Comissão salvo!', description: `"${templateName}" foi adicionado.` });
        resetForm();
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newDocRef.path,
          operation: 'create',
          requestResourceData: newTemplate,
        }));
      });
  };
  
  const loadTemplate = (template: CommissionTemplate) => {
    setTemplateName(template.name);
    setPartnerName(template.partnerName || '');
    setPartnerWhatsapp(template.partnerWhatsapp || '');
    setServiceName(template.serviceName || '');
    setBaseServiceValue(template.baseServiceValue);
    setCommissionPercentage(template.commissionPercentage);
    setTaxPercentage(template.taxPercentage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleLoadFromCatalog = (serviceId: string) => {
    if (!servicesCatalog) return;
    const selectedService = servicesCatalog.find(s => s.id === serviceId);
    if (selectedService) {
      setBaseServiceValue(selectedService.value);
      if (!serviceName) {
        setServiceName(selectedService.service);
      }
      if (!templateName) {
        setTemplateName(selectedService.service);
      }
      toast({
        title: 'Valor Carregado',
        description: `Valor de "${selectedService.service}" preenchido.`
      });
    }
  };

  const deleteTemplate = (id: string) => {
    if (!firestore) return;
    const templateToDelete = savedTemplates?.find(t => t.id === id);
    const templateRef = doc(firestore, 'commission-templates', id);
    
    deleteDoc(templateRef)
      .then(() => {
        if (templateToDelete && auth) {
          logClientEvent('Exclusão de Modelo de Comissão', auth, `Modelo: ${templateToDelete.name}`);
        }
        toast({ title: 'Modelo removido.' });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: templateRef.path,
          operation: 'delete',
        }));
      });
  }

  const groupedTemplates = useMemo(() => {
    if (!savedTemplates) return {};
    return savedTemplates.reduce(
      (acc, template) => {
        const partner = template.partnerName || 'Parceiros Diversos';
        if (!acc[partner]) {
          acc[partner] = [];
        }
        acc[partner].push(template);
        return acc;
      },
      {} as Record<string, CommissionTemplate[]>
    );
  }, [savedTemplates]);

  const partnerNames = useMemo(
    () => Object.keys(groupedTemplates).sort(),
    [groupedTemplates]
  );
  
  const handleAddNewServiceForPartner = (partner: string) => {
    setServiceName('');
    setBaseServiceValue(0);
    setCommissionPercentage(0);
    setTaxPercentage(0);
    setTemplateName('');
    setPartnerName(partner);

    const existingTemplatesForPartner = groupedTemplates[partner];
    if (existingTemplatesForPartner && existingTemplatesForPartner.length > 0) {
        setPartnerWhatsapp(existingTemplatesForPartner[0].partnerWhatsapp || '');
    }

    calculatorCardRef.current?.scrollIntoView({ behavior: 'smooth' });
    toast({
      title: `Adicionando serviço para ${partner}`,
      description: 'Preencha os detalhes do novo serviço na calculadora acima e salve.',
    });
  };

  const handleOpenDetails = (partnerName: string) => {
    const templates = groupedTemplates[partnerName] || [];
    setSelectedPartnerForDetails({ name: partnerName, templates });
    setDetailsModalOpen(true);
  };

  const handleOpenEditPartner = (partnerName: string) => {
    const templates = groupedTemplates[partnerName] || [];
    const whatsapp = templates.length > 0 ? templates[0].partnerWhatsapp || '' : '';
    setCurrentEditingPartner({ oldName: partnerName, name: partnerName, whatsapp });
    setIsEditPartnerModalOpen(true);
  };

  const handleUpdatePartner = async () => {
    if (!firestore || !currentEditingPartner) return;
    
    const { oldName, name: newName, whatsapp: newWhatsapp } = currentEditingPartner;

    if (!newName.trim()) {
        toast({ variant: 'destructive', title: 'Nome do parceiro é obrigatório.' });
        return;
    }

    setIsUpdatingPartner(true);
    
    const templatesToUpdate = savedTemplates?.filter(t => t.partnerName === oldName);
    
    if (!templatesToUpdate || templatesToUpdate.length === 0) {
        setIsUpdatingPartner(false);
        setIsEditPartnerModalOpen(false);
        toast({ title: 'Nenhum serviço encontrado para este parceiro.' });
        return;
    }
    
    const batch = writeBatch(firestore);
    templatesToUpdate.forEach(template => {
        const docRef = doc(firestore, 'commission-templates', template.id);
        batch.update(docRef, { partnerName: newName, partnerWhatsapp: newWhatsapp });
    });
    
    try {
        await batch.commit();
        toast({ title: 'Parceiro atualizado com sucesso!' });
        setIsEditPartnerModalOpen(false);
    } catch (error) {
        console.error("Failed to update partner info:", error);
        toast({ variant: 'destructive', title: 'Erro ao atualizar parceiro.' });
    } finally {
        setIsUpdatingPartner(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || areTemplatesLoading || areServicesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">
          Apenas gestores podem visualizar a página de Cálculo de Comissões.
        </p>
        <Button onClick={() => router.push('/')}>
          Voltar para o Dashboard
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        <Card ref={calculatorCardRef}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Calculadora de Comissão de Parceiros
            </CardTitle>
            <CardDescription>
              Calcule o preço final para o cliente incluindo a comissão do parceiro e impostos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="partner-name">Nome do Parceiro</Label>
                    <Input id="partner-name" placeholder="Ex: Contabilidade XYZ" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="partner-whatsapp">WhatsApp do Parceiro</Label>
                    <Input id="partner-whatsapp" placeholder="Ex: 5521999998888" value={partnerWhatsapp} onChange={e => setPartnerWhatsapp(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="service-name">Nome do Serviço</Label>
                    <Input id="service-name" placeholder="Ex: ASO Clínico" value={serviceName} onChange={e => setServiceName(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
              <Label>Carregar Valor do Catálogo (Opcional)</Label>
              <Select onValueChange={handleLoadFromCatalog}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço do catálogo para preencher o valor" />
                </SelectTrigger>
                <SelectContent>
                  {servicesCatalog && servicesCatalog.length > 0 ? (
                    servicesCatalog.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.service} ({formatCurrency(service.value)})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Nenhum serviço no catálogo
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-muted/30">
                <CardHeader><CardTitle className="text-lg font-bold">Valores de Entrada</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="base-service-value">Valor do Serviço</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">R$</span>
                            <Input id="base-service-value" type="number" step="0.01" placeholder="0,00" value={baseServiceValue} onChange={e => setBaseServiceValue(parseFloat(e.target.value) || 0)} className="pl-9" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="commission-percentage">Comissão do Parceiro (%)</Label>
                        <Input id="commission-percentage" type="number" placeholder="18" value={commissionPercentage} onChange={e => setCommissionPercentage(parseFloat(e.target.value) || 0)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="tax-percentage">Imposto (%)</Label>
                        <Input id="tax-percentage" type="number" placeholder="6" value={taxPercentage} onChange={e => setTaxPercentage(parseFloat(e.target.value) || 0)} />
                    </div>
                </CardContent>
            </Card>
          </CardContent>
           <CardFooter className="flex flex-col sm:flex-row justify-end items-center gap-4">
             <div className="space-y-2 w-full sm:w-auto flex-1">
                <Label htmlFor="template-name">Nome para Salvar Modelo</Label>
                <Input id="template-name" placeholder="Ex: Comissão Padrão Contabilidade" value={templateName} onChange={e => setTemplateName(e.target.value)} />
            </div>
            <div className="flex gap-2 self-end">
                <Button variant="outline" onClick={resetForm}>Limpar</Button>
                <Button onClick={handleSaveNewTemplate}><Save className="mr-2 h-4 w-4" />Salvar Modelo</Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
            <CardHeader><CardTitle>Parceiros e Serviços Cadastrados</CardTitle></CardHeader>
            <CardContent>
                {partnerNames.length === 0 ? (
                    <p className="text-center text-muted-foreground p-4">Nenhum modelo salvo.</p>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {partnerNames.map(name => (
                            <AccordionItem value={name} key={name}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <span className="font-semibold text-lg">{name}</span>
                                        <Badge variant="secondary">{groupedTemplates[name].length} serviço(s)</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Serviço / Modelo</TableHead>
                                                <TableHead>Valor Final Cliente</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedTemplates[name].map(template => (
                                                <TableRow key={template.id}>
                                                    <TableCell>
                                                        <p className="font-medium">{template.serviceName || 'Serviço não especificado'}</p>
                                                        <p className="text-xs text-muted-foreground">{template.name}</p>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-primary">{formatCurrency(template.finalClientPrice)}</TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button size="sm" variant="outline" onClick={() => loadTemplate(template)}>Carregar</Button>
                                                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteTemplate(template.id)}><Trash2 className="h-4 w-4"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 flex justify-end gap-2 flex-wrap">
                                      <Button variant="outline" size="sm" onClick={() => handleOpenEditPartner(name)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar Parceiro
                                      </Button>
                                      <Button variant="secondary" size="sm" onClick={() => handleOpenDetails(name)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Detalhes da Parceria
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => handleAddNewServiceForPartner(name)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Adicionar Novo Serviço
                                      </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-6 border-primary shadow-lg">
          <CardHeader className="bg-primary/5">
            <CardTitle>Resultado do Cálculo</CardTitle>
             <CardDescription>Detalhamento dos repasses e precificação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Valor Base (Sua Receita)</span>
                <span className="font-medium">{formatCurrency(baseServiceValue)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Comissão do Parceiro ({commissionPercentage}%)</span>
                <span className="font-medium text-green-600">+{formatCurrency(calculation.commissionValue)}</span>
            </div>
             <div className="flex justify-between items-center text-sm font-semibold border-t pt-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(calculation.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Imposto ({taxPercentage}%)</span>
                <span className="font-medium text-red-600">+{formatCurrency(calculation.taxValue)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4 mt-4">
              <div>
                <p className='font-semibold'>Sua Receita Bruta</p>
                <p className='text-[10px] text-muted-foreground'>(Valor do Serviço)</p>
              </div>
              <span className="font-bold text-lg text-primary">{formatCurrency(baseServiceValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className='font-semibold'>Comissão do Parceiro</p>
                 <p className='text-[10px] text-muted-foreground'>(Valor a ser pago ao parceiro)</p>
              </div>
              <span className="font-bold text-lg text-green-600">{formatCurrency(calculation.commissionValue)}</span>
            </div>
          </CardContent>
          <CardFooter className="bg-primary/10 p-4 rounded-b-lg border-t">
            <div className="w-full">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Preço Final Cliente</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.finalClientPrice)}</span>
                </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
    <PartnershipDetailsModal 
      isOpen={detailsModalOpen}
      onOpenChange={setDetailsModalOpen}
      partnerName={selectedPartnerForDetails.name}
      templates={selectedPartnerForDetails.templates}
    />
     <Dialog open={isEditPartnerModalOpen} onOpenChange={setIsEditPartnerModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Parceiro</DialogTitle>
                <DialogDescription>Altere o nome e o WhatsApp deste parceiro. As alterações serão aplicadas a todos os serviços associados.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-partner-name">Nome do Parceiro</Label>
                    <Input id="edit-partner-name" value={currentEditingPartner?.name || ''} onChange={(e) => setCurrentEditingPartner(p => p ? {...p, name: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-partner-whatsapp">WhatsApp do Parceiro</Label>
                    <Input id="edit-partner-whatsapp" value={currentEditingPartner?.whatsapp || ''} onChange={(e) => setCurrentEditingPartner(p => p ? {...p, whatsapp: e.target.value} : null)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditPartnerModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleUpdatePartner} disabled={isUpdatingPartner}>
                    {isUpdatingPartner ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
