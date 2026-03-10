'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Loader2 } from 'lucide-react';
import type { Lead, UserProfile } from '@/lib/types';

const getUserInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


export default function SalesLeaderboard({ preFilteredLeads, users, isLoading }: { preFilteredLeads: Lead[] | null, users: UserProfile[] | null, isLoading: boolean }) {

  const leaderboardData = useMemo(() => {
    if (!users || !preFilteredLeads) return [];
    
    const performance = users.map(user => {
      // Usa os leads que já foram filtrados pelo Dashboard para garantir consistência
      const sellerLeads = preFilteredLeads.filter(lead => lead.createdByUid === user.uid);
      const approvedLeads = sellerLeads.filter(lead => lead.status === 'Aprovado');
      const totalRevenue = approvedLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);

      return {
        sellerName: user.displayName || user.email!,
        approvedCount: approvedLeads.length,
        revenue: totalRevenue,
      };
    });

    // Remove vendedores sem vendas no período e ordena por receita
    return performance
      .filter(p => p.approvedCount > 0 || p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

  }, [users, preFilteredLeads]);

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Ranking de Vendas do Período
        </CardTitle>
        <CardDescription>
          Desempenho dos vendedores com base no filtro selecionado acima.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex h-40 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : leaderboardData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-center">Aprovados</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((data, index) => (
                <TableRow key={data.sellerName}>
                  <TableCell className="font-bold text-lg text-center">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getUserInitials(data.sellerName)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{data.sellerName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{data.approvedCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {data.revenue.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
            <div className="flex h-40 w-full items-center justify-center">
                <p className="text-muted-foreground">Nenhum dado de vendas aprovado para este filtro.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
