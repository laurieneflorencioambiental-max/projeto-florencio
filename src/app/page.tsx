'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Lead, AppSettings, Status, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Trophy,
  Target,
  Briefcase,
  DollarSign,
  PieChart,
  Clock,
  ArrowRight,
  PlusCircle,
  Users,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
  errorEmitter,
  FirestorePermissionError,
} from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, setDoc, query, where } from 'firebase/firestore';
import {
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  differenceInDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AddLeadModal from '@/components/kanban/add-lead-modal';
import SalesLeaderboard from '@/components/dashboard/sales-leaderboard';
import { cn, toDate } from '@/lib/utils';
import OnlineUsersCard from '@/components/dashboard/online-users-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type FilterPeriod = 'today' | 'week' | 'month' | 'year' | 'specific_month';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: ptBR.localize?.month(i as any, { width: 'wide' }),
}));

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);
  const [filter, setFilter] = useState<FilterPeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const leadsQuery = useMemoFirebase(
    () => {
        if (!user || !firestore || isProfileLoading) return null;

        if (isAdmin) {
            return collection(firestore, 'budgets');
        } else {
            return query(collection(firestore, 'budgets'), where('createdByUid', '==', user.uid));
        }
    },
    [firestore, user, isAdmin, isProfileLoading]
  );
  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);

  const usersQuery = useMemoFirebase(
    () => (isAdmin && firestore ? collection(firestore, 'users') : null),
    [isAdmin, firestore]
  );
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'app-settings', 'global') : null, [firestore]);
  const { data: settings } = useDoc<AppSettings>(settingsRef);
  
  useEffect(() => {
    setIsClient(true);
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleAddLead = (values: Omit<Lead, 'id' | 'createdAt' | 'status' | 'createdBy' | 'createdByUid' | 'proposalGeneratedCount' | 'whatsappSentCount' | 'editCount' | 'previousStatus' | 'proposalNumber' | 'proposalVersion' | 'observations' | 'versionHistory'>) => {
      if (!user || !firestore || !userProfile) return;
      const newDocRef = doc(collection(firestore, 'budgets'));
      
      const newLeadData = {
        name: values.name,
        role: values.role || '',
        company: values.company,
        cnpj: values.cnpj,
        proposalSummary: values.proposalSummary,
        value: values.value,
        paymentMethods: values.paymentMethods,
        contactSource: values.contactSource,
        email: values.email,
        whatsapp: values.whatsapp,
        rejectionReason: values.rejectionReason || null,
        budgetDate: values.budgetDate || new Date().toISOString().split('T')[0],
        proposalArea: values.proposalArea || 'sst',
        id: newDocRef.id,
        status: 'Novos' as Status,
        createdBy: userProfile.displayName || user.email!,
        createdByUid: user.uid,
        proposalGeneratedCount: 0,
        whatsappSentCount: 0,
        editCount: 0,
        previousStatus: null,
        proposalNumber: null,
        proposalVersion: 0,
        observations: null,
        versionHistory: [],
        createdAt: serverTimestamp(),
    };

      setDoc(newDocRef, newLeadData)
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: newDocRef.path,
            operation: 'create',
            requestResourceData: newLeadData,
          }));
        });
  };

  const filteredLeads = useMemo(() => {
    if (!leads || !isClient) return [];

    const now = new Date();
    let interval: { start: Date; end: Date };

    if (filter === 'specific_month') {
      const baseDate = new Date(selectedYear, selectedMonth, 1);
      interval = { start: startOfMonth(baseDate), end: endOfMonth(baseDate) };
    } else {
      switch (filter) {
        case 'today':
          interval = { start: startOfDay(now), end: endOfDay(now) };
          break;
        case 'week':
          interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
          break;
        case 'year':
          interval = { start: startOfYear(now), end: endOfYear(now) };
          break;
        case 'month':
        default:
          interval = { start: startOfMonth(now), end: endOfMonth(now) };
          break;
      }
    }

    return leads.filter(lead => {
      let leadDate: Date | null = null;
      if (lead.budgetDate) {
        const [year, month, day] = lead.budgetDate.split('-').map(Number);
        leadDate = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        leadDate = toDate(lead.createdAt);
      }
      return leadDate ? isWithinInterval(leadDate, interval) : false;
    });
  }, [leads, filter, isClient, selectedMonth, selectedYear]);

  const { conversionRate, averageTicket, approvedCount, totalCount } = useMemo(() => {
    const finishedLeads = filteredLeads.filter(lead =>
      ['Aprovado', 'Desistência', 'Rejeitado'].includes(lead.status)
    );
    const approvedLeads = filteredLeads.filter(
      lead => lead.status === 'Aprovado'
    );
    
    const conversionRate =
      finishedLeads.length > 0
        ? (approvedLeads.length / finishedLeads.length) * 100
        : 0;
        
    const averageTicket =
      approvedLeads.length > 0
        ? approvedLeads.reduce((acc, lead) => acc + (lead.value || 0), 0) /
          approvedLeads.length
        : 0;

    return { 
      conversionRate, 
      averageTicket, 
      approvedCount: approvedLeads.length,
      totalCount: filteredLeads.length
    };
  }, [filteredLeads]);

  const staleLeads = useMemo(() => {
    if (!leads || !settings) return [];
    const staleDays = settings?.staleLeadDays || 7;
    return leads.filter(lead => {
      if (lead.status !== 'Pendente/Em negociação') return false;
      const history = lead.versionHistory || [];
      const lastActivityDate = history.length > 0
          ? toDate(history[history.length - 1].editedAt)
          : toDate(lead.createdAt);
      if (!lastActivityDate) return false;
      return differenceInDays(new Date(), lastActivityDate) > staleDays;
    });
  }, [leads, settings]);

  const recentLeads = useMemo(() => {
    return (leads || [])
      .sort((a, b) => {
        const dateA = toDate(a.createdAt);
        const dateB = toDate(b.createdAt);
        if (!dateB) return 1;
        if (!dateA) return -1;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [leads]);

  const monthlyGoal = settings?.monthlyGoal || 10;
  const goalMet = approvedCount >= monthlyGoal;
  const progressPercentage = monthlyGoal > 0 ? Math.min((approvedCount / monthlyGoal) * 100, 100) : 0;
  
  const isLoading = isUserLoading || areLeadsLoading || areUsersLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const getFilterLabel = () => {
    switch (filter) {
      case 'today': return 'Hoje';
      case 'week': return 'esta Semana';
      case 'year': return 'este Ano';
      case 'specific_month': return `${months[selectedMonth].label} / ${selectedYear}`;
      default: return 'este Mês';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Bem-vindo de volta ao seu resumo comercial.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-card border rounded-lg px-3 py-1.5 shadow-sm flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Período:</span>
              <Select value={filter} onValueChange={(v: FilterPeriod) => setFilter(v)}>
                <SelectTrigger className="w-[140px] h-8 border-none shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="specific_month">Mês Específico</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filter === 'specific_month' && (
              <div className="flex items-center gap-2 border-l pl-3">
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="w-[120px] h-8 border-none shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  className="w-20 h-8 border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm" 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/budgets">
                Ver Funil Completo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Orçamento
            </Button>
          </div>
        </div>
      </div>
      
       <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
            <CardTitle className="text-lg">Indicadores do Período ({getFilterLabel()})</CardTitle>
            <CardDescription>Métricas baseadas na Data do Orçamento.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div className="flex flex-col justify-between p-4 border rounded-lg bg-card/50">
                <Label className="text-muted-foreground mb-2">Total de Orçamentos</Label>
                <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">{totalCount}</p>
                    <Briefcase className="h-5 w-5 text-primary/60" />
                </div>
            </div>
             <div className="flex flex-col justify-between p-4 border rounded-lg bg-card/50">
                <Label className="text-muted-foreground mb-2">Taxa de Conversão</Label>
                <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
                    <PieChart className="h-5 w-5 text-primary/60" />
                </div>
            </div>
            <div className="flex flex-col justify-between p-4 border rounded-lg bg-card/50">
                <Label className="text-muted-foreground mb-2">Ticket Médio</Label>
                <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">
                      {averageTicket.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </p>
                    <DollarSign className="h-5 w-5 text-primary/60" />
                </div>
            </div>
            <div className="flex flex-col justify-between p-4 border rounded-lg bg-card/50">
                  <Label className="text-muted-foreground mb-2">Aprovados {getFilterLabel()}</Label>
                <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">{approvedCount}</p>
                    {goalMet && <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />}
                </div>
                {goalMet && (
                    <p className="text-[10px] font-bold text-green-600 mt-2 uppercase tracking-tight">
                        Meta atingida!
                    </p>
                )}
            </div>
              <div className="flex flex-col justify-between p-4 border rounded-lg bg-primary/5 border-primary/20 space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-primary font-semibold">Meta Mensal</Label>
                    <Target className="h-5 w-5 text-primary/60" />
                </div>
                <div className='flex items-baseline gap-1'>
                  <span className='text-2xl font-bold text-primary'>{approvedCount}</span>
                  <span className='text-sm text-muted-foreground'>/ {monthlyGoal}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
            </div>
        </CardContent>
      </Card>

      {isProfileLoading ? (
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Ranking de Vendas do Mês
            </CardTitle>
            <CardDescription>
              Vendedores com melhor desempenho em receita no mês atual.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex h-40 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      ) : isAdmin && (
         <SalesLeaderboard preFilteredLeads={filteredLeads} users={allUsers} isLoading={isLoading} />
      )}
      
      <div className={cn("grid md:grid-cols-2 gap-6", isAdmin && !isProfileLoading && "lg:grid-cols-3")}>
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos Recentes</CardTitle>
            <CardDescription>Os últimos 5 orçamentos criados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.length > 0 ? (
                  recentLeads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.company}</TableCell>
                      <TableCell>{lead.createdBy}</TableCell>
                      <TableCell><Badge variant="secondary">{lead.status}</Badge></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum orçamento recente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" /> Leads Precisando de Atenção
            </CardTitle>
            <CardDescription>Orçamentos em negociação parados há mais de {settings?.staleLeadDays || 7} dias.</CardDescription>
          </CardHeader>
          <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Dias Parado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staleLeads.length > 0 ? (
                  staleLeads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.company}</TableCell>
                      <TableCell>{lead.createdBy}</TableCell>
                      <TableCell className="text-right font-bold text-amber-600">
                        {isClient ? (() => {
                          const history = lead.versionHistory || [];
                          const lastDate = history.length > 0 
                            ? toDate(history[history.length - 1].editedAt) 
                            : toDate(lead.createdAt);
                          const diff = lastDate ? differenceInDays(new Date(), lastDate) : 0;
                          return diff;
                        })() : '...'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum lead precisando de atenção.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {isProfileLoading ? (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-500" />
                        Usuários Online
                    </CardTitle>
                    <CardDescription>Quem está ativo no sistema agora.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-40 w-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        ) : isAdmin && (
            <OnlineUsersCard />
        )}
      </div>

       <AddLeadModal
        proposalTemplates={[]}
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSave={handleAddLead}
        seller={userProfile?.displayName || user?.email || ''}
        existingLeads={leads || []}
      />
    </div>
  );
}
