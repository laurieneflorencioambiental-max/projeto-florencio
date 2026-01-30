'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, Eye, Settings, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { WhatsAppTemplate } from '@/lib/types';


// Mock data - replace with Firestore data fetching
const mockTemplates: WhatsAppTemplate[] = [
    {
      id: '1',
      name: 'follow_up_orcamento',
      category: 'UTILITY',
      bodyText: 'Olá, {{1}}. Gostaria de saber se você teve a oportunidade de revisar o orçamento que enviamos. Há algo em que eu possa ajudar? Atenciosamente, {{2}}.',
      variables: ['Nome do Contato', 'Nome do Vendedor'],
      status: 'APPROVED',
      usageRules: 'Enviar 3 dias após o envio do orçamento, se não houver resposta.',
      isActive: true,
      monthlyUsage: 18,
    },
    {
      id: '2',
      name: 'lembrete_aso',
      category: 'UTILITY',
      bodyText: 'Olá, {{1}}. Gostaríamos de lembrar que o exame periódico de seus colaboradores está próximo do vencimento. Vamos agendar?',
      variables: ['Nome do Contato'],
      status: 'APPROVED',
      usageRules: 'Enviar 30 dias antes do vencimento do ASO periódico dos clientes da base.',
      isActive: true,
      monthlyUsage: 5,
    },
    {
        id: '3',
        name: 'boas_vindas_cliente',
        category: 'MARKETING',
        bodyText: 'Bem-vindo ao Grupo Florencio, {{1}}! Estamos felizes em tê-lo como nosso novo parceiro. Explore nossos serviços em nosso site: {{2}}',
        variables: ['Nome da Empresa', 'Link do Site'],
        status: 'PENDING',
        usageRules: 'Enviar após um lead ser movido para "Aprovado".',
        isActive: false,
        monthlyUsage: 0,
    },
     {
        id: '4',
        name: 'contato_inativo',
        category: 'MARKETING',
        bodyText: 'Olá, {{1}}. Sentimos sua falta! Temos uma nova condição especial para reativar nossa parceria. Gostaria de saber mais?',
        variables: ['Nome do Contato'],
        status: 'REJECTED',
        usageRules: 'Enviar para clientes inativos há mais de 6 meses.',
        isActive: false,
        monthlyUsage: 0,
    },
  ];


export default function WhatsAppTemplatesPage() {

    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    
    // In a real scenario, you'd fetch this from a global settings document
    const monthlyLimit = 100; 

    // Replace mockTemplates with actual Firestore data fetching
    const templatesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'whatsapp_templates') : null), [firestore]);
    const { data: templates, isLoading: areTemplatesLoading } = useCollection<WhatsAppTemplate>(templatesRef);

    const getStatusVariant = (status: 'APPROVED' | 'PENDING' | 'REJECTED' | string) => {
        switch (status) {
          case 'APPROVED':
            return 'default';
          case 'PENDING':
            return 'secondary';
          case 'REJECTED':
            return 'destructive';
          default:
            return 'outline';
        }
      };


    if (areTemplatesLoading) {
        return (
          <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        );
      }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Templates de WhatsApp</CardTitle>
          <CardDescription>
            Mensagens oficiais para iniciar ou retomar conversas fora da janela de 24h.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Alert className="border-primary/50 text-primary-dark bg-primary/10">
        <Bell className="h-4 w-4 !text-primary" />
        <AlertTitle className="font-semibold !text-primary">Atenção ao Custo</AlertTitle>
        <AlertDescription>
            Templates só podem ser usados para iniciar conversas após 24h da última mensagem do cliente. Cada envio bem-sucedido inicia uma "conversa" que pode ser cobrada pela Meta (custo aproximado de R$ 0,40).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
            <CardTitle>Templates Disponíveis</CardTitle>
            <CardDescription>
                Esta é uma lista de todos os templates de mensagem aprovados pela Meta para a sua empresa.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nome do Template</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Uso no Mês</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(templates || []).map((template) => (
                    <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.category}</TableCell>
                        <TableCell>
                            <Badge variant="outline">{template.monthlyUsage} / {monthlyLimit}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(template.status)}>{template.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Visualizar</span>
                            </Button>
                            <Button variant="ghost" size="icon">
                                <Settings className="h-4 w-4" />
                                <span className="sr-only">Gerenciar</span>
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                    {/* Fallback for mock data if firestore is empty */}
                    {(templates?.length === 0) && mockTemplates.map((template) => (
                         <TableRow key={template.id} className="opacity-50">
                            <TableCell className="font-medium">{template.name}</TableCell>
                            <TableCell>{template.category}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{template.monthlyUsage} / {monthlyLimit}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(template.status)}>{template.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" disabled>
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" disabled>
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             {(templates?.length === 0) && (
                <p className="text-center text-sm text-muted-foreground p-4">
                    Nenhum template encontrado no banco de dados. Sincronize com a Meta para carregar. (Dados de exemplo mostrados).
                </p>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
