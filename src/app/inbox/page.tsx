'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Conversation, UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';


const ConversationItem = ({ conv, pathname }: { conv: Conversation, pathname: string }) => {
  const lastMessageDate = conv.lastMessageAt?.toDate ? conv.lastMessageAt.toDate() : new Date();
  
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <Link href={`/inbox/${conv.id}`} className={cn("block p-4 border-b hover:bg-muted/50", pathname.includes(conv.id) && "bg-muted")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getInitials(conv.contactName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{conv.contactName}</p>
            <p className="text-sm text-muted-foreground truncate max-w-xs">{conv.lastMessage}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(lastMessageDate, { addSuffix: true, locale: ptBR })}</span>
          {conv.unreadCount > 0 && <Badge variant="destructive">{conv.unreadCount}</Badge>}
        </div>
      </div>
    </Link>
  );
};


export default function InboxPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('mine');

  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  const myConversationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'conversations'),
      where('assignedToUid', '==', user.uid),
      orderBy('lastMessageAt', 'desc')
    );
  }, [firestore, user]);
  const { data: myConversations, isLoading: myConversationsLoading } = useCollection<Conversation>(myConversationsQuery);
  
  const unassignedQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null; // Only run for admins
    return query(
        collection(firestore, "conversations"),
        where('assignedToUid', '==', null),
        orderBy('lastMessageAt', 'desc')
    );
  }, [firestore, isAdmin]);
  const { data: unassignedConversations, isLoading: unassignedLoading } = useCollection<Conversation>(unassignedQuery);

  const isLoading = isUserLoading || isProfileLoading || myConversationsLoading || unassignedLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }
  
  if (!user) {
      router.push("/login");
      return null;
  }

  return (
    <div className="border rounded-lg h-[calc(100vh-10rem)] flex flex-col">
       <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4 border-b">
         <TabsList>
           <TabsTrigger value="mine">Minhas Conversas</TabsTrigger>
           {isAdmin && (
             <TabsTrigger value="unassigned">Fila de Atendimento</TabsTrigger>
           )}
         </TabsList>
       </Tabs>
       <div className="flex-1 overflow-y-auto">
            {activeTab === 'mine' && (
                myConversations && myConversations.length > 0 ? (
                    myConversations.map(conv => <ConversationItem key={conv.id} conv={conv} pathname=""/>)
                ) : (
                    <div className="p-8 text-center text-muted-foreground">Nenhuma conversa atribuída a você.</div>
                )
            )}
            {activeTab === 'unassigned' && isAdmin && (
                 unassignedConversations && unassignedConversations.length > 0 ? (
                    unassignedConversations.map(conv => <ConversationItem key={conv.id} conv={conv} pathname=""/>)
                ) : (
                    <div className="p-8 text-center text-muted-foreground">Nenhuma conversa na fila.</div>
                )
            )}
       </div>
    </div>
  );
}
