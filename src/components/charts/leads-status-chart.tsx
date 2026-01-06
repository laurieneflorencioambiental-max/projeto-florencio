'use client';

import { Pie, PieChart } from 'recharts';
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
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { Lead, Status } from '@/lib/types';
import { useMemo } from 'react';
import { statuses } from '@/lib/types';

type LeadsStatusChartProps = {
  leads: Lead[];
};

const statusColors: Record<Status, string> = {
  Novos: 'hsl(var(--chart-1))',
  'Pendente/Em negociação': 'hsl(var(--chart-2))',
  Aprovado: 'hsl(var(--chart-3))',
  Desistência: 'hsl(var(--chart-4))',
  Rejeitado: 'hsl(var(--chart-5))',
};

const chartConfig = statuses.reduce((acc, status) => {
  acc[status] = {
    label: status,
    color: statusColors[status],
  };
  return acc;
}, {} as any);


export default function LeadsStatusChart({ leads }: LeadsStatusChartProps) {
  const chartData = useMemo(() => {
    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<Status, number>);

    return statuses.map(status => ({
      status,
      count: statusCounts[status] || 0,
      fill: statusColors[status],
    }));
  }, [leads]);

  const totalLeads = useMemo(() => leads.length, [leads]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Distribuição de Status dos Leads</CardTitle>
        <CardDescription>Análise percentual dos orçamentos</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
            >
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="status" />}
              className="-translate-y-[2rem] flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
