'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, orderBy, query, updateDoc } from 'firebase/firestore';
import type { Conversation, Message } from '@/lib/types';
import { Loader2, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ConversationPage() {
  const params = useParams();
  const { toast } = useToast();
  const conversationId = params.conversationId as string;
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const functions = getFunctions(undefined, 'us-central1');

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationRef = useMemoFirebase(() => {
    if (!firestore || !conversationId) return null;
    return doc(firestore, 'conversations', conversationId);
  }, [firestore, conversationId]);
  const { data: conversation, isLoading: isConversationLoading } = useDoc<Conversation>(conversationRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!conversationRef) return null;
    return query(collection(conversationRef, 'messages'), orderBy('timestamp', 'asc'));
  }, [conversationRef]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Mark conversation as read when it's opened
    if (conversationRef && conversation && conversation.unreadCount > 0) {
      updateDoc(conversationRef, { unreadCount: 0 });
    }
  }, [conversation, conversationRef]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;
    
    setIsSending(true);
    try {
      const sendWhatsAppMessage = httpsCallable(functions, 'sendWhatsAppMessage');
      await sendWhatsAppMessage({
        to: conversation.contactPhoneNumber,
        text: newMessage,
        conversationId: conversation.id,
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Enviar',
        description: 'Não foi possível enviar a mensagem. Tente novamente.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  if (isUserLoading || isConversationLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <div className="border rounded-lg h-[calc(100vh-10rem)] flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="font-semibold">{conversation?.contactName}</h2>
          <p className="text-sm text-muted-foreground">{conversation?.contactPhoneNumber}</p>
        </div>
        {conversation?.budgetId && (
          <Button asChild variant="outline">
            <Link href={`/budgets`}>Ver Orçamento</Link>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {areMessagesLoading && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
        {messages?.map(msg => (
          <div key={msg.id} className={cn('flex items-end gap-2', msg.direction === 'out' ? 'justify-end' : 'justify-start')}>
            {msg.direction === 'in' && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(conversation?.contactName || 'C')}</AvatarFallback>
              </Avatar>
            )}
            <div className={cn('max-w-md p-3 rounded-lg', msg.direction === 'out' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className="text-xs opacity-70 mt-1 text-right">
                {format(msg.timestamp.toDate(), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            disabled={isSending}
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
