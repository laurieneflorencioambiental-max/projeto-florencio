'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  PlusCircle,
  Trash2,
  Save,
  FileDown,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { CostFactors, PricingTemplate, ServiceType } from '@/lib/types';
import { serviceTypes } from '@/lib/types';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { logClientEvent } from '@/lib/audit-client';

const initialCosts: CostFactors = {
  fornecedor: 0,
  art: 0,
  honorarioMedico: 0,
  honorarioEngenheiro: 0,
  almoco: 0,
  pedagio: 0,
  aluguelEquipamento: 0,
  calibracao: 0,
};

export default function PricingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();

  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('Serviços Diversos');
  const [costs, setCosts] = useState<CostFactors>(initialCosts);
  const [boletoFee, setBoletoFee] = useState(0);
  const [margin, setMargin] = useState(20);
  const [taxes, setTaxes] = useState(15);
  
  const pricingTemplatesRef = useMemoFirebase(() => firestore ? collection(firestore, 'pricing-templates') : null, [firestore]);
  const { data: savedTemplates, isLoading: areTemplatesLoading } = useCollection<PricingTemplate>(pricingTemplatesRef);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const calculation = useMemo(() => {
    const totalCosts = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
    const boletoCost = totalCosts * (boletoFee / 100);
    const subtotalWithBoleto = totalCosts + boletoCost;
    const profitValue = subtotalWithBoleto * (margin / 100);
    const subtotalWithProfit = subtotalWithBoleto + profitValue;
    const taxesValue = subtotalWithProfit * (taxes / 100);
    const finalPrice = subtotalWithProfit + taxesValue;
    
    return {
      totalCosts,
      boletoCost,
      subtotalWithBoleto,
      profitValue,
      taxesValue,
      finalPrice,
    };
  }, [costs, boletoFee, margin, taxes]);

  const handleCostChange = (key: keyof CostFactors, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setCosts(prev => ({ ...prev, [key]: numericValue }));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const resetForm = () => {
    setName('');
    setServiceType('Serviços Diversos');
    setCosts(initialCosts);
    setBoletoFee(0);
    setMargin(20);
    setTaxes(15);
  }

  const handleSaveTemplate = async () => {
    if (!firestore) return;
    if (!name.trim()) {
        toast({
            variant: 'destructive',
            title: 'Nome ausente',
            description: 'Por favor, dê um nome para esta precificação antes de salvar.'
        });
        return;
    }

    const newDocRef = doc(collection(firestore, 'pricing-templates'));
    const newTemplate: PricingTemplate = {
        id: newDocRef.id,
        name,
        serviceType,
        costs,
        boletoFee,
        margin,
        taxes,
        finalPrice: calculation.finalPrice
    };

    await setDoc(newDocRef, newTemplate);
    logClientEvent('Criação de Precificação', auth, `Modelo: ${name}`);
    toast({ title: 'Precificação salva!', description: `"${name}" foi adicionado aos seus modelos.` });
    resetForm();
  };
  
  const loadTemplate = (template: PricingTemplate) => {
    setName(template.name);
    setServiceType(template.serviceType);
    setCosts(template.costs);
    setBoletoFee(template.boletoFee);
    setMargin(template.margin);
    setTaxes(template.taxes);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTemplate = async (id: string) => {
    if (!firestore) return;
    const templateToDelete = savedTemplates?.find(t => t.id === id);
    await deleteDoc(doc(firestore, 'pricing-templates', id));
    if (templateToDelete) {
      logClientEvent('Exclusão de Precificação', auth, `Modelo: ${templateToDelete.name}`);
    }
    toast({ title: 'Modelo removido.' });
  }

  if (isUserLoading || !user || areTemplatesLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const costFields: { key: keyof CostFactors; label: string }[] = [
    { key: 'fornecedor', label: 'Fornecedor' },
    { key: 'art', label: 'ART' },
    { key: 'honorarioMedico', label: 'Honorário Médico' },
    { key: 'honorarioEngenheiro', label: 'Honorário Engenheiro' },
    { key: 'almoco', label: 'Almoço' },
    { key: 'pedagio', label: 'Pedágio' },
    { key: 'aluguelEquipamento', label: 'Aluguel de Equipamento' },
    { key: 'calibracao', label: 'Calibração' },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Calculadora de Precificação
            </CardTitle>
            <CardDescription>
              Formule o preço de venda dos seus serviços com base nos custos e
              margens desejadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="pricing-name">Nome da Precificação</Label>
                    <Input id="pricing-name" placeholder="Ex: Laudo de Ruído Ambiental - Cliente Padrão" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="service-type">Tipo de Serviço</Label>
                    <Select value={serviceType} onValueChange={(v: ServiceType) => setServiceType(v)}>
                        <SelectTrigger id="service-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {serviceTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="bg-muted/30">
                <CardHeader><CardTitle className="text-lg">Fatores de Custo (R$)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {costFields.map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                            <Label htmlFor={key}>{label}</Label>
                            <Input id={key} type="number" placeholder="0.00" value={costs[key]} onChange={e => handleCostChange(key, e.target.value)} />
                        </div>
                    ))}
                </CardContent>
            </Card>
            
            <Card className="bg-muted/30">
                <CardHeader><CardTitle className="text-lg">Ajustes Financeiros (%)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="boleto-fee">Taxa do Boleto (%)</Label>
                        <Input id="boleto-fee" type="number" placeholder="0" value={boletoFee} onChange={e => setBoletoFee(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="margin">Margem de Lucro (%)</Label>
                        <Input id="margin" type="number" placeholder="20" value={margin} onChange={e => setMargin(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="taxes">Impostos (%)</Label>
                        <Input id="taxes" type="number" placeholder="15" value={taxes} onChange={e => setTaxes(parseFloat(e.target.value) || 0)} />
                    </div>
                </CardContent>
            </Card>
          </CardContent>
           <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>Limpar</Button>
            <Button onClick={handleSaveTemplate}><Save className="mr-2 h-4 w-4" />Salvar Modelo</Button>
          </CardFooter>
        </Card>

        <Card>
            <CardHeader><CardTitle>Modelos de Precificação Salvos</CardTitle></CardHeader>
            <CardContent>
                {(savedTemplates || []).length === 0 ? (
                    <p className="text-center text-muted-foreground p-4">Nenhum modelo salvo.</p>
                ) : (
                    <div className="space-y-2">
                        {(savedTemplates || []).map(template => (
                             <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                <div>
                                    <p className="font-semibold">{template.name}</p>
                                    <p className="text-sm text-muted-foreground">{template.serviceType} - {formatCurrency(template.finalPrice)}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button size="sm" variant="outline" onClick={() => loadTemplate(template)}>Carregar</Button>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteTemplate(template.id)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                             </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle>Resultado da Precificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total de Custos Diretos</span>
                <span className="font-medium">{formatCurrency(calculation.totalCosts)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Custo Boleto ({boletoFee}%)</span>
                <span className="font-medium">{formatCurrency(calculation.boletoCost)}</span>
            </div>
             <div className="flex justify-between items-center text-sm font-semibold border-t pt-2">
                <span className="text-muted-foreground">Subtotal (Custos)</span>
                <span>{formatCurrency(calculation.subtotalWithBoleto)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Lucro ({margin}%)</span>
                <span className="font-medium text-green-600">{formatCurrency(calculation.profitValue)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Impostos ({taxes}%)</span>
                <span className="font-medium text-red-600">{formatCurrency(calculation.taxesValue)}</span>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
            <div className="w-full">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Preço Final de Venda</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.finalPrice)}</span>
                </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
