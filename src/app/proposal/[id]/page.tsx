'use client';

import { useEffect, useState } from 'react';
import { useFirestore, initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import type { ProposalData, Plan, Exam, AppSettings } from '@/lib/types';
import {
  Loader2,
  Leaf,
  Goal,
  Eye,
  Gem,
  HardHat,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import '../../globals.css';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function ProposalPageContent({ proposalData }: { proposalData: ProposalData }) {
  const {
    lead,
    proposalState,
    fullProposalNumber,
    logoUrl,
    proposalCoverUrl,
    proposalClosingUrl,
  } = proposalData;
  const [mediaConsent, setMediaConsent] = useState<'yes' | 'no' | undefined>(
    undefined
  );
  const [approvalDate, setApprovalDate] = useState<Date>();

  const formatCurrency = (value: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const serviceAreas = [
    { label: 'Saúde e Segurança do Trabalho', icon: HardHat },
    { label: 'Meio Ambiente', icon: Leaf },
    { label: 'eSocial SST', icon: Gem },
    { label: 'Auditorias e Inspeções', icon: Eye },
  ];

  return (
    <main className="bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 flex flex-col items-center gap-8">
      {proposalCoverUrl && (
        <div className="a4-page shadow-lg" style={{ padding: 0 }}>
          <img
            src={proposalCoverUrl}
            alt="Capa da Proposta"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div
        className="a4-page p-8 text-sm bg-white shadow-lg"
        style={{ color: '#596371', minHeight: '297mm' }}
      >
        {/* Header */}
        <header className="flex justify-between items-center pb-4 border-b">
          <div>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo da Empresa"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <h1 className="text-2xl font-bold" style={{ color: '#1b7689' }}>
                Grupo Florencio
              </h1>
            )}
            <p className="text-sm">Saúde Ocupacional Estratégica</p>
            <p className="text-xs">CNPJ: 35.041.385/0001-10</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">Proposta Comercial</h2>
            <p className="text-sm">{fullProposalNumber}</p>
            <p className="text-sm">
              Data:{' '}
              {proposalData.createdAt?.toDate
                ? proposalData.createdAt.toDate().toLocaleDateString('pt-BR')
                : 'Data Indisponível'}
            </p>
          </div>
        </header>

        <Alert className="my-6 print:hidden">
          <Leaf className="h-4 w-4" />
          <AlertDescription>
            Para um processo mais ágil e sustentável, sugerimos que você salve
            esta proposta como PDF (use <strong>Ctrl+P</strong> ou{' '}
            <strong>Cmd+P</strong>) e utilize a assinatura digital do{' '}
            <a
              href="https://www.gov.br/pt-br/servicos/assinatura-eletronica"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              GOV.BR
            </a>
            . Assim, você economiza papel e contribui com o meio ambiente.
          </AlertDescription>
        </Alert>

        {/* Client info */}
        <section className="my-8">
          <h3 className="text-lg font-semibold mb-2 border-b pb-2">Para:</h3>
          <p className="font-bold">{lead.company}</p>
          <p>
            A/C: {lead.name}
            {lead.role && `, ${lead.role}`}
          </p>
          <p>CNPJ: {lead.cnpj}</p>
          <p>Email: {lead.email}</p>
          <p>WhatsApp: {lead.whatsapp}</p>
        </section>

        <div className="border-b my-8"></div>

        {/* About us */}
        <section className="my-8">
          <h3 className="text-lg font-semibold mb-2">Sobre nós</h3>
          <p className="text-sm leading-relaxed mt-4">
            Somos apaixonados há mais de uma década por transformar ambientes de
            trabalho. O Grupo Florêncio se consolidou como referência em Saúde e
            Segurança do Trabalho. Nossa equipe, especializada e eficiente, atua
            com cuidado e comprometimento para criar espaços corporativos mais
            seguros, sustentáveis e alinhados às Normas Regulamentadoras. Com
            transparência e expertise, proporcionamos a confiança que sua empresa
            precisa para elevar seus padrões de segurança e eficiência. Confie em
            nossa experiência para alcançar resultados valiosos e duradouros.
          </p>
          <blockquote
            className="border-l-4 pl-4 py-2 my-4"
            style={{ borderColor: '#1b7689' }}
          >
            <p className="text-sm italic">
              "Nossos serviços são investimentos, onde trazemos benefícios que
              superam qualquer custo, pois não é sobre preço, é sobre entregar
              resultados valiosos. Comprometemo-nos integralmente a proporcionar
              excelência em Saúde e Segurança do Trabalho, impulsionados pela
              nossa especialização e dedicação incansável.”
            </p>
            <footer className="text-right text-xs font-medium mt-2">
              Grupo Florêncio
            </footer>
          </blockquote>
          <div className="mt-8 mb-8 p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-start gap-4">
            <Leaf className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-green-700 dark:text-green-300">Parceria ESG e Sustentabilidade</h4>
              <p className="text-sm leading-relaxed mt-1 text-green-800 dark:text-green-400">
                O Grupo Florencio é um forte aliado das práticas de ESG (Ambiental, Social e Governança). Priorizamos a sustentabilidade em todos os nossos processos. Por isso, incentivamos o uso de propostas digitais e assinaturas eletrônicas, como a do GOV.BR, para reduzir o consumo de papel e minimizar nosso impacto ambiental. Juntos, podemos construir um futuro mais verde e responsável.
              </p>
            </div>
          </div>
          <div className="my-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <Goal className="h-10 w-10 mb-2" style={{ color: '#1b7689' }} />
                <h4 className="font-bold text-lg" style={{ color: '#1b7689' }}>
                  Missão
                </h4>
                <p className="text-sm leading-relaxed mt-2 text-left">
                  Nossa missão é disponibilizar serviços da Qualidade, Saúde, Meio
                  Ambiente & Segurança do Trabalho em prol do uso adequado dos
                  recursos naturais, aumento da produtividade e bem-estar social,
                  superando as expectativas de nossos clientes e agregando valores
                  para a sociedade.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <Eye className="h-10 w-10 mb-2" style={{ color: '#1b7689' }} />
                <h4 className="font-bold text-lg" style={{ color: '#1b7689' }}>
                  Visão
                </h4>
                <p className="text-sm leading-relaxed mt-2 text-left">
                  Sermos reconhecidos pela excelência dos nossos serviços, de forma
                  a garantir qualidade, satisfação do cliente exercendo papel
                  estratégico na execução de todos os trabalhos prestados.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <Gem className="h-10 w-10 mb-2" style={{ color: '#1b7689' }} />
                <h4 className="font-bold text-lg" style={{ color: '#1b7689' }}>
                  Valores
                </h4>
                <p className="text-sm leading-relaxed mt-2 text-left">
                  Dedicação aos nossos clientes, Honestidade, Ética, Transparência,
                  Comprometimento Socio ambiental.
                </p>
              </div>
            </div>
          </div>
          <h4 className="text-md font-semibold text-center mt-6">
            Temos uma equipe especializada para oferecer as melhores soluções em:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center my-6">
            {serviceAreas.map((area, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center p-4 bg-primary/10 rounded-lg"
              >
                <area.icon
                  className="h-8 w-8 mb-2"
                  style={{ color: '#1b7689' }}
                />
                <span
                  className="font-semibold text-sm text-center"
                  style={{ color: '#1b7689' }}
                >
                  {area.label}
                </span>
              </div>
            ))}
          </div>
          <div className="border-b"></div>

          <h3 className="text-lg font-semibold mt-6">Objetivo</h3>
          <p className="text-sm leading-relaxed mt-4">
            Temos por objetivo o compromisso em oferecer serviços de Saúde
            Ocupacional e Segurança do Trabalho com excelência e em conformidade
            com a legislação, promovendo ambientes corporativos seguros,
            saudáveis e produtivos.
          </p>
          <div className="border-b my-6"></div>
          <p className="text-sm leading-relaxed">
            Esta Proposta Comercial está com valores compatíveis de Negociação
            para o atendimento da Prestação de Serviços de QSMS - Qualidade,
            Segurança, Meio Ambiente e Saúde. Gostaríamos de salientar o grande
            interesse que temos em trabalhar em parceria com a sua empresa, pois a
            nossa missão é oferecer serviços em gestão através de uma visão
            estratégica buscando a satisfação do cliente e melhorias para a
            sociedade.
          </p>
          <p className="text-sm leading-relaxed mt-4">
            Para tal, encaminhamos ao V. Sr. (a)., a presente Proposta de Preços
            para a realização dos serviços conforme descritos, de acordo com as
            diretrizes técnicas, para esta conceituada empresa.
          </p>
        </section>

        {/* Dynamic content sections */}
        <section className="my-8 space-y-6">
          <h3 className="text-lg font-semibold mb-2 border-b pb-2">
            Objeto da Proposta
          </h3>
          <div
            className="prose dark:prose-invert max-w-none p-2"
            dangerouslySetInnerHTML={{
              __html: proposalState.proposalObject.replace(/\n/g, '<br />'),
            }}
          />

          <h3 className="text-lg font-semibold mb-2 border-b pb-2">
            Escopo do Serviço
          </h3>
          <div
            className="prose dark:prose-invert max-w-none p-2"
            dangerouslySetInnerHTML={{
              __html: proposalState.serviceScope.replace(/\n/g, '<br />'),
            }}
          />

          <h3 className="text-lg font-semibold mb-2 border-b pb-2">
            Da Contratante
          </h3>
          <div
            className="prose dark:prose-invert max-w-none p-2"
            dangerouslySetInnerHTML={{
              __html: proposalState.clientResponsibilities.replace(
                /\n/g,
                '<br />'
              ),
            }}
          />

          <h3 className="text-lg font-semibold mb-2 border-b pb-2">
            Da Contratada
          </h3>
          <div
            className="prose dark:prose-invert max-w-none p-2"
            dangerouslySetInnerHTML={{
              __html: proposalState.contractorResponsibilities.replace(
                /\n/g,
                '<br />'
              ),
            }}
          />

          <h3 className="text-lg font-semibold mb-2 border-b pb-2">
            Prazo para Realização dos Serviços
          </h3>
          <div
            className="prose dark:prose-invert max-w-none p-2"
            dangerouslySetInnerHTML={{
              __html: proposalState.deadline.replace(/\n/g, '<br />'),
            }}
          />

          <h3 className="text-lg font-semibold mb-2 border-b pb-2">
            Nossa Visão Estratégica
          </h3>
          <div
            className="prose dark:prose-invert max-w-none p-2"
            dangerouslySetInnerHTML={{
              __html: proposalState.strategicVision.replace(/\n/g, '<br />'),
            }}
          />
        </section>

        {/* Investment */}
        <section className="my-8">
          <h3 className="text-lg font-semibold mb-2 border-b pb-2">
            Investimento
          </h3>
          {lead.value > 0 && (
            <div
              className="prose dark:prose-invert max-w-none p-2"
              dangerouslySetInnerHTML={{ __html: proposalState.investment }}
            />
          )}

          {proposalState.plans && proposalState.plans.length > 0 && (
            <div className="mt-4">
              <p className="text-sm mb-4">
                Abaixo seguem as opções dos Planos, de acordo com a estratégia
                financeira da sua empresa.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr
                      style={{ backgroundColor: '#1b7689' }}
                      className="text-white"
                    >
                      <th className="p-3 text-left font-semibold">Planos</th>
                      <th className="p-3 text-left font-semibold">
                        Faixa de Funcionários
                      </th>
                      <th className="p-3 text-left font-semibold">
                        Serviços Inclusos
                      </th>
                      <th className="p-3 text-left font-semibold">
                        Investimento
                      </th>
                      <th className="p-3 text-center font-semibold">PG Único</th>
                      <th className="p-3 text-center font-semibold">PG Mensal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposalState.plans.map((plan: Plan, index: number) => (
                      <tr
                        key={plan.id}
                        className={cn(
                          'border-b',
                          index % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100'
                        )}
                        style={{ borderColor: 'rgba(27, 118, 137, 0.2)' }}
                      >
                        <td className="p-3 align-top">{plan.name}</td>
                        <td className="p-3 align-top">{plan.employeeRange}</td>
                        <td className="p-3 align-top whitespace-pre-wrap">
                          {plan.servicesIncluded}
                        </td>
                        <td className="p-3 align-top">
                          {formatCurrency(plan.investment)}
                        </td>
                        <td className="p-3 text-center align-top">
                          {plan.paymentType === 'unique' ? 'X' : ''}
                        </td>
                        <td className="p-3 text-center align-top">
                          {plan.paymentType === 'monthly' ? 'X' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {proposalState.exams && proposalState.exams.length > 0 && (
            <div className="mt-8">
              <p className="text-sm mb-4">
                Abaixo seguem os valores de exames complementares (se
                aplicável).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr
                      style={{ backgroundColor: '#1b7689' }}
                      className="text-white"
                    >
                      <th className="p-3 text-left font-semibold">Serviço</th>
                      <th className="p-3 text-left font-semibold">Descrição</th>
                      <th className="p-3 text-left font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposalState.exams.map((exam: Exam, index: number) => (
                      <tr
                        key={exam.id}
                        className={cn(
                          'border-b',
                          index % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100'
                        )}
                        style={{ borderColor: 'rgba(27, 118, 137, 0.2)' }}
                      >
                        <td className="p-3 align-top">{exam.service}</td>
                        <td className="p-3 align-top">{exam.description}</td>
                        <td className="p-3 align-top">
                          {formatCurrency(exam.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Condições de Pagamento */}
        <section className="my-8">
          <h3 className="text-lg font-semibold mb-2 border-b pb-2">
            Condições de Pagamento
          </h3>
          <ul className="list-disc list-inside space-y-2">
            {lead.paymentMethods.map((pm, index) => (
              <li key={index}>{pm.method.replace(/\s\(.*\)/, '')}</li>
            ))}
          </ul>
        </section>

        <div className="border-b my-8"></div>

        {/* Termo de Aprovação */}
        <section className="my-8" style={{ breakBefore: 'page' }}>
          <h3 className="text-lg font-semibold mb-4">Termo de aprovação:</h3>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'rgba(27, 118, 137, 0.1)',
              borderColor: 'rgba(27, 118, 137, 0.2)',
            }}
          >
            <h4
              className="font-bold text-center mb-2"
              style={{ color: '#1b7689' }}
            >
              Aprovação do Serviço
            </h4>
            <p className="text-center text-xs">
              Esta Proposta Técnica Comercial será APROVADA, mediante a sua
              devolução via e-mail, assinada e datada por pessoa responsável da
              CONTRATANTE.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">De acordo em:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-[240px] justify-start text-left font-normal print:border-none print:shadow-none',
                        !approvalDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {approvalDate ? (
                        format(approvalDate, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 print:hidden"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={approvalDate}
                      onSelect={setApprovalDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-destructive print:hidden -ml-2">
                (Preencha a data antes de assinar)
              </p>
            </div>
            <p>
              Nome do Aprovador:
              ____________________________________________________
            </p>
          </div>

          <div className="mt-8 border rounded-lg p-4 space-y-4">
            <p className="font-semibold">Prezado cliente,</p>
            <p>
              Em nossa busca contínua em promover práticas de Segurança do
              Trabalho e Sustentabilidade, gostaríamos de propor uma parceria em
              nossas mídias sociais. Caso tenhamos a honra de realizar este
              projeto com a sua empresa, gostaríamos de saber se podemos divulgar
              nosso trabalho realizado nas suas instalações em nossas plataformas
              digitais, como Instagram, Linkedin, Site, YouTube?
            </p>
            <p>
              Acreditamos que essa parceria poderá beneficiar a imagem positiva
              da sua empresa no compromisso com a Segurança do Trabalho e Meio
              Ambiente.
            </p>
            <p className="text-sm text-destructive">
              Para assinalar sua preferência, por favor, clique em uma das
              opções abaixo:
            </p>
            <RadioGroup
              className="space-y-2"
              value={mediaConsent}
              onValueChange={(value: 'yes' | 'no') => setMediaConsent(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="consent-yes" />
                <Label htmlFor="consent-yes">Sim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="consent-no" />
                <Label htmlFor="consent-no">Não</Label>
              </div>
            </RadioGroup>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-8 border-t mt-8">
          <p className="font-bold" style={{ color: '#1b7689' }}>
            Grupo Florencio
          </p>
          <p className="text-xs">
            comercial@grupoflorencio.com.br | +55 (21) 96453-9493 | @grupoflorencio
          </p>
          <p className="text-xs">www.grupoflorencio.com.br</p>
        </footer>
      </div>
      {proposalClosingUrl && (
        <div className="a4-page shadow-lg mt-8" style={{ padding: 0 }}>
          <img
            src={proposalClosingUrl}
            alt="Página de Encerramento da Proposta"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </main>
  );
}

export default function ProposalViewerPage() {
  const params = useParams();
  const [proposalData, setProposalData] = useState<ProposalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError('ID da proposta não encontrado.');
      return;
    }

    const fetchProposalAndSettings = async () => {
      setIsLoading(true);
      try {
        const { firestore } = initializeFirebase();

        // Fetch proposal data
        const proposalRef = doc(firestore, 'proposals', id);
        const proposalSnap = await getDoc(proposalRef);

        if (!proposalSnap.exists()) {
          setError('Proposta não encontrada.');
          setIsLoading(false);
          return;
        }

        const fetchedProposalData = proposalSnap.data() as ProposalData;

        // Fetch global settings
        const settingsRef = doc(firestore, 'app-settings', 'global');
        const settingsSnap = await getDoc(settingsRef);

        const settings = settingsSnap.exists()
          ? (settingsSnap.data() as AppSettings)
          : {};

        // Use saved URL first, then fallback to current global setting.
        setProposalData({
          ...fetchedProposalData,
          logoUrl: fetchedProposalData.logoUrl ?? settings.proposalLogoUrl,
          proposalCoverUrl:
            fetchedProposalData.proposalCoverUrl ?? settings.proposalCoverUrl,
          proposalClosingUrl:
            fetchedProposalData.proposalClosingUrl ??
            settings.proposalClosingUrl,
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Ocorreu um erro ao carregar a proposta.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposalAndSettings();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-destructive bg-background">
        {error}
      </div>
    );
  }

  if (!proposalData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        Nenhuma proposta para exibir.
      </div>
    );
  }

  return <ProposalPageContent proposalData={proposalData} />;
}
