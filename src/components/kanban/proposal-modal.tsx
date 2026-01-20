'use client';

import { useRef, useState, useEffect } from 'react';
import type { Lead, ProposalTemplate, Plan } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  Send,
  ClipboardCheck,
  Recycle,
  ClipboardList,
  SearchCheck,
  Target,
  Eye,
  Gem,
  Mail,
  Link as LinkIcon,
  Loader2,
  Copy,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { getApp, type FirebaseApp } from 'firebase/app';
import { uploadProposalPdf } from '@/firebase/storage';
import { useToast } from '@/hooks/use-toast';

type ProposalModalProps = {
  lead: Lead;
  allLeads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateLead: (lead: Lead) => void;
  proposalTemplates: ProposalTemplate[];
};

type ProposalState = Omit<ProposalTemplate, 'id' | 'name'>;

export default function ProposalModal({
  lead,
  allLeads,
  isOpen,
  onOpenChange,
  onUpdateLead,
  proposalTemplates,
}: ProposalModalProps) {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [fullProposalNumber, setFullProposalNumber] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Safely get the Firebase app instance after mount, avoiding context issues with portals.
    if (isOpen) {
      try {
        const app = getApp();
        setFirebaseApp(app);
      } catch (error) {
        console.error("Firebase app not initialized.", error);
        toast({
            variant: 'destructive',
            title: 'Erro de Configuração',
            description: 'O app Firebase não foi inicializado corretamente.'
        });
      }
    }
  }, [isOpen, toast]);

  const [proposalState, setProposalState] = useState<ProposalState>({
    proposalObject: lead.proposalSummary,
    serviceScope: 'A ser definido na proposta.',
    clientResponsibilities: 'A ser definido na proposta.',
    contractorResponsibilities: 'A ser definido na proposta.',
    deadline: 'A ser definido na proposta.',
    investment: 'A ser definido na proposta.',
    strategicVision: 'A ser definido na proposta.',
    plans: [],
    exams: [],
  });

  const resetState = () => {
     // Set initial state from lead/defaults when modal opens
      const defaultInvestmentText = lead.value > 0 
        ? `
<div class="mt-4 flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
    <p class="text-lg">Valor Total do Orçamento:</p>
    <p class="text-2xl font-bold text-primary">${formatCurrency(lead.value)}</p>
</div>
        `
        : 'Valores detalhados nos planos abaixo.';

      setProposalState({
        proposalObject: lead.proposalSummary,
        serviceScope: 'A ser definido na proposta.',
        clientResponsibilities: 'A ser definido na proposta.',
        contractorResponsibilities: 'A ser definido na proposta.',
        deadline: 'A ser definido na proposta.',
        investment: defaultInvestmentText,
        strategicVision: 'A ser definido na proposta.',
        plans: [],
        exams: [],
      });

      let currentProposalNumber = lead.proposalNumber;

      if (!currentProposalNumber) {
        // This is a simplified way to get the next number. In a real multi-user app, this should be handled by a backend.
        const highestProposalNumber = Math.max(
          0,
          ...allLeads.map(l => l.proposalNumber || 0)
        );
        currentProposalNumber = highestProposalNumber + 1;
      }

      const paddedNumber = String(currentProposalNumber).padStart(3, '0');
      const version = lead.proposalVersion || 0;
      const proposalId = `PTC-FLO-SST-${paddedNumber}.${version}`;
      setFullProposalNumber(proposalId);

      // Update lead state if a new number was generated
      if (!lead.proposalNumber) {
        onUpdateLead({
          ...lead,
          proposalNumber: currentProposalNumber,
        });
      }
      setIsGenerating(false);
  }

  useEffect(() => {
    if (isOpen) {
     resetState();
    }
  }, [isOpen, lead, allLeads, onUpdateLead]);

  const handleTemplateChange = (templateId: string) => {
    const template = proposalTemplates.find(t => t.id === templateId);
    if (template) {
      const templateInvestment = template.investment || (lead.value > 0 
        ? `
<div class="mt-4 flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
    <p class="text-lg">Valor Total do Orçamento:</p>
    <p class="text-2xl font-bold text-primary">${formatCurrency(lead.value)}</p>
</div>
        `
        : 'Valores detalhados nos planos abaixo.');

      setProposalState({
          proposalObject: template.proposalObject,
          serviceScope: template.serviceScope,
          clientResponsibilities: template.clientResponsibilities,
          contractorResponsibilities: template.contractorResponsibilities,
          deadline: template.deadline,
          investment: templateInvestment,
          strategicVision: template.strategicVision,
          plans: template.plans || [],
          exams: template.exams || [],
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const generateAndUploadPdf = async (): Promise<string | null> => {
    const input = proposalRef.current;
    if (!input || !firebaseApp) {
      toast({
        variant: 'destructive',
        title: 'Erro de Inicialização',
        description:
          'O Firebase ainda não está pronto. Tente novamente em alguns segundos.',
      });
      return null;
    }

    setIsGenerating(true);

    const editableDivs = Array.from(
      input.querySelectorAll('[contenteditable]')
    );
    editableDivs.forEach(div => {
      const field = div.getAttribute('data-field') as keyof ProposalState | null;
      if (
        field &&
        typeof proposalState[
          field as keyof Omit<ProposalState, 'plans' | 'exams'>
        ] === 'string'
      ) {
        div.innerHTML = (
          proposalState[
            field as keyof Omit<ProposalState, 'plans' | 'exams'>
          ] as string
        ).replace(/\n/g, '<br />');
      }
    });

    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const fileName = `proposta-${lead.company
        .toLowerCase()
        .replace(/[\s/.]+/g, '-')}-${fullProposalNumber}.pdf`;

      const downloadUrl = await uploadProposalPdf(
        firebaseApp,
        `propostas/${lead.id}/${fileName}`,
        pdfBlob
      );

      onUpdateLead({
        ...lead,
        proposalGeneratedCount: (lead.proposalGeneratedCount || 0) + 1,
      });

      toast({
        title: 'Link Gerado!',
        description: 'O link para a proposta está pronto para ser compartilhado.',
      });

      return downloadUrl;
    } catch (error) {
      console.error('Erro ao gerar/enviar PDF:', error);

      toast({
        variant: 'destructive',
        title: 'Erro!',
        description:
          (error as any)?.message
            ? `Falha: ${(error as any).message}`
            : 'Não foi possível gerar o link da proposta. Tente novamente.',
      });

      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async (platform: 'whatsapp' | 'email' | 'copy') => {
    const proposalLink = await generateAndUploadPdf();
    if (!proposalLink) return;

    if (platform === 'copy') {
      navigator.clipboard.writeText(proposalLink);
      toast({ title: 'Sucesso', description: 'Link copiado para a área de transferência!' });
      return;
    }

    let text, url;
    if (platform === 'whatsapp') {
      onUpdateLead({
        ...lead,
        whatsappSentCount: (lead.whatsappSentCount || 0) + 1,
      });
      text = `Olá ${lead.name}, conforme conversamos, segue o link da proposta comercial para a ${lead.company}: ${proposalLink}`;
      url = `https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(text)}`;
    } else { // email
      const subject = `Proposta Comercial - Grupo Florencio para ${lead.company}`;
      const body = `Prezado(a) ${lead.name},\n\nConforme conversamos, segue o link para nossa proposta comercial elaborada para a ${lead.company}:\n\n${proposalLink}\n\nEstamos à disposição para qualquer esclarecimento.\n\nAtenciosamente,\nGrupo Florencio`;
      url = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    window.open(url, '_blank');
  };
  
  const serviceAreas = [
    { icon: ClipboardCheck, label: 'Saúde e Segurança do Trabalho' },
    { icon: Recycle, label: 'Meio Ambiente' },
    { icon: ClipboardList, label: 'eSocial SST' },
    { icon: SearchCheck, label: 'Auditorias e Inspeções' },
  ];
  
  const EditableDiv = ({
    field,
    className,
    children
  }: {
    field: keyof Omit<ProposalState, 'plans' | 'exams'>;
    className?: string;
    children?: React.ReactNode;
  }) => {
    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        setProposalState(prevState => ({
          ...prevState,
          [field]: e.currentTarget.innerHTML,
        }));
    };
  
    return (
      <div
        contentEditable={!isGenerating}
        suppressContentEditableWarning
        data-field={field}
        className={cn('focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm', className)}
        onBlur={handleBlur}
        dangerouslySetInnerHTML={{ __html: String(proposalState[field]).replace(/\n/g, '<br />') }}
      >
        {children}
      </div>
    );
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Gerador de Proposta</DialogTitle>
          <DialogDescription>
            Visualize, edite e envie a proposta para {lead.company}.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Label htmlFor="proposal-template">
            Selecione um Modelo de Serviço
          </Label>
          <Select onValueChange={handleTemplateChange} disabled={isGenerating}>
            <SelectTrigger id="proposal-template">
              <SelectValue placeholder="Escolha um modelo para o objeto da proposta" />
            </SelectTrigger>
            <SelectContent>
              {proposalTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 bg-white rounded-md">
          <div
            ref={proposalRef}
            className="p-0"
            id="proposal-container"
          >
            <div className="a4-page p-8 text-sm bg-white" style={{ color: '#596371', minHeight: '100%' }} id="proposal-content">
              {/* Cabeçalho da Proposta */}
              <header className="flex justify-between items-center pb-4 border-b">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: '#1b7689' }}>
                    Grupo Florencio
                  </h1>
                  <p className="text-sm">Saúde Ocupacional Estratégica</p>
                  <p className="text-xs">CNPJ: 35.041.385/0001-10</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-semibold">Proposta Comercial</h2>
                  <p className="text-sm">{fullProposalNumber}</p>
                  <p className="text-sm">
                    Data: {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </header>

              {/* Informações do Cliente */}
              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                  Para:
                </h3>
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

              {/* Sobre Nós e Missão, Visão, Valores */}
              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2">
                  Sobre nós
                </h3>
                  <p className="text-sm leading-relaxed mt-4">
                    Somos apaixonados há mais de uma década por transformar
                    ambientes de trabalho. O Grupo Florêncio se consolidou como
                    referência em Saúde e Segurança do Trabalho. Nossa equipe,
                    especializada e eficiente, atua com cuidado e comprometimento
                    para criar espaços corporativos mais seguros, sustentáveis e
                    alinhados às Normas Regulamentadoras. Com transparência e
                    expertise, proporcionamos a confiança que sua empresa precisa
                    para elevar seus padrões de segurança e eficiência. Confie em
                    nossa experiência para alcançar resultados valiosos e
                    duradouros.
                  </p>
                  <blockquote className="border-l-4 pl-4 py-2 my-4" style={{ borderColor: '#1b7689' }}>
                    <p className="text-sm italic">
                      "Nossos serviços são investimentos, onde trazemos benefícios
                      que superam qualquer custo, pois não é sobre preço, é sobre
                      entregar resultados valiosos. Comprometemo-nos
                      integralmente a proporcionar excelência em Saúde e Segurança
                      do Trabalho, impulsionados pela nossa especialização e
                      dedicação incansável.”
                    </p>
                    <footer className="text-right text-xs font-medium mt-2">
                      Grupo Florêncio
                    </footer>
                  </blockquote>
                <div className='my-8'>
                      <div className="grid md:grid-cols-3 gap-8">
                        <div className="flex items-start gap-4">
                          <div className="mt-1" style={{ color: '#1b7689' }}>
                            <Target className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">Missão</h4>
                            <p className="text-sm leading-relaxed">
                              Nossa missão é disponibilizar serviços da Qualidade, Saúde, Meio Ambiente & Segurança do Trabalho em prol do uso adequado dos recursos naturais, aumento da produtividade e bem-estar social, superando as expectativas de nossos clientes e agregando valores para a sociedade.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="mt-1" style={{ color: '#1b7689' }}>
                            <Eye className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">Visão</h4>
                            <p className="text-sm leading-relaxed">
                              Sermos reconhecidos pela excelência dos nossos serviços, de forma a garantir qualidade, satisfação do cliente exercendo papel estratégico na execução de todos os trabalhos prestados.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="mt-1" style={{ color: '#1b7689' }}>
                            <Gem className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">Valores</h4>
                            <p className="text-sm leading-relaxed">
                              Dedicação aos nossos clientes, Honestidade, Ética, Transparência, Comprometimento Socio ambiental.
                            </p>
                          </div>
                        </div>
                      </div>
                </div>
                <h4 className="text-md font-semibold text-center mt-6">
                  Temos uma equipe especializada para oferecer as melhores
                  soluções em:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center my-6">
                  {serviceAreas.map((area, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="bg-primary/10 rounded-full p-4 mb-2" style={{ color: '#1b7689' }}>
                        <area.icon className="h-8 w-8" />
                      </div>
                      <span className="text-xs font-semibold">{area.label}</span>
                    </div>
                  ))}
                </div>
                <div className="border-b"></div>

                  <h3 className="text-lg font-semibold mt-6">
                    Objetivo
                  </h3>
                  <p className="text-sm leading-relaxed mt-4">
                    Temos por objetivo o compromisso em oferecer serviços de Saúde
                    Ocupacional e Segurança do Trabalho com excelência e em
                    conformidade com a legislação, promovendo ambientes
                    corporativos seguros, saudáveis e produtivos.
                  </p>
                  <div className="border-b my-6"></div>
                  <p className="text-sm leading-relaxed">
                    Esta Proposta Comercial está com valores compatíveis de
                    Negociação para o atendimento da Prestação de Serviços de QSMS
                    - Qualidade, Segurança, Meio Ambiente e Saúde. Gostaríamos de
                    salientar o grande interesse que temos em trabalhar em parceria
                    com a sua empresa, pois a nossa missão é oferecer serviços em
                    gestão através de uma visão estratégica buscando a satisfação
                    do cliente e melhorias para a  sociedade.
                  </p>
                  <p className="text-sm leading-relaxed mt-4">
                    Para tal, encaminhamos ao V. Sr. (a)., a presente Proposta de
                    Preços para a realização dos serviços conforme descritos, de
                    acordo com as diretrizes técnicas, para esta conceituada
                    empresa.
                  </p>
              </section>

              {/* Localização Estratégica */}
              <section className="my-8">
                  <div className="bg-muted/50 dark:bg-muted/20 p-6 rounded-lg">
                    <div className="bg-primary/20 text-center p-2 rounded-t-lg">
                      <h3 className="font-bold" style={{ color: '#1b7689' }}>
                        Nossa Localização Estratégica
                      </h3>
                    </div>
                    <div className="p-6 bg-card rounded-b-lg">
                      <p className="text-sm leading-relaxed mb-4">
                        Nossas unidades de atendimento em medicina do trabalho
                        estão estrategicamente distribuídas para estar próximas
                        tanto dos seus funcionários quanto da sua empresa,
                        facilitando o fluxo de atendimento e otimizando a
                        logística dos serviços.
                      </p>
                      <p className="text-sm leading-relaxed mb-4">
                        <span className="font-bold">Localizadas no:</span> Centro
                        do RJ, Nova Iguaçu, Duque de Caxias, Vila Kosmos – Vila da
                        Penha, Barra da Tijuca, Niterói, Macaé.
                      </p>
                      <p className="text-sm leading-relaxed mb-6">
                        Cada unidade foi planejada para proporcionar agilidade e
                        eficiência na realização de exames, consultas e demais
                        procedimentos essenciais.
                      </p>
                    </div>
                  </div>
              </section>

              {/* Corpo da Proposta */}
              <section className="my-8 space-y-6">
                 <h3 className="text-lg font-semibold mb-2 border-b pb-2">Objeto da Proposta</h3>
                <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <EditableDiv field="proposalObject" />
                </div>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Escopo do Serviço</h3>
                <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <EditableDiv field="serviceScope" />
                </div>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Da Contratante</h3>
                <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <EditableDiv field="clientResponsibilities" />
                </div>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Da Contratada</h3>
                <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <EditableDiv field="contractorResponsibilities" />
                </div>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Prazo para Realização dos Serviços</h3>
                <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <EditableDiv field="deadline" />
                </div>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Nossa Visão Estratégica</h3>
                <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <EditableDiv field="strategicVision" />
                </div>

              </section>

              {/* Investimento com Planos */}
              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                  Investimento
                </h3>
                { lead.value > 0 && (
                  <div className="prose dark:prose-invert max-w-none p-2 rounded-md">
                    <EditableDiv field="investment" />
                  </div>
                )}
                
                {proposalState.plans && proposalState.plans.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm mb-4">Abaixo seguem as opções dos Planos, de acordo com a estratégia financeira da sua empresa.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr style={{ backgroundColor: '#1b7689' }} className="text-white">
                                    <th className="p-3 text-left font-semibold">Planos</th>
                                    <th className="p-3 text-left font-semibold">Faixa de Funcionários</th>
                                    <th className="p-3 text-left font-semibold">Serviços Inclusos</th>
                                    <th className="p-3 text-left font-semibold">Investimento</th>
                                    <th className="p-3 text-center font-semibold">PG Único</th>
                                    <th className="p-3 text-center font-semibold">PG Mensal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposalState.plans.map((plan, index) => (
                                    <tr key={plan.id} className={cn("border-b", index % 2 === 0 ? "bg-blue-50" : "bg-blue-100")} style={{ borderColor: 'rgba(27, 118, 137, 0.2)' }}>
                                        <td className="p-3 align-top">{plan.name}</td>
                                        <td className="p-3 align-top">{plan.employeeRange}</td>
                                        <td className="p-3 align-top whitespace-pre-wrap">{plan.servicesIncluded}</td>
                                        <td className="p-3 align-top">{formatCurrency(plan.investment)}</td>
                                        <td className="p-3 text-center align-top">{plan.paymentType === 'unique' ? 'X' : ''}</td>
                                        <td className="p-3 text-center align-top">{plan.paymentType === 'monthly' ? 'X' : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                  </div>
                )}
                 {proposalState.exams && proposalState.exams.length > 0 && (
                  <div className="mt-8">
                    <p className="text-sm mb-4">Abaixo seguem os valores de exames complementares (se aplicável).</p>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr style={{ backgroundColor: '#1b7689' }} className="text-white">
                                    <th className="p-3 text-left font-semibold">Serviço</th>
                                    <th className="p-3 text-left font-semibold">Descrição</th>
                                    <th className="p-3 text-left font-semibold">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposalState.exams.map((exam, index) => (
                                    <tr key={exam.id} className={cn("border-b", index % 2 === 0 ? "bg-blue-50" : "bg-blue-100")} style={{ borderColor: 'rgba(27, 118, 137, 0.2)' }}>
                                        <td className="p-3 align-top">{exam.service}</td>
                                        <td className="p-3 align-top">{exam.description}</td>
                                        <td className="p-3 align-top">{formatCurrency(exam.value)}</td>
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
                      <li key={index}>
                        {pm.method.replace(/\s\(.*\)/, '')}
                      </li>
                    ))}
                  </ul>
              </section>

              <div className="border-b my-8"></div>


               {/* Termo de Aprovação */}
              <section className="my-8" style={{ breakBefore: 'page' }}>
                  <h3 className="text-lg font-semibold mb-4">
                    Termo de aprovação:
                  </h3>

                  <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(27, 118, 137, 0.1)', borderColor: 'rgba(27, 118, 137, 0.2)' }}>
                      <h4 className="font-bold text-center mb-2" style={{ color: '#1b7689' }}>Aprovação do Serviço</h4>
                      <p className="text-center text-xs">
                          Esta Proposta Técnica Comercial será APROVADA, mediante a sua devolução via e-mail, assinada e datada por pessoa responsável da CONTRATANTE.
                      </p>
                  </div>

                  <div className="mt-8 space-y-6">
                      <p>De acordo em: ______ / ______ / ______</p>
                      <p>Nome do Aprovador: ____________________________________________________</p>
                  </div>

                  <div className="mt-8 border rounded-lg p-4 space-y-4">
                      <p className='font-semibold'>Prezado cliente,</p>
                      <p>
                          Em nossa busca contínua em promover práticas de Segurança do Trabalho e Sustentabilidade, gostaríamos de propor uma parceria em nossas mídias sociais. Caso tenhamos a honra de realizar este projeto com a sua empresa, gostaríamos de saber se podemos divulgar nosso trabalho realizado nas suas instalações em nossas plataformas digitais, como Instagram, Linkedin, Site, YouTube?
                      </p>
                      <p>
                          Acreditamos que essa parceria poderá beneficiar a imagem positiva da sua empresa no compromisso com a Segurança do Trabalho e Meio Ambiente.
                      </p>
                      <div className="space-y-2 mt-4">
                          <p>(  ) sim</p>
                          <p>(  ) não</p>
                      </div>
                  </div>
              </section>


              {/* Rodapé */}
              <footer className="text-center pt-8 border-t mt-8">
                  <p className="font-bold" style={{ color: '#1b7689' }}>Grupo Florencio</p>
                  <p className="text-xs">
                    comercial@grupoflorencio.com.br | +55 (21) 96453-9493 | @grupoflorencio
                  </p>
                  <p className="text-xs">www.grupoflorencio.com.br</p>
              </footer>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 flex-wrap justify-between items-center">
            <p className="text-xs text-muted-foreground text-left mr-auto">
                {isGenerating ? 'Gerando link, aguarde...' : 'Clique em qualquer texto para editar antes de gerar o link.'}
            </p>
            <div className="flex gap-2 items-center">
                <Button variant="outline" onClick={() => handleShare('copy')} disabled={isGenerating || !firebaseApp}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copiar Link
                </Button>
                <Button variant="outline" onClick={() => handleShare('email')} disabled={isGenerating || !firebaseApp}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Email
                </Button>
                <Button onClick={() => handleShare('whatsapp')} disabled={isGenerating || !firebaseApp}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  WhatsApp
                </Button>
             <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
