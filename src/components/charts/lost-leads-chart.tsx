'use client';

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
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
  },
};

export default function LostLeadsChart({ leads }: LostLeadsChartProps) {
  const chartData = useMemo(() => {
    try {
      // Filtra leads que estão em status de perda e que possuem um motivo válido
      const lostLeads = (leads || []).filter(
        lead =>
          (lead.status === 'Desistência' || lead.status === 'Rejeitado') &&
          typeof lead.rejectionReason === 'string' &&
          lead.rejectionReason.trim().length > 0
      );

      if (lostLeads.length === 0) return [];

      const reasonCounts = lostLeads.reduce(
        (acc, lead) => {
          const reason = (lead.rejectionReason as string).trim();
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const sortedData = Object.entries(reasonCounts)
        .map(([reason, count]) => ({
          reason,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      if (sortedData.length === 0) return [];
      
      const maxCount = sortedData[0].count;
      const isTie = sortedData.length > 1 && sortedData[1].count === maxCount;

      return sortedData.map((item, index) => ({
        ...item,
        fill: index === 0 && !isTie ? 'var(--color-highlight)' : 'var(--color-count)',
      }));
    } catch (error) {
      console.error("Error transforming chart data:", error);
      return [];
    }
  }, [leads]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Orçamentos Perdidos</CardTitle>
          <CardDescription>
            Principais motivos de desistências e rejeições
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-center text-sm">
            Nenhum dado de orçamento perdido com motivo para exibir.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Orçamentos Perdidos</CardTitle>
        <CardDescription>
          Principais motivos de desistências e rejeições
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Usamos o length do chartData e o JSON para forçar o re-render imediato */}
        <ChartContainer
          key={`lost-leads-chart-${chartData.length}-${JSON.stringify(chartData)}`}
          config={chartConfig}
          className="min-h-[300px] h-full w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 10,
              right: 30,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="reason"
              type="category"
              tickLine={false}
              axisLine={false}
              className="text-[10px] font-medium"
              interval={0}
              width={120}
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideIndicator />}
            />
            <Bar dataKey="count" layout="vertical" radius={5}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
