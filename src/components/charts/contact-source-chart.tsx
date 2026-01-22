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

type ContactSourceChartProps = {
  leads: Lead[];
};

const chartConfig = {
  count: {
    label: 'Total',
    color: 'hsl(var(--chart-2))',
  },
  highlight: {
    label: 'Fonte Principal',
    color: 'hsl(var(--chart-1))',
  },
};

export default function ContactSourceChart({ leads }: ContactSourceChartProps) {
  const chartData = useMemo(() => {
    const sourceCounts = leads.reduce(
      (acc, lead) => {
        const source = lead.contactSource.source || 'Não especificada';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const sortedData = Object.entries(sourceCounts)
      .map(([source, count]) => ({
        source,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    if (sortedData.length === 0) {
      return [];
    }
    
    const maxCount = sortedData[0].count;
    const isTie = sortedData.length > 1 && sortedData[1].count === maxCount;

    return sortedData.map((item, index) => ({
      ...item,
      fill: index === 0 && !isTie ? 'var(--color-highlight)' : 'var(--color-count)',
    }));

  }, [leads]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Origem dos Orçamentos</CardTitle>
        <CardDescription>
          Fontes de contato mais eficazes no período
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">
              Nenhum dado de origem para exibir no período.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="max-h-[300px] h-full w-full"
          >
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
                dataKey="source"
                type="category"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                interval={0}
                width={100}
                tick={{ transform: 'translate(-10, 0)' }}
              />
              <XAxis dataKey="count" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelKey="source" hideIndicator />}
              />
              <Bar dataKey="count" layout="vertical" radius={5} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
