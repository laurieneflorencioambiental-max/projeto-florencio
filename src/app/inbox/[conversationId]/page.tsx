'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { MessageSquareOff } from 'lucide-react';

export default function ConversationDisabledPage() {
  const router = useRouter();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center p-4">
        <Card className="max-w-lg animate-fade-in-up">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center">
                    <MessageSquareOff className="h-8 w-8 text-muted-foreground" />
                    Visualização de Conversa
                </CardTitle>
                <CardDescription>
                    Esta área está quase pronta!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Assim que a integração com a API do WhatsApp for concluída, as conversas individuais aparecerão aqui, permitindo que você responda e interaja com seus clientes diretamente do CRM.
                </p>
            </CardContent>
            <CardFooter>
                 <Button onClick={() => router.push('/inbox')}>
                    Voltar para a Caixa de Entrada
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
