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
  Wrench,
  AlertCircle,
  Bot,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  contactSources,
  campaignStatuses,
  toolPeriodicityOptions,
} from '@/lib/types';
import type {
  RoiEntry,
  MarketingAction,
  CampaignStatus,
  DigitalTool,
  ToolPeriodicity,
} from '@/lib/types';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  format,
  isPast,
  isToday,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  getYear,
  getMonth,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, toDate } from '@/lib/utils';
import {
  suggestCampaignGoalAction,
  analyzeCampaignPerformanceAction,
} from '@/app/actions';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useAuth,
} from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { logClientEvent } from '@/lib/audit-client';

type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: ptBR.localize?.month(i, { width: 'wide' }),
}));

export default function MarketingPage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const auth = useAuth();

  // ROI State
  const [newInvestment, setNewInvestment] = useState('');
  const [newRevenue, setNewRevenue] = useState('');
  const [newSource, setNewSource] = useState('');

  // Action Plan State
  const [newActionName, setNewActionName] = useState('');
  const [newActionGoal, setNewActionGoal] = useState('');
  const [newActionDeadline, setNewActionDeadline] = useState<Date | undefined>();
  const [newActionSource, setNewActionSource] = useState('');
  const [newActionPercentageGoal, setNewActionPercentageGoal] = useState('');
  const [newActionStatus, setNewActionStatus] =
    useState<CampaignStatus>('Futura');
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [isSuggestingGoal, setIsSuggestingGoal] = useState(false);
  const [goalSuggestion, setGoalSuggestion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Digital Tools State
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [newToolName, setNewToolName] = useState('');
  const [newToolValue, setNewToolValue] = useState('');
  const [newToolPeriodicity, setNewToolPeriodicity] =
    useState<ToolPeriodicity>('Mensal');
  const [newToolDueDate, setNewToolDueDate] = useState<Date | undefined>();
  const [newToolObservation, setNewToolObservation] = useState('');

  // Filter state
  const [filter, setFilter] = useState<FilterPeriod>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  }, []);

  // Firestore Collections
  const roiEntriesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'marketing-roi-entries') : null),
    [firestore]
  );
  const { data: entries, isLoading: areEntriesLoading } =
    useCollection<RoiEntry>(roiEntriesRef);

  const actionsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'marketing-actions') : null),
    [firestore]
  );
  const { data: actions, isLoading: areActionsLoading } =
    useCollection<MarketingAction>(actionsRef);

  const toolsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'marketing-tools') : null),
    [firestore]
  );
  const { data: tools, isLoading: areToolsLoading } =
    useCollection<DigitalTool>(toolsRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const filteredActions = useMemo(() => {
    const data = actions || [];
    if (filter === 'all') return data;
    
    if (!isClient) return []; // Defer date-sensitive logic to client

    if (selectedMonth === null || selectedYear === null) return [];
    
    const now = new Date();
    return data.filter(action => {
      const actionDate = toDate(action.deadline);
      if (!actionDate) return false;
      switch (filter) {
        case 'today':
          return isWithinInterval(actionDate, {
            start: startOfDay(now),
            end: endOfDay(now),
          });
        case 'week':
          return isWithinInterval(actionDate, {
            start: startOfWeek(now),
            end: endOfWeek(now),
          });
        case 'month':
          return (
            getMonth(actionDate) === selectedMonth &&
            getYear(actionDate) === selectedYear
          );
        case 'year':
          return getYear(actionDate) === selectedYear;
        default:
          return true;
      }
    });
  }, [actions, filter, selectedMonth, selectedYear, isClient]);

  const filteredEntries = useMemo(() => {
    const data = entries || [];
    if (filter === 'all') return data;

    if (!isClient) return []; // Defer date-sensitive logic to client

    if (selectedMonth === null || selectedYear === null) return [];
    
    const now = new Date();
    return data.filter(entry => {
      const entryDate = toDate(entry.createdAt);
      if (!entryDate) return false;
      switch (filter) {
        case 'today':
          return isWithinInterval(entryDate, {
            start: startOfDay(now),
            end: endOfDay(now),
          });
        case 'week':
          return isWithinInterval(entryDate, {
            start: startOfWeek(now),
            end: endOfWeek(now),
          });
        case 'month':
          return (
            getMonth(entryDate) === selectedMonth &&
            getYear(entryDate) === selectedYear
          );
        case 'year':
          return getYear(entryDate) === selectedYear;
        default:
          return true;
      }
    });
  }, [entries, filter, selectedMonth, selectedYear, isClient]);

  const filteredTools = useMemo(() => {
    const data = tools || [];
    if (filter === 'all') return data;

    if (!isClient) return []; // Defer date-sensitive logic to client

    if (selectedMonth === null || selectedYear === null) return [];
    
    const now = new Date();
    return data.filter(tool => {
      const toolDate = toDate(tool.dueDate);
      if (!toolDate) return false;
      switch (filter) {
        case 'today':
          return isWithinInterval(toolDate, {
            start: startOfDay(now),
            end: endOfDay(now),
          });
        case 'week':
          return isWithinInterval(toolDate, {
            start: startOfWeek(now),
            end: endOfWeek(now),
          });
        case 'month':
          return (
            getMonth(toolDate) === selectedMonth &&
            getYear(toolDate) === selectedYear
          );
        case 'year':
          return getYear(toolDate) === selectedYear;
        default:
          return true;
      }
    });
  }, [tools, filter, selectedMonth, selectedYear, isClient]);

  // ROI Handlers
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roiEntriesRef) return;
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

    const newDocRef = doc(roiEntriesRef);
    const newEntry: Omit<RoiEntry, 'id'> = {
      source: newSource,
      investment: investmentValue,
      revenue: revenueValue,
      roi: calculatedRoi,
      createdAt: serverTimestamp(),
    };

    await setDoc(newDocRef, { ...newEntry, id: newDocRef.id });
    logClientEvent('Criação de ROI', auth, `Fonte: ${newSource}, Investimento: ${investmentValue}`);

    // Reset form
    setNewInvestment('');
    setNewRevenue('');
    setNewSource('');

    toast({
      title: 'Cálculo Adicionado',
      description: `ROI para ${newSource} foi adicionado à lista.`,
    });
  };

  const handleDeleteEntry = async (id: string) => {
    if (!firestore) return;
    const entryToDelete = entries?.find(e => e.id === id);
    await deleteDoc(doc(firestore, 'marketing-roi-entries', id));
    if(entryToDelete) {
        logClientEvent('Exclusão de ROI', auth, `Fonte: ${entryToDelete.source}, Investimento: ${entryToDelete.investment}`);
    }
  };

  const totals = useMemo(() => {
    const totalInvestment = (filteredEntries || []).reduce(
      (acc, entry) => acc + entry.investment,
      0
    );
    const totalRevenue = (filteredEntries || []).reduce(
      (acc, entry) => acc + entry.revenue,
      0
    );

    let totalRoi = 0;
    if (totalInvestment > 0) {
      totalRoi = ((totalRevenue - totalInvestment) / totalInvestment) * 100;
    }

    return { totalInvestment, totalRevenue, totalRoi };
  }, [filteredEntries]);

  // Action Plan Handlers
  const handleStartEditing = (action: MarketingAction) => {
    setEditingActionId(action.id);
    setNewActionName(action.name);
    setNewActionGoal(action.goal);
    setNewActionDeadline(toDate(action.deadline) || undefined);
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

  const handleActionFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionsRef) return;
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
      const actionRef = doc(actionsRef, editingActionId);
      const updatedAction = {
        name: newActionName,
        goal: newActionGoal,
        deadline: newActionDeadline,
        source: newActionSource,
        percentageGoal: percentageGoalValue,
        status: newActionStatus,
      };
      await setDoc(actionRef, updatedAction, { merge: true });
      logClientEvent('Edição de Ação de Marketing', auth, `Ação: ${newActionName}`);
      toast({
        title: 'Ação Atualizada!',
        description: `A campanha "${newActionName}" foi atualizada.`,
      });
    } else {
      const newDocRef = doc(actionsRef);
      const newAction: Omit<MarketingAction, 'id'> = {
        name: newActionName,
        goal: newActionGoal,
        deadline: newActionDeadline,
        status: newActionStatus,
        source: newActionSource,
        percentageGoal: percentageGoalValue,
        createdAt: serverTimestamp(),
      };
      await setDoc(newDocRef, { ...newAction, id: newDocRef.id });
      logClientEvent('Criação de Ação de Marketing', auth, `Ação: ${newActionName}`);
      toast({
        title: 'Ação Adicionada!',
        description: `A campanha "${newActionName}" foi adicionada ao seu plano.`,
      });
    }

    handleCancelEditing();
  };

  const handleDeleteAction = async (id: string) => {
    if (!firestore) return;
    const actionToDelete = actions?.find(a => a.id === id);
    await deleteDoc(doc(firestore, 'marketing-actions', id));
    if(actionToDelete) {
        logClientEvent('Exclusão de Ação de Marketing', auth, `Ação: ${actionToDelete.name}`);
    }
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
        entries || []
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

  const handleAnalyzePerformance = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeCampaignPerformanceAction(entries || []);
      setAnalysisResult(result.analysis);
    } catch (error) {
      console.error(error);
      setAnalysisResult('Não foi possível gerar a análise. Tente novamente.');
      toast({
        variant: 'destructive',
        title: 'Erro na Análise',
        description: 'Ocorreu um erro ao se comunicar com o serviço de IA.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sortedActions = useMemo(() => {
    const statusOrder: Record<CampaignStatus, number> = {
      Rodando: 1,
      Pausada: 2,
      Futura: 3,
      Concluída: 4,
    };
    return [...(filteredActions || [])].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      const dateA = toDate(a.deadline);
      const dateB = toDate(b.deadline);
      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
      }
      return 0;
    });
  }, [filteredActions]);

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

  // Tool Handlers
  const handleToolFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolsRef) return;
    const value = parseFloat(newToolValue);
    if (!newToolName || !newToolDueDate || isNaN(value) || value <= 0) {
      toast({
        variant: 'destructive',
        title: 'Dados inválidos',
        description:
          'Por favor, preencha nome, valor (maior que zero) e data de vencimento da ferramenta.',
      });
      return;
    }

    if (editingToolId) {
      const toolRef = doc(toolsRef, editingToolId);
      const updatedTool = {
        name: newToolName,
        value,
        periodicity: newToolPeriodicity,
        dueDate: newToolDueDate,
        observation: newToolObservation,
      };
      await setDoc(toolRef, updatedTool, { merge: true });
      logClientEvent('Edição de Ferramenta Digital', auth, `Ferramenta: ${newToolName}`);
      toast({
        title: 'Ferramenta Atualizada!',
        description: `A assinatura de "${newToolName}" foi atualizada.`,
      });
    } else {
      const newDocRef = doc(toolsRef);
      const newTool: Omit<DigitalTool, 'id'> = {
        name: newToolName,
        value,
        periodicity: newToolPeriodicity,
        dueDate: newToolDueDate,
        observation: newToolObservation,
        createdAt: serverTimestamp(),
      };
      await setDoc(newDocRef, { ...newTool, id: newDocRef.id });
      logClientEvent('Criação de Ferramenta Digital', auth, `Ferramenta: ${newToolName}`);
      toast({
        title: 'Ferramenta Adicionada!',
        description: `"${newToolName}" foi adicionada à sua lista de investimentos.`,
      });
    }
    handleCancelEditingTool();
  };

  const handleStartEditingTool = (tool: DigitalTool) => {
    setEditingToolId(tool.id);
    setNewToolName(tool.name);
    setNewToolValue(String(tool.value));
    setNewToolPeriodicity(tool.periodicity);
    setNewToolDueDate(toDate(tool.dueDate) || undefined);
    setNewToolObservation(tool.observation || '');
  };

  const handleCancelEditingTool = () => {
    setEditingToolId(null);
    setNewToolName('');
    setNewToolValue('');
    setNewToolPeriodicity('Mensal');
    setNewToolDueDate(undefined);
    setNewToolObservation('');
  };

  const handleDeleteTool = async (id: string) => {
    if (!firestore) return;
    const toolToDelete = tools?.find(t => t.id === id);
    await deleteDoc(doc(firestore, 'marketing-tools', id));
    if(toolToDelete) {
        logClientEvent('Exclusão de Ferramenta Digital', auth, `Ferramenta: ${toolToDelete.name}`);
    }
    toast({
      title: 'Ferramenta Removida',
      description: 'A ferramenta foi removida da sua lista de investimentos.',
    });
  };

  const isLoading = areEntriesLoading || areActionsLoading || areToolsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-start gap-4 flex-wrap bg-card p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <label htmlFor="period-filter" className="text-sm font-medium">
            Filtrar por:
          </label>
          <Select
            value={filter}
            onValueChange={value => setFilter(value as FilterPeriod)}
          >
            <SelectTrigger className="w-[180px]" id="period-filter">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Mês Específico</SelectItem>
              <SelectItem value="year">Ano Específico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filter === 'month' && selectedMonth !== null && (
          <div className="flex items-center gap-2">
            <label htmlFor="month-filter" className="text-sm font-medium">
              Mês:
            </label>
            <Select
              value={selectedMonth.toString()}
              onValueChange={value => setSelectedMonth(Number(value))}
            >
              <SelectTrigger className="w-[180px]" id="month-filter">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(filter === 'month' || filter === 'year') && selectedYear !== null && (
          <div className="flex items-center gap-2">
            <label htmlFor="year-filter" className="text-sm font-medium">
              Ano:
            </label>
            <Input
              id="year-filter"
              type="number"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-[120px]"
              placeholder="Ex: 2024"
            />
          </div>
        )}
      </div>

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
                      {newActionDeadline && isClient ? (
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
          {(sortedActions || []).length > 0 ? (
            <div className="space-y-3">
              {sortedActions.map(action => {
                const deadline = toDate(action.deadline);
                const isExpired =
                  isClient &&
                  deadline &&
                  action.status !== 'Concluída' &&
                  isPast(deadline) &&
                  !isToday(deadline);
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
                          className={cn(
                            statusBadgeConfig[action.status].className
                          )}
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
                       {deadline && (
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
                            {isClient ? format(deadline, 'dd/MM/yyyy') : '...'}
                            </span>
                        </div>
                       )}
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
                Nenhuma ação planejada para este período.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Use o formulário acima para começar a planejar ou altere o
                filtro.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Investimento em Ferramentas Digitais
          </CardTitle>
          <CardDescription>
            Gerencie suas assinaturas e ferramentas de marketing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleToolFormSubmit}
            className="space-y-4 p-4 border rounded-lg bg-muted/50 mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tool-name">Nome da Ferramenta</Label>
                <Input
                  id="tool-name"
                  placeholder="Ex: Canva Pro"
                  value={newToolName}
                  onChange={e => setNewToolName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool-value">Valor (R$)</Label>
                <Input
                  id="tool-value"
                  type="number"
                  placeholder="Ex: 54.90"
                  value={newToolValue}
                  onChange={e => setNewToolValue(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="tool-periodicity">Periodicidade</Label>
                <Select
                  value={newToolPeriodicity}
                  onValueChange={(value: ToolPeriodicity) =>
                    setNewToolPeriodicity(value)
                  }
                >
                  <SelectTrigger id="tool-periodicity">
                    <SelectValue placeholder="Selecione a periodicidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {toolPeriodicityOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool-due-date">Próximo Venc./Prazo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="tool-due-date"
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !newToolDueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newToolDueDate && isClient ? (
                        format(newToolDueDate, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newToolDueDate}
                      onSelect={setNewToolDueDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-observation">Observação (Opcional)</Label>
              <Textarea
                id="tool-observation"
                placeholder="Ex: Contrato anual com cobrança mensal."
                value={newToolObservation}
                onChange={e => setNewToolObservation(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end items-center gap-2 pt-4">
              {editingToolId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEditingTool}
                >
                  Cancelar
                </Button>
              )}
              <Button type="submit">
                {editingToolId ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Ferramenta
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Ferramenta
                  </>
                )}
              </Button>
            </div>
          </form>

          <h3 className="text-lg font-medium mb-4">Ferramentas Adicionadas</h3>
          {(filteredTools || []).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Próximo Venc./Prazo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[100px] text-center">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTools.map(tool => {
                  const dueDate = toDate(tool.dueDate);
                  const isToolOverdue =
                    isClient && dueDate && isPast(dueDate) && !isToday(dueDate);

                  return (
                    <TableRow
                      key={tool.id}
                      className={cn(isToolOverdue && 'bg-destructive/10')}
                    >
                      <TableCell className="font-medium">
                        {tool.name}
                        {tool.observation && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap font-normal">
                            {tool.observation}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{tool.periodicity}</TableCell>
                      <TableCell
                        className={cn(
                          isToolOverdue
                            ? 'text-destructive font-bold'
                            : 'text-green-600 font-semibold'
                        )}
                      >
                         {dueDate && (
                             <div className="flex items-center gap-1.5">
                                {isToolOverdue && <AlertCircle className="h-4 w-4" />}
                                <span>
                                    {isToolOverdue ? 'Vencido em ' : 'Vence em '}
                                    {isClient ? format(dueDate, 'dd/MM/yyyy') : '...'}
                                </span>
                            </div>
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tool.value.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEditingTool(tool)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTool(tool.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                Nenhuma ferramenta adicionada para este período.
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
            {(filteredEntries || []).length > 0 ? (
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
                  {filteredEntries.map(entry => (
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
                  Nenhum cálculo de ROI para este período.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use o formulário acima para começar a ou altere o filtro.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Estrategista de Vendas com IA
          </CardTitle>
          <CardDescription>
            Receba insights e recomendações estratégicas com base nos seus dados
            de ROI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4">
            <Button
              onClick={handleAnalyzePerformance}
              disabled={isAnalyzing || (entries || []).length === 0}
            >
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isAnalyzing ? 'Analisando...' : 'Gerar Análise Estratégica'}
            </Button>
            {(entries || []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Adicione pelo menos um cálculo de ROI para habilitar a análise.
              </p>
            )}
          </div>
          {(isAnalyzing || analysisResult) && (
            <div className="mt-6 border-t pt-6">
              {isAnalyzing ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  <h4 className="font-semibold">Análise da IA:</h4>
                  <p>{analysisResult}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
