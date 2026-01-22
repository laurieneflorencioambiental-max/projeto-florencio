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
  TrendingUp,
  Crosshair,
  Sparkles,
  Loader2,
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
import { Badge } from '@/components/ui/badge';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { suggestCampaignGoalAction } from '@/app/actions';

interface RoiEntry {
  id: number;
  source: string;
  investment: number;
  revenue: number;
  roi: number;
}

const campaignStatuses = ['Futura', 'Rodando', 'Pausada', 'Concluída'] as const;
type CampaignStatus = (typeof campaignStatuses)[number];

interface MarketingAction {
  id: number;
  name: string;
  goal: string;
  deadline: Date;
  status: CampaignStatus;
  source?: string;
  percentageGoal?: number;
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
  const [newActionSource, setNewActionSource] = useState('');
  const [newActionPercentageGoal, setNewActionPercentageGoal] = useState('');
  const [newActionStatus, setNewActionStatus] =
    useState<CampaignStatus>('Futura');
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [isSuggestingGoal, setIsSuggestingGoal] = useState(false);
  const [goalSuggestion, setGoalSuggestion] = useState<string | null>(null);

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
    setNewActionSource(action.source || '');
    setNewActionPercentageGoal(
      action.percentageGoal ? String(action.percentageGoal) : ''
    );
    setNewActionStatus(action.status);
    setGoalSuggestion(null);
  };

  const handleCancelEditing = () => {
    setEditingActionId(null);
    setNewActionName('');
    setNewActionGoal('');
    setNewActionDeadline(undefined);
    setNewActionSource('');
    setNewActionPercentageGoal('');
    setNewActionStatus('Futura');
    setGoalSuggestion(null);
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

    const percentageGoalValue = newActionPercentageGoal
      ? parseFloat(newActionPercentageGoal)
      : undefined;

    if (editingActionId) {
      setActions(
        actions.map(action =>
          action.id === editingActionId
            ? {
                ...action,
                name: newActionName,
                goal: newActionGoal,
                deadline: newActionDeadline,
                source: newActionSource,
                percentageGoal: percentageGoalValue,
                status: newActionStatus,
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
        status: newActionStatus,
        source: newActionSource,
        percentageGoal: percentageGoalValue,
      };
      setActions([...actions, newAction]);
      toast({
        title: 'Ação Adicionada!',
        description: `A campanha "${newActionName}" foi adicionada ao seu plano.`,
      });
    }

    handleCancelEditing();
  };

  const handleDeleteAction = (id: number) => {
    setActions(actions.filter(action => action.id !== id));
    toast({
      title: 'Ação Removida',
      description: `A ação foi removida do seu plano.`,
    });
  };

  const handleSuggestGoal = async () => {
    if (!newActionSource) {
      toast({
        variant: 'destructive',
        title: 'Fonte não selecionada',
        description: 'Por favor, selecione uma fonte de investimento primeiro.',
      });
      return;
    }
    setIsSuggestingGoal(true);
    setGoalSuggestion(null);

    const investmentValue = newActionPercentageGoal
      ? parseFloat(newActionPercentageGoal)
      : undefined;

    try {
      const result = await suggestCampaignGoalAction(
        newActionSource,
        investmentValue,
        entries
      );
      if (result.suggestedPercentage > 0) {
        setNewActionPercentageGoal(String(result.suggestedPercentage));
        setGoalSuggestion(result.justification);
        toast({
          title: 'Sugestão Gerada!',
          description: 'A IA sugeriu uma meta para sua campanha.',
        });
      } else {
        setGoalSuggestion(result.justification);
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível gerar uma sugestão.',
      });
    } finally {
      setIsSuggestingGoal(false);
    }
  };

  const sortedActions = useMemo(() => {
    const statusOrder: Record<CampaignStatus, number> = {
      Rodando: 1,
      Pausada: 2,
      Futura: 3,
      Concluída: 4,
    };
    return [...actions].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.deadline.getTime() - b.deadline.getTime();
    });
  }, [actions]);

  const statusBadgeConfig: Record<
    CampaignStatus,
    { className: string; variant: 'default' | 'secondary' | 'outline' }
  > = {
    Rodando: {
      className: 'border-green-600/50 bg-green-500/10 text-green-700',
      variant: 'outline',
    },
    Pausada: {
      className: 'border-yellow-600/50 bg-yellow-500/10 text-yellow-700',
      variant: 'outline',
    },
    Futura: {
      className: 'border-blue-600/50 bg-blue-500/10 text-blue-700',
      variant: 'outline',
    },
    Concluída: {
      className: 'border-gray-400/50 bg-gray-500/10 text-gray-600',
      variant: 'outline',
    },
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action-source">Fonte de Investimento</Label>
                <Select
                  value={newActionSource}
                  onValueChange={setNewActionSource}
                >
                  <SelectTrigger id="action-source">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="action-percentage">Meta de Aumento (%)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSuggestGoal}
                    disabled={isSuggestingGoal}
                  >
                    {isSuggestingGoal ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    )}
                    Sugerir Meta
                  </Button>
                </div>
                <Input
                  id="action-percentage"
                  type="number"
                  placeholder="Ex: 15"
                  value={newActionPercentageGoal}
                  onChange={e => setNewActionPercentageGoal(e.target.value)}
                />
                {goalSuggestion && (
                  <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded-md">
                    {goalSuggestion}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="action-status">Status</Label>
                <Select
                  value={newActionStatus}
                  onValueChange={(value: CampaignStatus) =>
                    setNewActionStatus(value)
                  }
                >
                  <SelectTrigger id="action-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-4">
              {editingActionId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEditing}
                >
                  Cancelar
                </Button>
              )}
              <Button type="submit">
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
          </form>

          <h3 className="text-lg font-medium mb-4">Ações Planejadas</h3>
          {sortedActions.length > 0 ? (
            <div className="space-y-3">
              {sortedActions.map(action => {
                const isExpired =
                  action.status !== 'Concluída' &&
                  isPast(action.deadline) &&
                  !isToday(action.deadline);
                return (
                  <div
                    key={action.id}
                    className={cn(
                      'p-4 border rounded-lg flex items-start gap-4 transition-all',
                      action.status === 'Concluída'
                        ? 'bg-muted/40 opacity-70'
                        : 'bg-card',
                      isExpired && 'border-destructive/50 bg-destructive/10'
                    )}
                  >
                    <div className="flex-1 grid gap-1.5">
                      <div className="flex justify-between items-start">
                        <Label
                          htmlFor={`action-${action.id}`}
                          className={cn(
                            'font-semibold cursor-pointer text-base',
                            action.status === 'Concluída' && 'line-through'
                          )}
                        >
                          {action.name}
                        </Label>
                        <Badge
                          variant={statusBadgeConfig[action.status].variant}
                          className={cn(statusBadgeConfig[action.status].className)}
                        >
                          {action.status}
                        </Badge>
                      </div>

                      <p
                        className={cn(
                          'text-sm text-muted-foreground whitespace-pre-wrap',
                          action.status === 'Concluída' && 'line-through'
                        )}
                      >
                        {action.goal}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-2 text-muted-foreground">
                        {action.source && (
                          <div className="flex items-center gap-1.5">
                            <Crosshair className="h-3 w-3" />
                            <span>{action.source}</span>
                          </div>
                        )}
                        {action.percentageGoal != null && (
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3" />
                            <span>
                              Meta: {action.percentageGoal}% de aumento
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className={cn(
                          'flex items-center gap-2 text-xs mt-2',
                          action.status === 'Concluída'
                            ? 'text-muted-foreground'
                            : isExpired
                            ? 'font-bold text-destructive'
                            : 'text-primary font-medium'
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        <span>
                          {isExpired ? 'Prazo Expirado' : 'Prazo'}:{' '}
                          {format(action.deadline, 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEditing(action)}
                        disabled={action.status === 'Concluída'}
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
                );
              })}
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
