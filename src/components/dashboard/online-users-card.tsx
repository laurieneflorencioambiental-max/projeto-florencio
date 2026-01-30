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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getUserInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

export default function OnlineUsersCard() {
  const firestore = useFirestore();
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const onlineUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(user => user.presenceStatus === 'online');
  }, [allUsers]);

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Usuários Online
          </CardTitle>
          <CardDescription>Quem está ativo no sistema agora.</CardDescription>
        </CardHeader>
        <CardContent>
          {areUsersLoading ? (
              <div className="flex h-40 w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
          ) : onlineUsers.length > 0 ? (
              <TooltipProvider>
                <div className="space-y-4">
                  {onlineUsers.map(user => (
                      <div key={user.uid} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'}/>
                                  <AvatarFallback>{getUserInitials(user.displayName)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                                  <p className="text-xs text-muted-foreground">
                                      Visto por último:{' '}
                                      {user.lastSeen ? formatDistanceToNow(user.lastSeen.toDate(), { addSuffix: true, locale: ptBR }) : 'agora'}
                                  </p>
                              </div>
                          </div>
                          <Tooltip>
                              <TooltipTrigger>
                                   <Badge variant={user.isAdmin ? "default" : "secondary"}>{user.isAdmin ? 'Gestor' : 'Vendedor'}</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>{user.isAdmin ? 'Acesso de Gestão' : 'Acesso de Vendas'}</p>
                              </TooltipContent>
                          </Tooltip>
                      </div>
                  ))}
                </div>
              </TooltipProvider>
          ) : (
              <div className="flex h-40 w-full items-center justify-center text-center">
                  <p className="text-muted-foreground">Nenhum usuário online no momento.</p>
              </div>
          )}
        </CardContent>
      </Card>
  );
}
