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
import { Copy, Check, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { getFollowUpMessageAction } from '@/app/actions'; // Temporarily removed
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
  const [message, setMessage] = useState('A funcionalidade de IA está temporariamente desativada para corrigir um problema de publicação. Ela será reativada em breve.');
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const generateMessage = () => {
    // AI functionality is temporarily disabled.
    setIsLoading(false);
    setMessage('A funcionalidade de IA está temporariamente desativada para corrigir um problema de publicação. Ela será reativada em breve.');
  }

  useEffect(() => {
    if (isOpen) {
      // Set a default message instead of generating one
      setMessage('A funcionalidade de IA está temporariamente desativada para corrigir um problema de publicação. Ela será reativada em breve.');
      setIsLoading(false);
    }
  }, [isOpen, lead]);

  const handleCopy = () => {
    if (message) {
      navigator.clipboard.writeText(message);
      setHasCopied(true);
      toast({
        title: 'Copiado!',
        description: 'A mensagem foi copiada para a área de transferência.',
      });
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline">
            <Sparkles className="inline-block mr-2 text-primary" />
            Sugestão de Follow-up para {lead.company}
          </DialogTitle>
          <DialogDescription>
            A IA gerou a seguinte mensagem com base no motivo da rejeição: "
            {lead.rejectionReason}"
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea value={message} readOnly rows={8} className="bg-muted" />
        </div>
        <DialogFooter className='justify-between'>
          <div>
            <Button variant="ghost" onClick={generateMessage} disabled={true}>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Novamente
            </Button>
          </div>
          <div className='flex gap-2'>
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
