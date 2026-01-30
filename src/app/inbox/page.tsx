'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Key, Settings, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function InboxSetupPage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 text-center p-4">
        <Card className="max-w-2xl animate-fade-in-up">
            <CardHeader>
                <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                    <MessageCircle className="h-8 w-8 text-primary" />
                    Caixa de Entrada do WhatsApp
                </CardTitle>
                <CardDescription className="text-lg pt-2">
                    Vamos integrar suas conversas do WhatsApp diretamente no seu CRM!
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-left">
                <p>
                    Esta página está pronta para se tornar sua central de atendimento. Para ativá-la, precisamos de algumas chaves da API Oficial do WhatsApp (Meta). O processo é seguro e nos permitirá receber e enviar mensagens diretamente por aqui.
                </p>
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
                        <Key className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Passo 1: Obtenha seus Tokens na Meta</h4>
                            <p className="text-sm text-muted-foreground">
                                Acesse o painel de desenvolvedores da Meta, configure o produto WhatsApp e obtenha seu <strong>Token de Acesso Permanente</strong> e o <strong>ID do seu Número de Telefone</strong>. Você também precisará criar um <strong>Token de Verificação</strong> (uma senha que você mesmo inventa).
                            </p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
                        <Settings className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Passo 2: Configure os "Secrets" no Firebase</h4>
                            <p className="text-sm text-muted-foreground">
                                Com os tokens em mãos, me avise. Eu te guiarei no processo de adicioná-los de forma segura ao seu projeto Firebase. Eles nunca ficarão expostos no código.
                            </p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
                        <ClipboardCheck className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Passo 3: Ativação Final</h4>
                            <p className="text-sm text-muted-foreground">
                                Após configurar os tokens, a integração será ativada e suas conversas começarão a aparecer aqui automaticamente.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full">
                    <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer">
                        Ir para o Guia da Meta
                    </a>
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
