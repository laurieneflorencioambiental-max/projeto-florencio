'use client';

import { useState, useMemo } from 'react';
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
import { ListFilter } from 'lucide-react';

type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: ptBR.localize?.month(i, { width: 'wide' }),
}));

export default function Home() {
  const [filter, setFilter] = useState<FilterPeriod>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [visibleStatuses, setVisibleStatuses] = useState<Status[]>([
    'Novos',
    'Pendente',
    'Aprovado',
  ]);

  const handleStatusChange = (status: Status) => {
    setVisibleStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const filteredLeads = useMemo(() => {
    const now = new Date();
    if (filter === 'all') {
      return initialLeads;
    }
    return initialLeads.filter(lead => {
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
  }, [filter, selectedMonth, selectedYear]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-start gap-4 flex-wrap">
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
      <KanbanBoard initialLeads={filteredLeads} visibleStatuses={visibleStatuses} />
    </div>
  );
}
