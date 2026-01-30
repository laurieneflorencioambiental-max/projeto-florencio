
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  LayoutDashboard,
  KanbanSquare,
  FileText,
  BookMarked,
  TrendingUp,
  BarChartHorizontal,
  Calendar,
  Settings,
  Bot,
  Lightbulb,
  Users,
  Calculator,
  Loader2,
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';

type TutorialSection = {
  icon: React.ElementType;
  title: string;
  description: string;
  adminOnly: boolean;
};

const allTutorialSections: TutorialSection[] = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    adminOnly: false,
    description:
      'Sua central de comando. Tenha uma visão geral e imediata do seu desempenho de vendas, metas mensais e atividades que precisam de atenção.',
  },
  {
    icon: KanbanSquare,
    title: 'Funil de Vendas',
    adminOnly: false,
    description:
      'Visualize e gerencie todo o seu processo de vendas em um painel Kanban intuitivo. Arraste e solte os cards para atualizar o status dos seus leads.',
  },
   {
    icon: Calendar,
    title: 'Agenda',
    adminOnly: false,
    description:
      'Gerencie seus compromissos, reuniões e follow-ups. Nunca mais perca um prazo importante.',
  },
  {
    icon: FileText,
    title: 'Modelos de Proposta',
    adminOnly: true,
    description:
      'Padronize e agilize a criação de propostas. Crie modelos reutilizáveis para diferentes tipos de serviços, economizando tempo e garantindo consistência.',
  },
  {
    icon: BookMarked,
    title: 'Catálogo de Serviços',
    adminOnly: true,
    description:
      'Sua lista central de todos os serviços oferecidos. Gerencie nomes, descrições e preços padrão em um único lugar.',
  },
  {
    icon: Calculator,
    title: 'Precificação de Serviços',
    adminOnly: true,
    description:
      'Calcule o preço de venda de um serviço com base em todos os seus custos e margens. Salve os resultados como modelos para usar no seu Catálogo de Serviços.',
  },
   {
    icon: Users,
    title: 'Cálculo de Comissões',
    adminOnly: true,
    description:
      'Calcule o preço final para o cliente ao trabalhar com parceiros comissionados. Salve modelos de comissão para agilizar futuras negociações.',
  },
  {
    icon: TrendingUp,
    title: 'Gestão de Marketing',
    adminOnly: true,
    description:
      'Acompanhe o retorno sobre seus investimentos em marketing (ROI) e planeje suas próximas campanhas estratégicas.',
  },
  {
    icon: Bot,
    title: 'Estrategista de Vendas com IA',
    adminOnly: true,
    description:
      'Receba insights e recomendações estratégicas com base nos seus dados de ROI, disponível na página de Marketing.',
  },
  {
    icon: BarChartHorizontal,
    title: 'Análise de Desempenho',
    adminOnly: true,
    description:
      'Compare a performance da sua equipe de vendas com gráficos claros e objetivos. Filtre os resultados por período para uma análise mais precisa.',
  },
  {
    icon: Settings,
    title: 'Configurações',
    adminOnly: true,
    description:
      'Personalize a aparência, o comportamento e gerencie os dados do seu sistema.',
  },
];

const faqItems = [
    {
        question: 'O que são os cartões de resumo no Dashboard?',
        answer:
          'Eles mostram métricas chave em tempo real: total de orçamentos, taxa de conversão geral, ticket médio e o número de negócios aprovados no mês corrente.',
      },
      {
        question: 'Como funciona a meta de aprovados?',
        answer:
          'Você pode definir uma meta mensal de quantos negócios deseja fechar na página de Configurações. A barra de progresso no dashboard te ajuda a acompanhar o quão perto você está de atingir seu objetivo.',
      },
      {
        question: 'O que são os "Leads Precisando de Atenção"?',
        answer:
          'Esta seção é um alerta automático. Ela mostra os orçamentos que estão na fase de "Pendente/Em negociação" e não recebem nenhuma atualização há um número customizável de dias (definido nas Configurações). É um lembrete para você fazer o follow-up e não deixar o negócio esfriar.',
      },
      {
        question: 'Como eu movo um lead de uma coluna para outra?',
        answer:
          'Simplesmente clique e segure o card do lead que você deseja mover, arraste-o para a coluna do novo status (ex: de "Novos" para "Pendente/Em negociação") e solte. A alteração é salva automaticamente.',
      },
      {
        question: 'Como eu edito as informações de um orçamento?',
        answer:
          'Clique no ícone de lápis no canto superior direito do card. Uma janela (modal) se abrirá com todos os campos do lead para você editar. Cada vez que você salva, uma nova versão da proposta é registrada.',
      },
      {
        question: 'Para que serve o botão "Gerar Proposta"?',
        answer:
          'Este botão abre um gerador de propostas comerciais. Você pode usar um modelo pré-definido, editar o conteúdo em tempo real e gerar um link exclusivo para enviar ao seu cliente.',
      },
       {
        question: 'Como adiciono, edito ou excluo uma reunião na Agenda?',
        answer:
          'Use o formulário no topo da página de Agenda para adicionar uma nova. Na lista de reuniões, cada item possui ícones de lápis (editar) e lixeira (excluir).',
      },
      {
        question: 'Como crio um novo login de VENDEDOR ou GESTOR?',
        answer:
          `1. **Crie o Login:** No painel do Firebase, vá para **Authentication** (no menu "Build"). Clique em "Add user" e crie o login com o email e senha.\n2. **Copie o User UID:** Após criar, você verá o novo usuário na lista. Copie o valor da coluna **User UID**.\n3. **Vá para o Banco de Dados:** No menu "Build", clique em **Firestore Database**.\n4. **Acesse a Coleção 'users':** Clique em **\`users\`**.\n5. **Crie o Perfil:** Clique em **"Adicionar documento"**.\n    - No campo **ID do documento**, cole o \`User UID\` que você copiou.\n    - Adicione o campo: \`email\`, tipo \`string\`, valor \`o e-mail do usuário\`.\n    - Adicione o campo: \`displayName\`, tipo \`string\`, valor \`o nome do usuário\`.\n    - Adicione o campo: \`isAdmin\`, tipo \`boolean\`. Defina como \`true\` para Gestor ou \`false\` para Vendedor.\n6. **Salve o Documento:** Clique em "Salvar". O novo usuário poderá acessar o sistema com as permissões corretas.`
      }
];

export default function TutorialPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserLoading || isProfileLoading;

  const visibleSections = useMemo(() => {
    if (isLoading || !userProfile) {
      return [];
    }
    if (userProfile.isAdmin) {
      return allTutorialSections;
    }
    return allTutorialSections.filter(section => !section.adminOnly);
  }, [userProfile, isLoading]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Tutorial e FAQ
          </CardTitle>
          <CardDescription>
            Bem-vindo ao guia completo do seu sistema de gestão comercial.
            Aprenda a usar cada funcionalidade para maximizar seus resultados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Lightbulb className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-primary">Dica de Mestre</h3>
              <p className="text-sm text-primary/80">
                Este tutorial é o seu melhor amigo! Sempre que tiver dúvidas sobre como usar o sistema, volte a esta página.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Funcionalidades do Sistema</CardTitle>
            <CardDescription>Clique em cada seção para ver a descrição detalhada.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleSections.map((section) => (
                <div key={section.title} className="p-4 border rounded-lg flex items-start gap-4">
                    <section.icon className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                    <h3 className="font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                </div>
                ))}
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Perguntas Frequentes (FAQ)</CardTitle>
            <CardDescription>Respostas para as dúvidas mais comuns.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent className="whitespace-pre-wrap">
                    {item.answer}
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
      </Card>

    </div>
  );
}
