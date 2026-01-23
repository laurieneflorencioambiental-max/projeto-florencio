'use client';

import { useState, useMemo, useEffect } from 'react';
import KanbanBoard from '@/components/kanban/kanban-board';
import type { Lead, Status, ProposalTemplate, AppSettings } from '@/lib/types';
import { leadSchema, statuses } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getYear,
  getMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ListFilter, PlusCircle, Search, User, Settings, Loader2, Trophy, Target, Briefcase, DollarSign, PieChart } from 'lucide-react';
import AddLeadModal from '@/components/kanban/add-lead-modal';
import LeadsStatusChart from '@/components/charts/leads-status-chart';
import LostLeadsChart from '@/components/charts/lost-leads-chart';
import ContactSourceChart from '@/components/charts/contact-source-chart';
import ManageSellersModal from '@/components/kanban/manage-sellers-modal';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';


type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: ptBR.localize?.month(i, { width: 'wide' }),
}));

type Seller = { id: string; name: string };

export default function BudgetsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [filter, setFilter] = useState<FilterPeriod>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [visibleStatuses, setVisibleStatuses] = useState<Status[]>([
    'Novos',
    'Pendente/Em negociação',
    'Aprovado',
    'Desistência',
    'Rejeitado',
  ]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageSellersModalOpen, setIsManageSellersModalOpen] = useState(false);
  
  // Seller Management State
  const [currentSeller, setCurrentSeller] = useState<string>('');

  // Goal state
  const [monthlyGoal, setMonthlyGoal] = useState<number>(10);

  // Fetch leads from Firestore
  const leadsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'budgets');
  }, [firestore, user]);
  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);

  // Fetch sellers from Firestore
  const sellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sellers');
  }, [firestore]);
  const { data: sellers, isLoading: areSellersLoading } = useCollection<Seller>(sellersQuery);
  
  // Fetch proposal templates from Firestore
  const templatesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'proposal-templates');
  }, [firestore]);
  const { data: proposalTemplates, isLoading: areTemplatesLoading } = useCollection<ProposalTemplate>(templatesQuery);

  // Fetch global app settings from Firestore
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'app-settings', 'global') : null, [firestore]);
  const { data: settings, isLoading: areSettingsLoading } = useDoc<AppSettings>(settingsRef);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // Load current seller preference and goal from localStorage
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
            console.error("Failed to access localStorage on initial load:", error);
        }
    }
  }, [user, sellers]);
  
  // Persist monthlyGoal to localStorage
  useEffect(() => {
    try {
        localStorage.setItem('monthlyGoal', monthlyGoal.toString());
    } catch (error) {
        console.error("Failed to save goal to localStorage:", error);
    }
  }, [monthlyGoal]);

  // Set initial seller when sellers load
  useEffect(() => {
    if(!currentSeller && sellers && sellers.length > 0) {
        const savedCurrentSeller = localStorage.getItem('currentSeller');
        const sellerNames = sellers.map(s => s.name);
        if (savedCurrentSeller && sellerNames.includes(savedCurrentSeller)) {
            setCurrentSeller(savedCurrentSeller);
        } else {
            setCurrentSeller(sellers[0].name);
        }
    }
  }, [sellers, currentSeller])

  // Persist currentSeller to localStorage
  useEffect(() => {
    try {
      if (currentSeller) {
        localStorage.setItem('currentSeller', currentSeller);
      }
    } catch (error) {
      console.error("Failed to save current seller to localStorage:", error);
    }
  }, [currentSeller]);

  const handleSellerChange = (seller: string) => {
    setCurrentSeller(seller);
  };


  const handleStatusChange = (status: Status) => {
    setVisibleStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const handleAddLead = (values: Omit<Lead, 'id' | 'createdAt' | 'status' | 'createdBy' | 'createdByUid' | 'proposalGeneratedCount' | 'whatsappSentCount' | 'editCount' | 'previousStatus' | 'proposalNumber' | 'proposalVersion'>) => {
      if (!user || !firestore) return;
      const newDocRef = doc(collection(firestore, 'budgets'));
      
      const newLeadData = {
          ...values,
          id: newDocRef.id,
          status: 'Novos',
          createdBy: currentSeller,
          createdByUid: user.uid,
          proposalGeneratedCount: 0,
          whatsappSentCount: 0,
          editCount: 0,
          previousStatus: null,
          proposalNumber: null,
          proposalVersion: 0,
      };
      
      const newLeadWithTimestamp = {...newLeadData, createdAt: serverTimestamp()};

      setDoc(newDocRef, newLeadWithTimestamp).catch(serverError => {
          const { createdAt, ...serializableData } = newLeadWithTimestamp;
          const errorData = { ...serializableData, createdAt: new Date().toISOString() };
          const permissionError = new FirestorePermissionError({
              path: newDocRef.path,
              operation: 'create',
              requestResourceData: errorData,
            });
          errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleUpdateLead = (updatedLead: Lead) => {
      if (!user || !firestore) return;
      const leadRef = doc(firestore, 'budgets', updatedLead.id);
      
      // Firestore timestamps are not directly JSON-serializable for error reporting.
      const serializableLead = {
        ...updatedLead,
        createdAt: updatedLead.createdAt?.toDate ? updatedLead.createdAt.toDate().toISOString() : updatedLead.createdAt
      };

      setDoc(leadRef, updatedLead, { merge: true }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: leadRef.path,
            operation: 'update',
            requestResourceData: serializableLead,
          });
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const handleDeleteLead = (leadId: string) => {
      if (!user || !firestore) return;
      const leadRef = doc(firestore, 'budgets', leadId);
      deleteDoc(leadRef).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: leadRef.path,
            operation: 'delete',
          });
        errorEmitter.emit('permission-error', permissionError);
    });
  }

  const handleLeadStatusChange = (leadId: string, newStatus: Status) => {
    if (!user || !firestore || !leads) return;
    const lead = leads.find(l => l.id === leadId);
    if(lead) {
        const leadRef = doc(firestore, 'budgets', leadId);
        const updateData = { status: newStatus, previousStatus: lead.status };
        updateDoc(leadRef, updateData).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: leadRef.path,
                operation: 'update',
                requestResourceData: updateData,
              });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
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

  const goalMet = approvedThisMonthCount >= monthlyGoal;
  const progressPercentage = monthlyGoal > 0 ? (approvedThisMonthCount / monthlyGoal) * 100 : 0;


  const filteredLeads = useMemo(() => {
    const leadsData = leads || [];
    const now = new Date();
    
    let timeFilteredLeads: Lead[];

    if (filter === 'all') {
      timeFilteredLeads = leadsData;
    } else {
      timeFilteredLeads = leadsData.filter(lead => {
        if (!lead.createdAt || typeof lead.createdAt.toDate !== 'function') {
          return false; // Skip leads without a valid date
        }
        const leadDate = lead.createdAt.toDate();
        switch (filter) {
          case 'today':
            return isWithinInterval(leadDate, {
              start: startOfDay(now),
              end: endOfDay(now),
            });
          case 'week':
            return isWithinInterval(leadDate, {
              start: startOfWeek(now),
              end: endOfWeek(now),
            });
          case 'month':
             return getMonth(leadDate) === selectedMonth && getYear(leadDate) === getYear(now);
          case 'year':
            return getYear(leadDate) === selectedYear;
          default:
            return true;
        }
      });
    }

    if (!searchTerm) {
      return timeFilteredLeads;
    }

    return timeFilteredLeads.filter(lead => 
      lead.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

  }, [filter, selectedMonth, selectedYear, leads, searchTerm]);

  if (isUserLoading || !user || areLeadsLoading || areSellersLoading || areTemplatesLoading || areSettingsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  const sellerNames = sellers ? sellers.map(s => s.name) : [];

  return (
    <div className="flex flex-col gap-4">
       <div className='flex items-center justify-between gap-4 flex-wrap bg-card p-3 rounded-lg border'>
        <div className='flex items-center gap-2'>
            <User className='h-5 w-5 text-primary' />
            <label htmlFor="seller-select" className="text-sm font-medium">
                Vendedor(a):
            </label>
             <Select
                value={currentSeller}
                onValueChange={handleSellerChange}
                disabled={sellerNames.length === 0}
            >
                <SelectTrigger className="w-[180px]" id="seller-select">
                <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                {sellerNames.map(seller => (
                    <SelectItem key={seller} value={seller}>{seller}</SelectItem>
                ))}
                </SelectContent>
            </Select>
             <Button variant="ghost" size="icon" onClick={() => setIsManageSellersModalOpen(true)}>
                <Settings className="h-4 w-4" />
                <span className="sr-only">Gerenciar Vendedores</span>
            </Button>
        </div>
        <div className='flex items-center gap-2'>
            <Button onClick={() => setIsAddModalOpen(true)} disabled={!currentSeller}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Orçamento
            </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className='flex items-center gap-4 flex-wrap'>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por empresa..."
                    className="w-full rounded-lg bg-background pl-9 md:w-[200px] lg:w-[320px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
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

            {filter === 'month' && (
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

            {filter === 'year' && (
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Filtrar Status
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Exibir Colunas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {statuses.map(status => (
                        <DropdownMenuCheckboxItem
                            key={status}
                            checked={visibleStatuses.includes(status)}
                            onCheckedChange={() => handleStatusChange(status)}
                        >
                            {status}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <KanbanBoard 
        allLeads={leads || []}
        leads={filteredLeads}
        visibleStatuses={visibleStatuses}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
        onLeadStatusChange={handleLeadStatusChange}
        proposalTemplates={proposalTemplates || []}
        settings={settings}
        currentSeller={currentSeller}
      />
      <div className='mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8'>
        <LeadsStatusChart leads={filteredLeads} />
        <LostLeadsChart leads={filteredLeads} />
        <ContactSourceChart leads={filteredLeads} />
      </div>
      <AddLeadModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSave={handleAddLead}
        seller={currentSeller}
      />
      <ManageSellersModal
        isOpen={isManageSellersModalOpen}
        onOpenChange={setIsManageSellersModalOpen}
        sellers={sellers || []}
      />
    </div>
  );
}
