'use client';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';
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
import type { Lead } from '@/lib/types';
import { useMemo } from 'react';

type LostLeadsChartProps = {
  leads: Lead[];
};

const chartConfig = {
  count: {
    label: 'Total',
    color: 'hsl(var(--chart-5))',
  },
  highlight: {
    label: 'Maior Motivo',
    color: 'hsl(var(--destructive))',
  }
};

export default function LostLeadsChart({ leads }: LostLeadsChartProps) {
  const chartData = useMemo(() => {
    const lostLeads = leads.filter(
      lead => (lead.status === 'Desistência' || lead.status === 'Rejeitado') && lead.rejectionReason
    );

    const reasonCounts = lostLeads.reduce((acc, lead) => {
      const reason = lead.rejectionReason || 'Motivo não especificado';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .map((item, index) => ({
        ...item,
        fill: index === 0 ? 'var(--color-highlight)' : 'var(--color-count)',
      }));

  }, [leads]);

  if (chartData.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Análise de Orçamentos Perdidos</CardTitle>
                <CardDescription>Principais motivos de desistências e rejeições</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Nenhum dado de orçamento perdido com motivo para exibir.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Orçamentos Perdidos</CardTitle>
        <CardDescription>Principais motivos de desistências e rejeições</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-[300px] h-full w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 10,
              right: 10,
            }}
          >
            <YAxis
              dataKey="reason"
              type="category"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              interval={0}
              width={150} 
              tick={{ transform: 'translate(-10, 0)' }}
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelKey="reason" hideIndicator />}
            />
            <Bar dataKey="count" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
