'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Activity, PlusCircle, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { contactSources } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface RoiEntry {
  id: number;
  source: string;
  investment: number;
  revenue: number;
  roi: number;
}

export default function MarketingPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<RoiEntry[]>([]);
  const [newInvestment, setNewInvestment] = useState('');
  const [newRevenue, setNewRevenue] = useState('');
  const [newSource, setNewSource] = useState('');

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const investmentValue = parseFloat(newInvestment);
    const revenueValue = parseFloat(newRevenue);

    if (
      !newSource ||
      isNaN(investmentValue) ||
      isNaN(revenueValue) ||
      investmentValue <= 0
    ) {
      toast({
        variant: 'destructive',
        title: 'Dados inválidos',
        description:
          'Por favor, preencha a fonte, investimento (maior que zero) e receita.',
      });
      return;
    }

    const calculatedRoi =
      ((revenueValue - investmentValue) / investmentValue) * 100;

    const newEntry: RoiEntry = {
      id: Date.now(),
      source: newSource,
      investment: investmentValue,
      revenue: revenueValue,
      roi: calculatedRoi,
    };

    setEntries([...entries, newEntry]);

    // Reset form
    setNewInvestment('');
    setNewRevenue('');
    setNewSource('');

    toast({
      title: 'Cálculo Adicionado',
      description: `ROI para ${newSource} foi adicionado à lista.`,
    });
  };

  const handleDeleteEntry = (id: number) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const totals = useMemo(() => {
    const totalInvestment = entries.reduce(
      (acc, entry) => acc + entry.investment,
      0
    );
    const totalRevenue = entries.reduce((acc, entry) => acc + entry.revenue, 0);

    let totalRoi = 0;
    if (totalInvestment > 0) {
      totalRoi = ((totalRevenue - totalInvestment) / totalInvestment) * 100;
    }

    return { totalInvestment, totalRevenue, totalRoi };
  }, [entries]);

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Plano de Ação de Marketing
          </CardTitle>
          <CardDescription>
            Defina e acompanhe suas iniciativas de marketing. Esta é uma área em
            desenvolvimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Funcionalidade de Plano de Ação em breve.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Aqui você poderá criar campanhas, definir metas e prazos.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Cálculo de Retorno sobre Investimento (ROI)
          </CardTitle>
          <CardDescription>
            Adicione múltiplos investimentos para calcular o ROI de forma
            individual e consolidada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAddEntry}
            className="space-y-4 p-4 border rounded-lg bg-muted/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="source">Fonte do Investimento</Label>
                <Select value={newSource} onValueChange={setNewSource}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactSources.map(source => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="investment">Investimento Total (R$)</Label>
                <Input
                  id="investment"
                  type="number"
                  placeholder="Ex: 5000"
                  value={newInvestment}
                  onChange={e => setNewInvestment(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="revenue">Receita Gerada (R$)</Label>
                <Input
                  id="revenue"
                  type="number"
                  placeholder="Ex: 25000"
                  value={newRevenue}
                  onChange={e => setNewRevenue(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <Button type="submit" className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Cálculo
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Resultados de ROI</h3>
            {entries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.source}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.investment.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.revenue.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          entry.roi >= 0 ? 'text-green-600' : 'text-destructive'
                        }`}
                      >
                        {entry.roi.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/80">
                    <TableCell className="font-bold">
                      Total Consolidado
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {totals.totalInvestment.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {totals.totalRevenue.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                    <TableCell
                      className={`text-right font-extrabold text-lg ${
                        totals.totalRoi >= 0
                          ? 'text-green-600'
                          : 'text-destructive'
                      }`}
                    >
                      {totals.totalRoi.toFixed(2)}%
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  Nenhum cálculo de ROI foi adicionado ainda.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use o formulário acima para começar.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
