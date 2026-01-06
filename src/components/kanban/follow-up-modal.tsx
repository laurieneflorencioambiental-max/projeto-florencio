'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFollowUpMessageAction } from '@/app/actions';
import type { Lead } from '@/lib/types';

type FollowUpModalProps = {
  lead: Lead;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function FollowUpModal({
  lead,
  isOpen,
  onOpenChange,
}: FollowUpModalProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setMessage('');
      setHasCopied(false);

      getFollowUpMessageAction(lead)
        .then(result => {
          setMessage(result.followUpMessage);
        })
        .catch(error => {
          console.error(error);
          setMessage('Falha ao gerar mensagem.');
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Não foi possível gerar a mensagem de follow-up.',
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, lead, toast]);

  const handleCopy = () => {
    if(!message) return;
    navigator.clipboard.writeText(message);
    setHasCopied(true);
    toast({
      title: 'Copiado!',
      description:
        'A mensagem de follow-up foi copiada para a área de transferência.',
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Sugestão de Follow-up para {lead.name}
          </DialogTitle>
          <DialogDescription>
            A IA gerou a seguinte mensagem com base no motivo da rejeição: "
            {lead.rejectionReason}"
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-[120px] w-full" />
            </div>
          ) : (
            <Textarea value={message} readOnly rows={8} className="bg-muted" />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleCopy} disabled={isLoading || !message}>
            {hasCopied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {hasCopied ? 'Copiado' : 'Copiar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
