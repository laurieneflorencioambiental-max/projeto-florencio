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
  },
  Desistência: {
    label: 'Desistência',
    color: 'hsl(var(--chart-4))',
  },
  Rejeitado: {
    label: 'Rejeitado',
    color: 'hsl(var(--chart-5))',
  },
};

export default function LostLeadsChart({ leads }: LostLeadsChartProps) {
  const chartData = useMemo(() => {
    const lostLeads = leads.filter(
      lead => lead.status === 'Desistência' || lead.status === 'Rejeitado'
    );

    const statusCounts = lostLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<'Desistência' | 'Rejeitado', number>);

    return [
      {
        status: 'Desistência',
        count: statusCounts['Desistência'] || 0,
        fill: 'var(--color-Desistência)',
      },
      {
        status: 'Rejeitado',
        count: statusCounts['Rejeitado'] || 0,
        fill: 'var(--color-Rejeitado)',
      },
    ];
  }, [leads]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Orçamentos Perdidos</CardTitle>
        <CardDescription>Contagem de desistências e rejeições</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-[300px]">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 10,
            }}
          >
            <YAxis
              dataKey="status"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              className="text-sm"
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
