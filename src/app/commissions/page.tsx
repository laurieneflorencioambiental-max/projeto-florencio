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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { CommissionTemplate, UserProfile } from '@/lib/types';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
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

  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  const templatesRef = useMemoFirebase(() => firestore && isAdmin ? collection(firestore, 'commission-templates') : null, [firestore, isAdmin]);
  const { data: savedTemplates, isLoading: areTemplatesLoading } = useCollection<CommissionTemplate>(templatesRef);

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
    if (typeof value !== 'number' || isNaN(value)) {
        return (0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  const handleSaveTemplate = async () => {
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

    await setDoc(newDocRef, { ...newTemplate, id: newDocRef.id });
    logClientEvent('Criação de Modelo de Comissão', auth, `Modelo: ${templateName}`);
    toast({ title: 'Modelo de Comissão salvo!', description: `"${templateName}" foi adicionado aos seus modelos.` });
    resetForm();
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

  const deleteTemplate = async (id: string) => {
    if (!firestore) return;
    const templateToDelete = savedTemplates?.find(t => t.id === id);
    await deleteDoc(doc(firestore, 'commission-templates', id));
    if (templateToDelete) {
      logClientEvent('Exclusão de Modelo de Comissão', auth, `Modelo: ${templateToDelete.name}`);
    }
    toast({ title: 'Modelo removido.' });
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

  const isLoading = isUserLoading || isProfileLoading || areTemplatesLoading;

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
                    <Label htmlFor="partner-name">Nome do Parceiro (Opcional)</Label>
                    <Input id="partner-name" placeholder="Ex: Contabilidade XYZ" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="partner-whatsapp">WhatsApp do Parceiro</Label>
                    <Input id="partner-whatsapp" placeholder="Ex: 5521999998888" value={partnerWhatsapp} onChange={e => setPartnerWhatsapp(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="service-name">Nome do Serviço (Opcional)</Label>
                    <Input id="service-name" placeholder="Ex: ASO Clínico" value={serviceName} onChange={e => setServiceName(e.target.value)} />
                </div>
            </div>

            <Card className="bg-muted/30">
                <CardHeader><CardTitle className="text-lg">Valores de Entrada</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="base-service-value">Valor do Serviço (R$)</Label>
                        <Input id="base-service-value" type="number" placeholder="52.60" value={baseServiceValue} onChange={e => setBaseServiceValue(parseFloat(e.target.value) || 0)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="commission-percentage">Comissão do Parceiro (%)</Label>
                        <Input id="commission-percentage" type="number" placeholder="18" value={commissionPercentage} onChange={e => setCommissionPercentage(parseFloat(e.target.value) || 0)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="tax-percentage">Imposto sobre Serviço (%)</Label>
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
                <Button onClick={handleSaveTemplate}><Save className="mr-2 h-4 w-4" />Salvar Modelo</Button>
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
                                                    <TableCell>{formatCurrency(template.finalClientPrice)}</TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button size="sm" variant="outline" onClick={() => loadTemplate(template)}>Carregar</Button>
                                                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteTemplate(template.id)}><Trash2 className="h-4 w-4"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 flex justify-end gap-2">
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
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle>Resultado do Cálculo</CardTitle>
             <CardDescription>Este é o detalhamento dos valores com base nos dados que você inseriu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Valor Base do Serviço</span>
                <span className="font-medium">{formatCurrency(baseServiceValue)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Comissão do Parceiro ({commissionPercentage}%)</span>
                <span className="font-medium text-green-600">{formatCurrency(calculation.commissionValue)}</span>
            </div>
             <div className="flex justify-between items-center text-sm font-semibold border-t pt-2">
                <span className="text-muted-foreground">Subtotal (Base + Comissão)</span>
                <span>{formatCurrency(calculation.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Imposto ({taxPercentage}%)</span>
                <span className="font-medium text-red-600">{formatCurrency(calculation.taxValue)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4 mt-4">
              <div>
                <p className='font-semibold'>Sua Receita Bruta</p>
                <p className='text-xs text-muted-foreground'>(Valor do Serviço)</p>
              </div>
              <span className="font-bold text-lg">{formatCurrency(baseServiceValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className='font-semibold'>Comissão do Parceiro</p>
                 <p className='text-xs text-muted-foreground'>(Valor a ser pago ao parceiro)</p>
              </div>
              <span className="font-bold text-lg">{formatCurrency(calculation.commissionValue)}</span>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
            <div className="w-full">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Preço Final para Cliente</span>
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
    </>
  );
}
