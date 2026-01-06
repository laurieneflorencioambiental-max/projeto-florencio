'use client';

import { useState, useMemo, useEffect } from 'react';
import KanbanBoard from '@/components/kanban/kanban-board';
import { initialLeads } from '@/lib/data';
import type { Lead, Status } from '@/lib/types';
import { statuses } from '@/lib/types';
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
import { ListFilter, PlusCircle, Search, User, Settings } from 'lucide-react';
import AddLeadModal from '@/components/kanban/add-lead-modal';
import LeadsStatusChart from '@/components/charts/leads-status-chart';
import LostLeadsChart from '@/components/charts/lost-leads-chart';
import ManageSellersModal from '@/components/kanban/manage-sellers-modal';

type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: ptBR.localize?.month(i, { width: 'wide' }),
}));

const defaultSellers = [
    'Carlos aaaa',
    'Juliana Paiva',
    'Fernando Lima',
    'Mariana Costa',
];

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
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
  const [sellers, setSellers] = useState<string[]>([]);
  const [currentSeller, setCurrentSeller] = useState<string>('');

  // Load sellers from localStorage on mount
  useEffect(() => {
    try {
      const savedSellers = localStorage.getItem('sellers');
      if (savedSellers) {
        setSellers(JSON.parse(savedSellers));
      } else {
        setSellers(defaultSellers);
      }

      const savedCurrentSeller = localStorage.getItem('currentSeller');
      if (savedCurrentSeller) {
        setCurrentSeller(savedCurrentSeller);
      }
    } catch (error) {
      console.error("Failed to access localStorage:", error);
      setSellers(defaultSellers);
    }
  }, []);

  // Persist sellers to localStorage
  useEffect(() => {
    try {
        if (sellers.length > 0) {
            localStorage.setItem('sellers', JSON.stringify(sellers));
        }
    } catch (error) {
        console.error("Failed to save sellers to localStorage:", error);
    }
  }, [sellers]);


  const handleSellerChange = (seller: string) => {
    setCurrentSeller(seller);
    try {
        localStorage.setItem('currentSeller', seller);
    } catch (error) {
        console.error("Failed to save current seller to localStorage:", error);
    }
  };


  const handleStatusChange = (status: Status) => {
    setVisibleStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const handleAddLead = (newLead: Lead) => {
    setLeads(prevLeads => [newLead, ...prevLeads]);
  };

  const filteredLeads = useMemo(() => {
    const now = new Date();
    
    let timeFilteredLeads: Lead[];

    if (filter === 'all') {
      timeFilteredLeads = leads;
    } else {
      timeFilteredLeads = leads.filter(lead => {
        const leadDate = lead.createdAt;
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
  
  // Ensure currentSeller is valid
  useEffect(() => {
    if (sellers.length > 0 && !sellers.includes(currentSeller)) {
      const newCurrentSeller = sellers[0];
      setCurrentSeller(newCurrentSeller);
      try {
        localStorage.setItem('currentSeller', newCurrentSeller);
      } catch (error) {
        console.error("Failed to update current seller in localStorage:", error);
      }
    } else if (sellers.length === 0) {
        setCurrentSeller('');
    }
  }, [sellers, currentSeller]);

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
                disabled={sellers.length === 0}
            >
                <SelectTrigger className="w-[180px]" id="seller-select">
                <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                {sellers.map(seller => (
                    <SelectItem key={seller} value={seller}>{seller}</SelectItem>
                ))}
                </SelectContent>
            </Select>
             <Button variant="ghost" size="icon" onClick={() => setIsManageSellersModalOpen(true)}>
                <Settings className="h-4 w-4" />
                <span className="sr-only">Gerenciar Vendedores</span>
            </Button>
        </div>
        <div>
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
      <KanbanBoard leads={filteredLeads} setLeads={setLeads} visibleStatuses={visibleStatuses} />
      <div className='mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <LeadsStatusChart leads={filteredLeads} />
        <LostLeadsChart leads={filteredLeads} />
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
        sellers={sellers}
        setSellers={setSellers}
      />
    </div>
  );
}
