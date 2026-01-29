'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ShieldAlert, Search } from 'lucide-react';
import type { AuditLog, UserProfile } from '@/lib/types';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import {
  format,
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
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useDoc } from '@/firebase/firestore/use-doc';

type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

export default function AuditPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userProfileRef);

  const isAdmin = userProfile?.isAdmin === true;

  const auditQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return query(
      collection(firestore, 'audit-logs'),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, isAdmin]);

  const { data: auditLogs, isLoading: areLogsLoading } =
    useCollection<AuditLog>(auditQuery);

  const getLogDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  };

  const filteredLogs = useMemo(() => {
    if (!auditLogs) return [];

    let timeFiltered = auditLogs;

    // Time filter
    if (filterPeriod !== 'all') {
      const now = new Date();
      let interval: Interval;
      switch (filterPeriod) {
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
          interval = { start: new Date(0), end: now }; // Should not happen
      }

      timeFiltered = auditLogs.filter(log => {
        const logDate = getLogDate(log.timestamp);
        if (!logDate) return false;
        return isWithinInterval(logDate, interval);
      });
    }

    // Search filter
    if (!searchTerm) {
      return timeFiltered;
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return timeFiltered.filter(log =>
      log.userEmail.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [auditLogs, searchTerm, filterPeriod]);

  const isLoading = isUserLoading || isProfileLoading || areLogsLoading;

  if (!isUserLoading && !isProfileLoading && !isAdmin) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">
          Você não tem permissão para visualizar esta página.
        </p>
        <Button onClick={() => router.push('/')}>
          Voltar para o Dashboard
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Auditoria do Sistema</CardTitle>
          <CardDescription>
            Histórico de eventos importantes realizados pelos usuários no
            sistema.
          </CardDescription>
          <div className="flex items-center justify-start gap-4 flex-wrap pt-4 border-t mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email do usuário..."
                className="w-full rounded-lg bg-background pl-9 md:w-[250px]"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="period-filter"
                className="text-sm font-medium"
              >
                Filtrar Período:
              </label>
              <Select
                value={filterPeriod}
                onValueChange={value =>
                  setFilterPeriod(value as FilterPeriod)
                }
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead className="text-right">Data e Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.userEmail}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.action === 'login' ? 'default' : 'secondary'
                        }
                      >
                        {log.action === 'login' ? 'Login' : 'Logout'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {getLogDate(log.timestamp)
                        ? format(
                            getLogDate(log.timestamp)!,
                            "dd/MM/yyyy 'às' HH:mm:ss",
                            { locale: ptBR }
                          )
                        : 'Data inválida'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Nenhum registro de auditoria encontrado para os filtros
                    selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
