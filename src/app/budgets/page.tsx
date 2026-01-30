'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import KanbanBoard from '@/components/kanban/kanban-board';
import type { Lead, Status, ProposalTemplate, AppSettings, UserProfile } from '@/lib/types';
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
import { ListFilter, PlusCircle, Search, User, Settings, Loader2, Trophy, Target, Briefcase, DollarSign, PieChart, LayoutDashboard } from 'lucide-react';
import AddLeadModal from '@/components/kanban/add-lead-modal';
import LeadsStatusChart from '@/components/charts/leads-status-chart';
import LostLeadsChart from '@/components/charts/lost-leads-chart';
import ContactSourceChart from '@/components/charts/contact-source-chart';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, setDoc, deleteDoc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { logClientEvent } from '@/lib/audit-client';


type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: ptBR.localize?.month(i, { width: 'wide' }),
}));

export default function BudgetsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();

  const [filter, setFilter] = useState<FilterPeriod>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [visibleStatuses, setVisibleStatuses] = useState<Status[]>([
    'Novos',
    'Pendente/Em negociação',
    'Aprovado',
    'Desistência',
    'Rejeitado',
  ]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [selectedSeller, setSelectedSeller] = useState<{uid: string, name: string} | null>(null);

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  }, []);

  // Fetch user profile to check for admin role
  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  // Fetch leads from Firestore
  const leadsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    if (isAdmin) {
      return collection(firestore, 'budgets');
    }
    // For non-admins, fetch only their leads
    return query(collection(firestore, 'budgets'), where('createdByUid', '==', user.uid));
  }, [firestore, user, isAdmin]);
  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);

  // Fetch all users to populate seller dropdown
  const allUsersQuery = useMemoFirebase(() => (firestore && isAdmin ? collection(firestore, 'users') : null), [firestore, isAdmin]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(allUsersQuery);
  
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

  // Set the selected seller, defaulting to the logged-in user
  useEffect(() => {
    if (isUserLoading || !user || !userProfile) return;

    const self = { uid: user.uid, name: userProfile.displayName || user.email! };

    if (!isAdmin) {
      setSelectedSeller(self);
      return;
    }
    
    if (!allUsers) return;

    try {
        const savedSellerId = localStorage.getItem('selectedSellerId');
        const savedSeller = allUsers.find(u => u.uid === savedSellerId);

        if (savedSeller) {
            setSelectedSeller({ uid: savedSeller.uid, name: savedSeller.displayName || savedSeller.email! });
        } else {
            setSelectedSeller(self); // Default to self if nothing is saved or saved user doesn't exist
        }
    } catch (error) {
        console.error("Failed to access localStorage:", error);
        setSelectedSeller(self);
    }
  }, [user, userProfile, allUsers, isAdmin, isUserLoading]);
  
  // Persist selectedSeller to localStorage for admins
  useEffect(() => {
    if (!isAdmin) return;
    try {
      if (selectedSeller) {
        localStorage.setItem('selectedSellerId', selectedSeller.uid);
      }
    } catch (error) {
      console.error("Failed to save selected seller to localStorage:", error);
    }
  }, [selectedSeller, isAdmin]);

  const handleSellerChange = (sellerId: string) => {
    const seller = allUsers?.find(u => u.uid === sellerId);
    if (seller) {
      setSelectedSeller({ uid: seller.uid, name: seller.displayName || seller.email! });
    }
  };

  const handleStatusChange = (status: Status) => {
    setVisibleStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const handleAddLead = (values: Omit<Lead, 'id' | 'createdAt' | 'status' | 'createdBy' | 'createdByUid' | 'proposalGeneratedCount' | 'whatsappSentCount' | 'editCount' | 'previousStatus' | 'proposalNumber' | 'proposalVersion' | 'observations' | 'versionHistory'>) => {
      if (!user || !firestore || !selectedSeller) return;
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
        createdBy: selectedSeller.name,
        createdByUid: selectedSeller.uid,
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

      setDoc(newDocRef, newLeadData).then(() => {
        logClientEvent('Criação de Orçamento', auth, `Empresa: ${newLeadData.company}`);
      }).catch(serverError => {
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

  const handleUpdateLead = (updatedLead: Lead) => {
      if (!user || !firestore) return;
      const leadRef = doc(firestore, 'budgets', updatedLead.id);
      
      const serializableLead = {
        ...updatedLead,
        createdAt: updatedLead.createdAt?.toDate ? updatedLead.createdAt.toDate().toISOString() : updatedLead.createdAt
      };

      setDoc(leadRef, updatedLead, { merge: true }).then(() => {
        logClientEvent('Edição de Orçamento', auth, `Empresa: ${updatedLead.company} (Versão: v${updatedLead.proposalVersion})`);
      }).catch(serverError => {
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
      const leadToDelete = leads?.find(l => l.id === leadId);
      const leadRef = doc(firestore, 'budgets', leadId);
      deleteDoc(leadRef).then(() => {
        logClientEvent('Exclusão de Orçamento', auth, `Empresa: ${leadToDelete?.company || leadId}`);
      }).catch(serverError => {
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
        updateDoc(leadRef, updateData).then(() => {
          logClientEvent('Mudança de Status', auth, `'${lead.company}': ${lead.status} -> ${newStatus}`);
        }).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: leadRef.path,
                operation: 'update',
                requestResourceData: updateData,
              });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };


  const filteredLeads = useMemo(() => {
    if (selectedMonth === null || selectedYear === null) return [];
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
             return getMonth(leadDate) === selectedMonth && getYear(leadDate) === selectedYear;
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

  if (isUserLoading || !user || areLeadsLoading || areUsersLoading || areTemplatesLoading || areSettingsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  const sellerOptions = allUsers?.map(u => ({ uid: u.uid, name: u.displayName || u.email! })) || [];

  return (
    <div className="flex flex-col gap-4">
       <div className='flex items-center justify-between gap-4 flex-wrap bg-card p-3 rounded-lg border'>
        {isAdmin && (
          <div className='flex items-center gap-2 mr-auto'>
              <User className='h-5 w-5 text-primary' />
              <label htmlFor="seller-select" className="text-sm font-medium">
                  Criar para:
              </label>
              <Select
                  value={selectedSeller?.uid || ''}
                  onValueChange={handleSellerChange}
                  disabled={!isAdmin || sellerOptions.length === 0}
              >
                  <SelectTrigger className="w-[180px]" id="seller-select">
                  <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                  {sellerOptions.map(seller => (
                      <SelectItem key={seller.uid} value={seller.uid}>{seller.name}</SelectItem>
                  ))}
                  </SelectContent>
              </Select>
          </div>
        )}
        <div className='flex items-center gap-2 ml-auto'>
            <Button onClick={() => setIsAddModalOpen(true)} disabled={!selectedSeller}>
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
        currentSeller={selectedSeller?.name || ''}
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
        seller={selectedSeller?.name || ''}
      />
    </div>
  );
}
