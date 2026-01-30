'use client';

import {
  Archive,
  ArchiveX,
  File,
  Inbox,
  Send,
  Trash2,
  Users2,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { Conversation, UserProfile } from '@/lib/types';
import { attendanceQueues } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import Link from 'next/link';

const getUserInitials = (name?: string | null) => {
  if (!name) return '...';
  const parts = name.split(' ');
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.substring(0, 2);
};

export default function InboxPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userProfileRef);

  const conversationsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    if (userProfile.isAdmin) {
      // Managers can see all conversations
      return collection(firestore, 'conversations');
    }
    // Sellers see conversations assigned to them OR in their queues and unassigned
    return query(
        collection(firestore, 'conversations'),
        where('assignedToUid', '==', user.uid)
    );
  }, [firestore, userProfile]);

  const { data: conversations, isLoading: areConversationsLoading } =
    useCollection<Conversation>(conversationsQuery);
    
  const isLoading = isUserLoading || isProfileLoading || areConversationsLoading;

  const myConversations = useMemo(() => {
    if (!conversations || !user) return [];
    return conversations.filter(c => c.assignedToUid === user.uid);
  }, [conversations, user]);

  const unassignedConversations = useMemo(() => {
    if (!conversations || !userProfile) return [];
    return conversations.filter(c => !c.assignedToUid && userProfile.queues?.includes(c.queue!));
  }, [conversations, userProfile]);

  const queueConversations = (queue: string) => {
    if (!conversations || !userProfile) return [];
    return conversations.filter(c => c.queue === queue && !c.assignedToUid);
  }

  const renderConversationList = (convos: Conversation[]) => {
    if (convos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <p className="text-muted-foreground">Nenhuma conversa aqui.</p>
        </div>
      );
    }

    return convos.map(convo => (
      <button
        key={convo.id}
        className={cn(
          'flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent w-full',
          selectedConversation?.id === convo.id && 'bg-muted'
        )}
        onClick={() => setSelectedConversation(convo)}
      >
        <div className="flex w-full items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {getUserInitials(convo.contactName)}
              </AvatarFallback>
            </Avatar>
            <div className="font-semibold">{convo.contactName}</div>
          </div>
          {convo.unreadCount > 0 && (
            <div className="ml-auto text-xs font-medium bg-primary text-primary-foreground h-5 w-5 flex items-center justify-center rounded-full">
              {convo.unreadCount}
            </div>
          )}
        </div>
        <div className="line-clamp-2 text-xs text-muted-foreground">
          {convo.lastMessage?.body.substring(0, 300)}
        </div>
        <div className="flex items-center gap-2">
            {convo.queue && (
                <div className="text-xs text-foreground py-0.5 px-2 rounded-full bg-secondary">
                    {convo.queue}
                </div>
            )}
        </div>
      </button>
    ));
  };


  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-[calc(100vh-6rem)] flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[350px_1fr]">
          <div className="flex flex-col border-r bg-muted/10">
            <div className="p-2">
              <Tabs defaultValue="my-conversations">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="my-conversations">Minhas Conversas</TabsTrigger>
                  <TabsTrigger value="queues">Filas</TabsTrigger>
                </TabsList>
                <TabsContent value="my-conversations" className="m-0">
                   <ScrollArea className="h-[calc(100vh-12rem)]">
                        <div className="flex flex-col gap-2 p-4 pt-2">
                             {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin"/>
                                </div>
                             ) : renderConversationList(myConversations)}
                        </div>
                   </ScrollArea>
                </TabsContent>
                <TabsContent value="queues" className="m-0">
                    <Tabs defaultValue="unassigned">
                         <TabsList className="grid w-full grid-cols-2">
                             <TabsTrigger value="unassigned">Não Atribuído</TabsTrigger>
                             <TabsTrigger value="all-queues">Por Setor</TabsTrigger>
                         </TabsList>
                         <TabsContent value="unassigned" className="m-0">
                            <ScrollArea className="h-[calc(100vh-16rem)]">
                                <div className="flex flex-col gap-2 p-4 pt-2">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-6 w-6 animate-spin"/>
                                        </div>
                                    ) : renderConversationList(unassignedConversations)}
                                </div>
                            </ScrollArea>
                         </TabsContent>
                         <TabsContent value="all-queues" className="m-0">
                            <ScrollArea className="h-[calc(100vh-16rem)]">
                                <div className="flex flex-col gap-2 p-4 pt-2">
                                     {isLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-6 w-6 animate-spin"/>
                                        </div>
                                    ) : (
                                        attendanceQueues.map(queue => (
                                            (userProfile?.queues?.includes(queue) || userProfile?.isAdmin) && (
                                                <details key={queue} className="group">
                                                    <summary className="cursor-pointer font-medium text-sm p-2 rounded-md hover:bg-accent">
                                                        {queue} ({queueConversations(queue).length})
                                                    </summary>
                                                    <div className="pl-4 pt-2 space-y-2">
                                                        {renderConversationList(queueConversations(queue))}
                                                    </div>
                                                </details>
                                            )
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                         </TabsContent>
                    </Tabs>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div className="flex flex-col">
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center p-4 border-b">
                  <div className="flex items-center gap-2">
                     <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            {getUserInitials(selectedConversation.contactName)}
                        </AvatarFallback>
                    </Avatar>
                    <h1 className="text-xl font-medium">
                      {selectedConversation.contactName}
                    </h1>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="icon">
                      <Archive className="h-4 w-4" />
                      <span className="sr-only">Arquivar</span>
                    </Button>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-6 text-center bg-muted/50">
                   <div className="space-y-2">
                        <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground"/>
                        <h3 className="text-lg font-semibold">Visualização de Chat</h3>
                        <p className="text-sm text-muted-foreground">Esta área exibirá o histórico de mensagens da conversa.</p>
                   </div>
                </div>
                <div className="p-4 border-t bg-background">
                    <div className="relative">
                        <Textarea
                        placeholder="Digite sua mensagem..."
                        className="pr-16"
                        rows={2}
                        />
                        <Button
                        type="submit"
                        size="icon"
                        className="absolute top-1/2 right-3 -translate-y-1/2"
                        >
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Enviar</span>
                        </Button>
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center bg-muted/50 h-full">
                <div className="space-y-2">
                  <Inbox className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-semibold">
                    Selecione uma conversa
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Escolha uma conversa da lista para ver as mensagens e
                    responder.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
