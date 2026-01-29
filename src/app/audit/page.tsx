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
import { Loader2, ShieldAlert } from 'lucide-react';
import type { AuditLog, UserProfile } from '@/lib/types';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useDoc } from '@/firebase/firestore/use-doc';

export default function AuditPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isAdmin = userProfile?.isAdmin === true;

  const auditQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, 'audit-logs'), orderBy('timestamp', 'desc'));
  }, [firestore, isAdmin]);

  const { data: auditLogs, isLoading: areLogsLoading } = useCollection<AuditLog>(auditQuery);
  
  const getLogDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  };

  const isLoading = isUserLoading || isProfileLoading || areLogsLoading;

  if (!isUserLoading && !isProfileLoading && !isAdmin) {
    return (
        <div className="flex h-[calc(100vh-10rem)] w-full flex-col items-center justify-center gap-4 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">Acesso Negado</h1>
            <p className="text-muted-foreground">Você não tem permissão para visualizar esta página.</p>
            <Button onClick={() => router.push('/')}>Voltar para o Dashboard</Button>
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
            Histórico de eventos importantes realizados pelos usuários no sistema.
          </CardDescription>
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
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.userEmail}</TableCell>
                    <TableCell>
                      <Badge variant={log.action === 'login' ? 'default' : 'secondary'}>
                        {log.action === 'login' ? 'Login' : 'Logout'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {getLogDate(log.timestamp)
                        ? format(getLogDate(log.timestamp)!, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                        : 'Data inválida'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Nenhum registro de auditoria encontrado.
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
