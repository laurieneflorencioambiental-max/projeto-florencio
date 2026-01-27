'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Lead, AppSettings, Status } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
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
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  format,
} from 'date-fns';
import AddLeadModal from '@/components/kanban/add-lead-modal';
import SalesLeaderboard from '@/components/dashboard/sales-leaderboard';

const getLeadDate = (date: any): Date | null => {
  if (!date) {
    return null;
  }
  if (date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentSeller, setCurrentSeller] = useState<string>('');
  const [monthlyGoal, setMonthlyGoal] = useState<number>(10);

  const leadsQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'budgets') : null),
    [firestore, user]
  );
  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);

  const sellersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sellers') : null),
    [firestore]
  );
  const { data: sellers, isLoading: areSellersLoading } = useCollection<{id: string, name: string}>(sellersQuery);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'app-settings', 'global') : null, [firestore]);
  const { data: settings } = useDoc<AppSettings>(settingsRef);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user) {
        try {
        const savedCurrentSeller = localStorage.getItem('currentSeller');
        if (savedCurrentSeller) {
            setCurrentSeller(savedCurrentSeller);
        } else if (sellers && sellers.length > 0) {
            setCurrentSeller(sellers[0].name);
        }

        const savedGoal = localStorage.getItem('monthlyGoal');
        if (savedGoal) {
            setMonthlyGoal(Number(savedGoal));
        }
        } catch (error) {
            console.error("Failed to access localStorage:", error);
        }
    }
  }, [user, sellers]);
  
  useEffect(() => {
    try {
        localStorage.setItem('monthlyGoal', monthlyGoal.toString());
    } catch (error) {
        console.error("Failed to save goal to localStorage:", error);
    }
  }, [monthlyGoal]);

  const handleAddLead = (values: Omit<Lead, 'id' | 'createdAt' | 'status' | 'createdBy' | 'createdByUid' | 'proposalGeneratedCount' | 'whatsappSentCount' | 'editCount' | 'previousStatus' | 'proposalNumber' | 'proposalVersion' | 'observations' | 'versionHistory'>) => {
      if (!user || !firestore) return;
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
        id: newDocRef.id,
        status: 'Novos' as Status,
        createdBy: currentSeller,
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

      setDoc(newDocRef, newLeadData).catch(serverError => {
          const { createdAt, ...serializableData } = newLeadData;
          const errorData = { ...serializableData, createdAt: new Date().toISOString() };
          const permissionError = new FirestorePermissionError({
              path: newDocRef.path,
              operation: 'create',
              requestResourceData: errorData,
            });
          errorEmitter.emit('permission-error', permissionError);
      });
  };

  const approvedThisMonthCount = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return (leads || []).filter(lead => {
        if (lead.status !== 'Aprovado' || !lead.createdAt || typeof lead.createdAt.toDate !== 'function') {
            return false;
        }
        const leadDate = lead.createdAt.toDate();
        return isWithinInterval(leadDate, { start, end });
    }).length;
  }, [leads]);
  
  const { conversionRate, averageTicket } = useMemo(() => {
    const finishedLeads = (leads || []).filter(lead =>
      ['Aprovado', 'Desistência', 'Rejeitado'].includes(lead.status)
    );
    const approvedLeads = finishedLeads.filter(
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
    return { conversionRate, averageTicket };
  }, [leads]);

  const recentLeads = useMemo(() => {
    return (leads || [])
      .sort((a, b) => {
        const dateA = getLeadDate(a.createdAt);
        const dateB = getLeadDate(b.createdAt);
        if (!dateB) return 1;
        if (!dateA) return -1;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [leads]);

  const staleLeads = useMemo(() => {
    const staleDays = settings?.staleLeadDays || 7;
    return (leads || []).filter(lead => {
      if (lead.status !== 'Pendente/Em negociação') return false;
      const history = lead.versionHistory || [];
      const lastActivityDate = history.length > 0
          ? getLeadDate(history[history.length - 1].editedAt)
          : getLeadDate(lead.createdAt);
      if (!lastActivityDate) return false;
      return differenceInDays(new Date(), lastActivityDate) > staleDays;
    });
  }, [leads, settings]);

  const goalMet = approvedThisMonthCount >= monthlyGoal;
  const progressPercentage = monthlyGoal > 0 ? (approvedThisMonthCount / monthlyGoal) * 100 : 0;
  
  const isLoading = isUserLoading || areLeadsLoading || areSellersLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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
      
       <Card>
        <CardHeader>
            <CardTitle>Metas e Resumo do Mês</CardTitle>
            <CardDescription>Acompanhe o progresso da sua equipe em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div className="flex flex-col justify-between p-4 border rounded-lg">
                <Label className="text-muted-foreground">Total de Orçamentos</Label>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{leads?.length || 0}</p>
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
            </div>
             <div className="flex flex-col justify-between p-4 border rounded-lg">
                <Label className="text-muted-foreground">Taxa de Conversão</Label>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
                    <PieChart className="h-5 w-5 text-muted-foreground" />
                </div>
            </div>
            <div className="flex flex-col justify-between p-4 border rounded-lg">
                <Label className="text-muted-foreground">Ticket Médio</Label>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">
                      {averageTicket.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </p>
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
            </div>
            <div className="flex flex-col justify-between p-4 border rounded-lg">
                  <Label className="text-muted-foreground">Aprovados este Mês</Label>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{approvedThisMonthCount}</p>
                    {goalMet && <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />}
                </div>
                {goalMet && (
                    <p className="text-sm font-medium text-green-600 mt-2">
                        Parabéns, você atingiu a meta do mês!
                    </p>
                )}
            </div>
              <div className="flex flex-col justify-between p-4 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="monthly-goal-input">Meta de Aprovados</Label>
                    <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                    id="monthly-goal-input"
                    type="number"
                    value={monthlyGoal}
                    onChange={e => setMonthlyGoal(Number(e.target.value) >= 0 ? Number(e.target.value) : 0)}
                    className="h-9"
                    min="0"
                />
                  <Progress value={progressPercentage} className="h-2" />
            </div>
        </CardContent>
      </Card>

      <SalesLeaderboard />
      
      <div className="grid md:grid-cols-2 gap-6">
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
                        {differenceInDays(new Date(), getLeadDate((lead.versionHistory?.slice(-1)[0] || lead).editedAt || lead.createdAt)!)}
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
      </div>

       <AddLeadModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSave={handleAddLead}
        seller={currentSeller}
      />
    </div>
  );
}
