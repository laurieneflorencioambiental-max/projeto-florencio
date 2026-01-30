'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { MessageSquareOff } from 'lucide-react';

export default function ConversationDisabledPage() {
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-10rem)] w-full flex-col items-center justify-center gap-4 text-center">
        <Card className="max-w-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquareOff className="h-8 w-8 text-muted-foreground" />
                    Caixa de Entrada Desativada
                </CardTitle>
                <CardDescription>
                    Esta funcionalidade foi temporariamente removida.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    A visualização de conversas está desativada no momento. Estamos trabalhando em outras áreas do sistema.
                </p>
            </CardContent>
            <CardFooter>
                 <Button onClick={() => router.push('/')}>
                    Voltar para o Dashboard
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
