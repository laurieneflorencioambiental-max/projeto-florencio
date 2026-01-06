'use client';

import { useState, useMemo } from 'react';
import KanbanBoard from '@/components/kanban/kanban-board';
import { initialLeads } from '@/lib/data';
import type { Lead } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'date-fns';

type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

export default function Home() {
  const [filter, setFilter] = useState<FilterPeriod>('all');

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
          return isWithinInterval(leadDate, {
            start: startOfMonth(now),
            end: endOfMonth(now),
          });
        case 'year':
          return isWithinInterval(leadDate, {
            start: startOfYear(now),
            end: endOfYear(now),
          });
        default:
          return true;
      }
    });
  }, [filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-start gap-4">
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
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <KanbanBoard initialLeads={filteredLeads} />
    </div>
  );
}
