'use client';

import { useState, useMemo } from 'react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Lead, UserProfile } from '@/lib/types';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from 'date-fns';

type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

const chartConfig = {
  total: { label: 'Total', color: 'hsl(var(--chart-1))' },
  approved: { label: 'Aprovados', color: 'hsl(var(--chart-2))' },
  conversion: { label: 'Conversão', color: 'hsl(var(--chart-3))' },
  revenue: { label: 'Receita', color: 'hsl(var(--chart-4))' },
};

export default function AnalyticsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [filter, setFilter] = useState<FilterPeriod>('all');

  const leadsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'budgets');
  }, [firestore, user]);
  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (filter === 'all') {
      return leads;
    }
    const now = new Date();
    let interval: Interval;
    switch (filter) {
      case 'today':
        interval = { start: startOfDay(now), end: endOfDay(now) };
        break;
      case 'week':
        interval = { start: startOfWeek(now), end: endOfWeek(now) };
        break;
      case 'month':
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case 'year':
        interval = { start: startOfYear(now), end: endOfYear(now) };
        break;
      default:
        return leads;
    }
    return leads.filter(lead => {
      const leadDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : null;
      return leadDate ? isWithinInterval(leadDate, interval) : false;
    });
  }, [leads, filter]);

  const performanceData = useMemo(() => {
    if (!allUsers || !filteredLeads) return [];

    return allUsers.map(user => {
      const sellerLeads = filteredLeads.filter(
        lead => lead.createdByUid === user.uid
      );
      const approvedLeads = sellerLeads.filter(
        lead => lead.status === 'Aprovado'
      );
      const totalRevenue = approvedLeads.reduce(
        (sum, lead) => sum + (lead.value || 0),
        0
      );
      const conversionRate =
        sellerLeads.length > 0
          ? (approvedLeads.length / sellerLeads.length) * 100
          : 0;

      return {
        seller: user.displayName || user.email!,
        totalLeads: sellerLeads.length,
        approvedLeads: approvedLeads.length,
        revenue: totalRevenue,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
      };
    }).sort((a,b) => b.totalLeads - a.totalLeads);
  }, [allUsers, filteredLeads]);

  if (areLeadsLoading || areUsersLoading) {
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
            Filtrar por Período:
          </label>
          <Select
            value={filter}
            onValueChange={value => setFilter(value as FilterPeriod)}
          >
            <SelectTrigger className="w-[180px]" id="period-filter">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Orçamentos por Vendedor</CardTitle>
          <CardDescription>
            Total de orçamentos criados por cada vendedor no período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performanceData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart
                accessibilityLayer
                data={performanceData}
                layout="vertical"
                margin={{ right: 20 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="seller" type="category" tickLine={false} axisLine={false} width={100} />
                <XAxis dataKey="totalLeads" type="number" />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Bar dataKey="totalLeads" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
             <div className="flex items-center justify-center h-[400px]">
                <p className="text-muted-foreground text-center">
                Nenhum dado para exibir.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taxa de Conversão por Vendedor</CardTitle>
          <CardDescription>
            Percentual de orçamentos aprovados no período.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {performanceData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart
                accessibilityLayer
                data={performanceData}
                layout="vertical"
                margin={{ right: 20 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="seller" type="category" tickLine={false} axisLine={false} width={100} />
                <XAxis dataKey="conversionRate" type="number" unit="%" />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent unit="%" hideIndicator />}
                />
                <Bar dataKey="conversionRate" fill="var(--color-conversion)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
             <div className="flex items-center justify-center h-[400px]">
                <p className="text-muted-foreground text-center">
                Nenhum dado para exibir.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receita por Vendedor</CardTitle>
          <CardDescription>
            Valor total de orçamentos aprovados por vendedor no período.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {performanceData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart
                accessibilityLayer
                data={performanceData}
                margin={{ top: 20 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="seller" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) =>
                    `R$ ${new Intl.NumberFormat('pt-BR').format(value)}`
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `R$ ${new Intl.NumberFormat('pt-BR').format(
                          value as number
                        )}`
                      }
                      hideIndicator
                    />
                  }
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[400px]">
                <p className="text-muted-foreground text-center">
                Nenhum dado para exibir.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
