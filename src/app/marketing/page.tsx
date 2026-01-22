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
import {
  DollarSign,
  Activity,
  PlusCircle,
  Trash2,
  CalendarIcon,
  Clock,
  Pencil,
  Save,
} from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RoiEntry {
  id: number;
  source: string;
  investment: number;
  revenue: number;
  roi: number;
}

interface MarketingAction {
  id: number;
  name: string;
  goal: string;
  deadline: Date;
  completed: boolean;
}

export default function MarketingPage() {
  const { toast } = useToast();

  // ROI State
  const [entries, setEntries] = useState<RoiEntry[]>([]);
  const [newInvestment, setNewInvestment] = useState('');
  const [newRevenue, setNewRevenue] = useState('');
  const [newSource, setNewSource] = useState('');

  // Action Plan State
  const [actions, setActions] = useState<MarketingAction[]>([]);
  const [newActionName, setNewActionName] = useState('');
  const [newActionGoal, setNewActionGoal] = useState('');
  const [newActionDeadline, setNewActionDeadline] = useState<Date | undefined>();
  const [editingActionId, setEditingActionId] = useState<number | null>(null);

  // ROI Handlers
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

  // Action Plan Handlers
  const handleStartEditing = (action: MarketingAction) => {
    setEditingActionId(action.id);
    setNewActionName(action.name);
    setNewActionGoal(action.goal);
    setNewActionDeadline(action.deadline);
  };

  const handleCancelEditing = () => {
    setEditingActionId(null);
    setNewActionName('');
    setNewActionGoal('');
    setNewActionDeadline(undefined);
  };

  const handleActionFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionName || !newActionGoal || !newActionDeadline) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Preencha o nome, a meta e o prazo da ação.',
      });
      return;
    }

    if (editingActionId) {
      setActions(
        actions.map(action =>
          action.id === editingActionId
            ? {
                ...action,
                name: newActionName,
                goal: newActionGoal,
                deadline: newActionDeadline,
              }
            : action
        )
      );
      toast({
        title: 'Ação Atualizada!',
        description: `A campanha "${newActionName}" foi atualizada.`,
      });
    } else {
      const newAction: MarketingAction = {
        id: Date.now(),
        name: newActionName,
        goal: newActionGoal,
        deadline: newActionDeadline,
        completed: false,
      };
      setActions([...actions, newAction]);
      toast({
        title: 'Ação Adicionada!',
        description: `A campanha "${newActionName}" foi adicionada ao seu plano.`,
      });
    }

    handleCancelEditing();
  };

  const handleToggleAction = (id: number) => {
    setActions(
      actions.map(action =>
        action.id === id ? { ...action, completed: !action.completed } : action
      )
    );
  };

  const handleDeleteAction = (id: number) => {
    setActions(actions.filter(action => action.id !== id));
    toast({
      title: 'Ação Removida',
      description: `A ação foi removida do seu plano.`,
    });
  };

  const sortedActions = useMemo(() => {
    return [...actions].sort((a, b) => {
      if (a.completed === b.completed) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      return a.completed ? 1 : -1;
    });
  }, [actions]);

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Plano de Ação de Marketing
          </CardTitle>
          <CardDescription>
            Crie campanhas, defina metas, prazos e acompanhe o progresso de suas
            ações de marketing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleActionFormSubmit}
            className="space-y-4 p-4 border rounded-lg bg-muted/50 mb-6"
          >
            <div className="space-y-2">
              <Label htmlFor="action-name">Nome da Campanha/Ação</Label>
              <Input
                id="action-name"
                placeholder="Ex: Campanha de Dia das Mães no Instagram"
                value={newActionName}
                onChange={e => setNewActionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-goal">Meta da Ação</Label>
              <Textarea
                id="action-goal"
                placeholder="Ex: Aumentar o engajamento em 20% e gerar 15 novos leads qualificados."
                value={newActionGoal}
                onChange={e => setNewActionGoal(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2 flex-grow min-w-[200px]">
                <Label htmlFor="action-deadline">Prazo Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="action-deadline"
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !newActionDeadline && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newActionDeadline ? (
                        format(newActionDeadline, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newActionDeadline}
                      onSelect={setNewActionDeadline}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                {editingActionId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEditing}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-shrink-0">
                  {editingActionId ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Ação
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          <h3 className="text-lg font-medium mb-4">Ações Planejadas</h3>
          {sortedActions.length > 0 ? (
            <div className="space-y-3">
              {sortedActions.map(action => (
                <div
                  key={action.id}
                  className={cn(
                    'p-4 border rounded-lg flex items-start gap-4 transition-all',
                    action.completed ? 'bg-muted/40 opacity-70' : 'bg-card'
                  )}
                >
                  <Checkbox
                    id={`action-${action.id}`}
                    checked={action.completed}
                    onCheckedChange={() => handleToggleAction(action.id)}
                    className="mt-1"
                    aria-label={`Marcar como ${
                      action.completed ? 'pendente' : 'concluída'
                    }`}
                  />
                  <div className="flex-1 grid gap-1.5">
                    <Label
                      htmlFor={`action-${action.id}`}
                      className={cn(
                        'font-semibold cursor-pointer',
                        action.completed && 'line-through'
                      )}
                    >
                      {action.name}
                    </Label>
                    <p
                      className={cn(
                        'text-sm text-muted-foreground whitespace-pre-wrap',
                        action.completed && 'line-through'
                      )}
                    >
                      {action.goal}
                    </p>
                    <div
                      className={cn(
                        'flex items-center gap-2 text-xs mt-2',
                        action.completed
                          ? 'text-muted-foreground'
                          : 'text-primary font-medium'
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      <span>
                        Prazo: {format(action.deadline, 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEditing(action)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar Ação</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAction(action.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Remover Ação</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                Nenhuma ação planejada ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Use o formulário acima para começar a planejar.
              </p>
            </div>
          )}
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
