'use client';

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
  HelpCircle,
  Users,
  Calculator,
} from 'lucide-react';

const tutorialSections = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description:
      'Sua central de comando. Tenha uma visão geral e imediata do seu desempenho de vendas, metas mensais e atividades que precisam de atenção.',
    content: [
      {
        question: 'O que são os cartões de resumo?',
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
    ],
  },
  {
    icon: KanbanSquare,
    title: 'Funil de Vendas',
    description:
      'Visualize e gerencie todo o seu processo de vendas em um painel Kanban intuitivo. Arraste e solte os cards para atualizar o status dos seus leads.',
    content: [
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
        question: 'O que é o histórico de versões (v0, v1, v2...)?',
        answer:
          'Cada vez que um orçamento é editado, o sistema cria uma nova "versão". No rodapé do card, você pode clicar no botão de versão (ex: v2) para abrir um pop-up com o histórico completo de quem editou e quando, garantindo total rastreabilidade.',
      },
    ],
  },
  {
    icon: FileText,
    title: 'Modelos de Proposta',
    description:
      'Padronize e agilize a criação de propostas. Crie modelos reutilizáveis para diferentes tipos de serviços, economizando tempo e garantindo consistência.',
    content: [
      {
        question: 'Como eu crio um novo modelo?',
        answer:
          'Use o formulário na parte superior da página. Preencha os campos de texto padrão para cada seção da proposta, como "Objeto", "Escopo", etc. Você também pode adicionar "Planos" estruturados com faixas de funcionários e valores.',
      },
      {
        question: 'O que são os "Planos de Investimento"?',
        answer:
          'São pacotes de serviços pré-definidos que você pode incluir nos modelos. É ideal para propostas que oferecem diferentes níveis de serviço (ex: Básico, Padrão, Premium).',
      },
       {
        question: 'Como eu uso os serviços do catálogo nos modelos?',
        answer:
          'Na seção "Investimentos - Exames/Serviços Avulsos", clique em "Adicionar do Catálogo". Uma busca aparecerá, permitindo que você selecione um serviço previamente cadastrado. O nome, descrição e valor serão preenchidos automaticamente, garantindo consistência.',
      },
    ],
  },
    {
    icon: BookMarked,
    title: 'Catálogo de Serviços',
    description:
      'Sua lista central de todos os serviços oferecidos. Gerencie nomes, descrições e preços padrão em um único lugar.',
    content: [
      {
        question: 'Qual a vantagem de usar o catálogo?',
        answer:
          'Consistência e agilidade. Ao adicionar um serviço do catálogo em um modelo de proposta, você garante que o preço e a descrição estão sempre corretos. Se um preço mudar, você só precisa atualizá-lo uma vez no catálogo.',
      },
       {
        question: 'Posso usar uma Precificação Salva para preencher um item do catálogo?',
        answer:
          'Sim. Ao adicionar ou editar um serviço, você verá um campo para "Carregar a partir de um modelo de precificação". Selecionar um modelo preencherá automaticamente o valor e outros campos, agilizando o cadastro.',
      },
    ],
  },
  {
    icon: Calculator,
    title: 'Precificação de Serviços',
    description:
      'Calcule o preço de venda de um serviço com base em todos os seus custos e margens. Salve os resultados como modelos para usar no seu Catálogo de Serviços.',
    content: [
      {
        question: 'Como funciona a calculadora?',
        answer:
          'Preencha os campos de "Fatores de Custo" (como fornecedor, honorários, etc.) e os "Ajustes Financeiros" (taxas, impostos e sua margem de lucro desejada). A calculadora mostrará o "Resultado da Precificação" em tempo real, culminando no Preço Final de Venda.',
      },
      {
        question: 'Para que serve "Salvar Modelo"?',
        answer: 'Ao clicar em "Salvar Modelo", você armazena toda a estrutura de custos e o preço final. Esse modelo salvo fica disponível na página de Catálogo, permitindo que você adicione rapidamente um serviço ao catálogo com uma precificação já validada e calculada.',
      },
    ],
  },
  {
    icon: TrendingUp,
    title: 'Gestão de Marketing',
    description:
      'Acompanhe o retorno sobre seus investimentos em marketing (ROI) e planeje suas próximas campanhas estratégicas.',
    content: [
      {
        question: 'Como funciona o cálculo de ROI?',
        answer:
          'Na seção "Cálculo de ROI", insira a fonte do investimento (ex: Google, Instagram), o valor que você investiu e a receita que essa fonte gerou. O sistema calculará o ROI automaticamente. Você pode adicionar várias entradas para ter um ROI consolidado.',
      },
      {
        question: 'O que é o Plano de Ação?',
        answer:
          'É onde você define suas futuras campanhas. Você pode nomear a campanha, descrever a meta, definir um prazo e, o mais importante, pedir uma sugestão de meta de aumento percentual para a IA com base nos dados de ROI que você já inseriu.',
      },
    ],
  },
    {
    icon: Bot,
    title: 'Estrategista de Vendas com IA',
    description:
      'Receba insights e recomendações estratégicas com base nos seus dados de ROI, disponível na página de Marketing.',
    content: [
      {
        question: 'Como usar o Estrategista de IA?',
        answer:
          'Após adicionar alguns cálculos de ROI na página de Marketing, clique no botão "Gerar Análise Estratégica". A IA irá analisar o desempenho de cada canal e fornecer um texto com recomendações claras, como onde focar o investimento ou quais canais estão com baixo desempenho.',
      },
    ],
  },
  {
    icon: BarChartHorizontal,
    title: 'Análise de Desempenho',
    description:
      'Compare a performance da sua equipe de vendas com gráficos claros e objetivos. Filtre os resultados por período para uma análise mais precisa.',
    content: [
      {
        question: 'Quais métricas posso analisar?',
        answer:
          'A página mostra três gráficos principais: Orçamentos por Vendedor (volume total), Taxa de Conversão por Vendedor (eficiência) e Receita por Vendedor (resultado financeiro).',
      },
    ],
  },
  {
    icon: Calendar,
    title: 'Agenda',
    description:
      'Gerencie seus compromissos, reuniões e follow-ups. Nunca mais perca um prazo importante.',
    content: [
      {
        question: 'Como adiciono uma reunião?',
        answer:
          'Use o formulário no topo da página. Preencha o título, descrição, data e horário. A nova reunião aparecerá na lista de "Próximas Reuniões".',
      },
       {
        question: 'Como eu edito ou excluo uma reunião?',
        answer:
          'Cada reunião na lista possui ícones de lápis (editar) e lixeira (excluir). Clicar em editar preenche o formulário para você alterar os dados. Excluir pedirá uma confirmação antes de remover o compromisso.',
      },
       {
        question: 'O que acontece quando uma reunião vence?',
        answer:
          'Se a data de uma reunião já passou e ela não foi marcada como "realizada" (usando a caixa de seleção), ela ficará destacada em vermelho para chamar sua atenção.',
      },
    ],
  },
  {
    icon: Settings,
    title: 'Configurações',
    description:
      'Personalize a aparência, o comportamento e gerencie os dados do seu sistema.',
    content: [
      {
        question: 'O que posso personalizar na aparência?',
        answer:
          'Você pode alternar entre o tema claro e escuro, e fazer o upload de imagens personalizadas para o ícone da barra lateral, o fundo da tela de login e o logo/capa das propostas.',
      },
       {
        question: 'O que é a "Zona de Perigo"?',
        answer:
          'É uma área para ações que não podem ser desfeitas. Atualmente, ela contém a ferramenta para limpar dados antigos do sistema (ex: orçamentos, propostas) ou até mesmo zerar completamente o banco de dados. Use com muito cuidado!',
      },
    ],
  },
  {
    icon: Users,
    title: 'Segurança e Gestão de Usuários',
    description:
      'Entenda como o sistema protege seus dados e como gerenciar os diferentes níveis de acesso (Gestor vs. Vendedor).',
    content: [
      {
        question: 'Qual a diferença entre um login de Gestor e um de Vendedor?',
        answer:
          'Um usuário com perfil de "Gestor" (admin) tem acesso a todas as áreas estratégicas do sistema, como Marketing, Análise de Desempenho e Configurações. Um "Vendedor", por padrão, tem uma visão focada em suas atividades: Dashboard, Funil de Vendas, Modelos, Catálogo e Agenda. Eles não podem ver as seções de gestão.',
      },
      {
        question:
          'Como a segurança impede que um vendedor altere o orçamento de outro?',
        answer:
          'A "blindagem" acontece no servidor do Firebase. As regras de segurança garantem que um usuário com perfil de "Vendedor" só pode ler e editar os orçamentos que ele mesmo criou. É impossível para um vendedor acessar os dados de outro através do aplicativo. Gestores, por outro lado, têm permissão para ver todos os orçamentos.',
      },
      {
        question:
          'Passo a passo: Como crio um novo login de VENDEDOR?',
        answer:
          `1. **Crie o Login:** No painel do Firebase, vá para **Authentication** (no menu "Build"). Clique em "Add user" e crie o login com o email e senha para o seu vendedor.\n2. **Copie o User UID:** Após criar, você verá o novo usuário na lista. Copie o valor da coluna **User UID**. Ele é um identificador único, como \`yHWjH41BoNfjuCjRi4uCbYd7hlv1\`.\n3. **Vá para o Banco de Dados:** No menu "Build", clique em **Firestore Database**.\n4. **Acesse a Coleção 'users':** Você verá uma lista de coleções à esquerda. Clique em **\`users\`**.\n5. **Crie o Perfil:** Clique no botão **"Adicionar documento"**.\n    - No campo **ID do documento**, cole o \`User UID\` que você copiou no passo 2. **Isso é crucial!**\n    - Adicione o primeiro campo: \`isAdmin\`, tipo \`boolean\`, valor \`false\`.\n    - Clique em \`+ Adicionar campo\`.\n    - Adicione o segundo campo: \`email\`, tipo \`string\`, valor \`o e-mail do vendedor\`.\n6. **Salve o Documento:** Clique em "Salvar".\n7. **Adicione à Lista de Vendedores:** No seu aplicativo, vá para a página **Funil de Vendas**, clique no ícone de engrenagem (⚙️) ao lado do seletor de vendedor e adicione o nome dele na lista. Isso permitirá que orçamentos sejam criados em seu nome.`,
      },
      {
        question:
          'Passo a passo: Como promovo um Vendedor a GESTOR?',
        answer:
          `1. **Vá para o Banco de Dados:** No painel do Firebase, vá para **Firestore Database**.\n2. **Encontre o Usuário:** Clique na coleção \`users\`. Na lista de documentos, clique no documento cujo ID é o \`User UID\` do vendedor que você quer promover.\n3. **Altere a Permissão:** Você verá os campos \`isAdmin\` e \`email\`. Clique no ícone de lápis para editar o campo \`isAdmin\` e mude seu valor de \`false\` para \`true\`.\n4. **Salve:** Clique em "Atualizar". Na próxima vez que o usuário recarregar a página, ele já terá acesso de gestor.`,
      },
      {
        question: 'Passo a passo: Como eu troco o gestor do sistema?',
        answer:
          '1. No Console do Firebase, vá para o Firestore Database.\n2. Encontre a coleção "users" e localize o documento do gestor atual. Altere o valor do campo "isAdmin" de "true" para "false".\n3. Agora, localize o documento do usuário que você deseja promover a novo gestor.\n4. Altere o valor do campo "isAdmin" dele de "false" para "true".\n5. É isso! Na próxima vez que ambos os usuários acessarem, suas permissões estarão atualizadas. Você pode, inclusive, ter mais de um gestor, se necessário.',
      },
    ],
  },
];

export default function TutorialPage() {
  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Tutorial do Sistema
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
                Este tutorial é o seu melhor amigo! Sempre que uma nova
                funcionalidade for adicionada ao sistema, esta página será
                atualizada para te ensinar a usá-la. Volte sempre que tiver
                dúvidas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        {tutorialSections.map(section => (
          <AccordionItem value={section.title} key={section.title}>
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              <div className="flex items-center gap-4">
                <section.icon className="h-6 w-6 text-primary" />
                <span>{section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-14">
              <p className="text-base text-muted-foreground mb-6">
                {section.description}
              </p>
              <div className="space-y-4">
                {section.content.map(item => (
                  <div
                    key={item.question}
                    className="p-4 border-l-4 border-muted-foreground/20 rounded-r-lg bg-muted/40"
                  >
                    <h4 className="font-semibold text-foreground">
                      {item.question}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
