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

type ProposalModalProps = {
  lead: Lead;
  allLeads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateLead: (lead: Lead) => void;
  proposalTemplates: ProposalTemplate[];
};

type ProposalState = Omit<ProposalTemplate, 'id' | 'name'>

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
  
  const [proposalState, setProposalState] = useState<ProposalState>({
      proposalObject: lead.proposalSummary,
      serviceScope: 'A ser definido na proposta.',
      clientResponsibilities: 'A ser definido na proposta.',
      contractorResponsibilities: 'A ser definido na proposta.',
      deadline: 'A ser definido na proposta.',
      investment: 'A ser definido na proposta.',
      strategicVision: 'A ser definido na proposta.',
      plans: [],
  });

  useEffect(() => {
    if (isOpen) {
      // Set initial state from lead/defaults when modal opens
      setProposalState({
        proposalObject: lead.proposalSummary,
        serviceScope: 'A ser definido na proposta.',
        clientResponsibilities: 'A ser definido na proposta.',
        contractorResponsibilities: 'A ser definido na proposta.',
        deadline: 'A ser definido na proposta.',
        investment: 'A ser definido na proposta.',
        strategicVision: 'A ser definido na proposta.',
        plans: [],
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
    }
  }, [isOpen, lead, allLeads, onUpdateLead]);

  const handleTemplateChange = (templateId: string) => {
    const template = proposalTemplates.find(t => t.id === templateId);
    if (template) {
      setProposalState({
          proposalObject: template.proposalObject,
          serviceScope: template.serviceScope,
          clientResponsibilities: template.clientResponsibilities,
          contractorResponsibilities: template.contractorResponsibilities,
          deadline: template.deadline,
          investment: template.investment,
          strategicVision: template.strategicVision,
          plans: template.plans || [],
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const handleDownloadPdf = () => {
    const input = proposalRef.current;
    if (input) {
      const editableDivs = Array.from(input.querySelectorAll('[contenteditable]'));

      // Ensure PDF captures the latest state by updating the innerHTML from the state
      editableDivs.forEach(div => {
        const field = div.getAttribute('data-field') as keyof ProposalState | null;
        if(field && typeof proposalState[field] === 'string') {
          div.innerHTML = (proposalState[field as keyof Omit<ProposalState, 'plans'>] as string).replace(/\n/g, '<br />');
        }
      });
      
      onUpdateLead({
        ...lead,
        proposalGeneratedCount: (lead.proposalGeneratedCount || 0) + 1,
      });

      html2canvas(input, { scale: 3 }).then(canvas => {
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

        pdf.save(
          `proposta-${lead.company.toLowerCase().replace(/ /g, '-')}.pdf`
        );
      });
    }
  };

  const handleSendWhatsApp = () => {
    onUpdateLead({
      ...lead,
      whatsappSentCount: (lead.whatsappSentCount || 0) + 1,
    });
    const message = `Olá ${lead.name}, segue a proposta para a empresa ${lead.company}. Estamos à disposição para qualquer esclarecimento.`;
    const whatsappUrl = `https://wa.me/${
      lead.whatsapp
    }?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
  }: {
    field: keyof Omit<ProposalState, 'plans'>;
    className?: string;
  }) => {
    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      setProposalState(prevState => ({
        ...prevState,
        [field]: e.currentTarget.innerHTML,
      }));
    };
  
    const content = proposalState[field] || '';
  
    return (
      <div
        contentEditable
        suppressContentEditableWarning
        data-field={field}
        className={cn('focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm', className)}
        onBlur={handleBlur}
        dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }}
      />
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
          <Select onValueChange={handleTemplateChange}>
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

        <ScrollArea className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-md">
          <div
            ref={proposalRef}
            className="p-0 bg-white text-[hsl(var(--proposal-text-secondary))]"
            id="proposal-container"
            style={{ color: '#1b7689' }}
          >
            <div className="a4-page p-8" id="proposal-content">
              {/* Cabeçalho da Proposta */}
              <header className="flex justify-between items-center pb-4 border-b">
                <div>
                  <h1 className="text-2xl font-bold text-primary">
                    Grupo Florencio
                  </h1>
                  <p className="text-sm">Saúde Ocupacional Estratégica</p>
                  <p className="text-xs">CNPJ: 35.041.385/0001-10</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-semibold" style={{ color: '#596371' }}>Proposta Comercial</h2>
                  <p className="text-sm">{fullProposalNumber}</p>
                  <p className="text-sm">
                    Data: {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </header>

              {/* Informações do Cliente */}
              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Para:
                </h3>
                <div contentEditable suppressContentEditableWarning className="focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm">
                  <p className="font-bold">{lead.company}</p>
                  <p>
                    A/C: {lead.name}
                    {lead.role && `, ${lead.role}`}
                  </p>
                  <p>CNPJ: {lead.cnpj}</p>
                  <p>Email: {lead.email}</p>
                  <p>WhatsApp: {lead.whatsapp}</p>
                </div>
              </section>

              {/* Sobre Nós */}
              <section className="my-8 space-y-6">
                <div contentEditable suppressContentEditableWarning className="focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm">
                  <h3 className="text-lg font-semibold" style={{ color: '#596371' }}>
                    Sobre nós
                  </h3>
                  <p className="text-sm leading-relaxed">
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
                  <blockquote className="border-l-4 border-primary pl-4 py-2 my-4">
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
                </div>

                <h4 className="text-md font-semibold text-center" style={{ color: '#596371' }}>
                  Temos uma equipe especializada para oferecer as melhores
                  soluções em:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center my-6">
                  {serviceAreas.map((area, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="bg-primary/10 text-primary rounded-full p-4 mb-2">
                        <area.icon className="h-8 w-8" />
                      </div>
                      <span className="text-xs font-semibold">{area.label}</span>
                    </div>
                  ))}
                </div>
                <div className="border-b"></div>

                <div contentEditable suppressContentEditableWarning className="focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm">
                  <h3 className="text-lg font-semibold" style={{ color: '#596371' }}>
                    Objetivo
                  </h3>
                  <p className="text-sm leading-relaxed">
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
                </div>
              </section>

              {/* Localização Estratégica */}
              <section className="my-8">
                <div contentEditable suppressContentEditableWarning className="focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm">
                  <div className="bg-muted/50 dark:bg-muted/20 p-6 rounded-lg">
                    <div className="bg-primary/20 text-center p-2 rounded-t-lg">
                      <h3 className="font-bold text-primary">
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
                </div>
              </section>

              {/* Corpo da Proposta */}
              <section className="my-8 space-y-6">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Objeto da Proposta
                </h3>
                <EditableDiv field="proposalObject" className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md"/>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Escopo do Serviço
                </h3>
                <EditableDiv field="serviceScope" className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md"/>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Da Contratante
                </h3>
                <EditableDiv field="clientResponsibilities" className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md"/>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Da Contratada
                </h3>
                <EditableDiv field="contractorResponsibilities" className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md"/>
                
                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Prazo para Realização dos Serviços
                </h3>
                <EditableDiv field="deadline" className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md"/>

                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Nossa Visão Estratégica
                </h3>
                <EditableDiv field="strategicVision" className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md"/>

              </section>

              {/* Investimento com Planos */}
              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Investimento
                </h3>
                <EditableDiv field="investment" className="prose dark:prose-invert max-w-none p-2 rounded-md"/>
                
                {proposalState.plans && proposalState.plans.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                          <thead>
                              <tr className="bg-primary/90 text-primary-foreground">
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
                                  <tr key={plan.id} className={cn("border-b border-primary/20", index % 2 === 0 ? "bg-primary/5" : "bg-primary/10")}>
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
                )}
                 
                 {lead.value > 0 && (
                    <div className="mt-4 flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                      <p className="text-lg">Valor Total do Orçamento:</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(lead.value)}
                      </p>
                    </div>
                  )}
              </section>

              {/* Condições de Pagamento */}
              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2" style={{ color: '#596371' }}>
                  Condições de Pagamento
                </h3>
                <div contentEditable suppressContentEditableWarning className="focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm">
                  <ul className="list-disc list-inside space-y-2">
                    {lead.paymentMethods.map((pm, index) => (
                      <li key={index}>
                        {pm.method}
                        {pm.method.includes('Crédito') && pm.cardFee && (
                          <span className="text-sm opacity-80">
                            {' '}
                            (taxa de {pm.cardFee}% inclusa)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <div className="border-b my-8" />

              {/* Missão, Visão, Valores */}
              <section className="my-8">
                <div contentEditable suppressContentEditableWarning className="focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="flex items-start gap-4">
                      <div className="text-primary mt-1">
                        <Target className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg" style={{ color: '#596371' }}>Missão</h4>
                        <p className="text-sm leading-relaxed">
                          Nossa missão é disponibilizar serviços da Qualidade, Saúde, Meio Ambiente & Segurança do Trabalho em prol do uso adequado dos recursos naturais, aumento da produtividade e bem-estar social, superando as expectativas de nossos clientes e agregando valores para a sociedade.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="text-primary mt-1">
                        <Eye className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg" style={{ color: '#596371' }}>Visão</h4>
                        <p className="text-sm leading-relaxed">
                          Sermos reconhecidos pela excelência dos nossos serviços, de forma a garantir qualidade, satisfação do cliente exercendo papel estratégico na execução de todos os trabalhos prestados.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="text-primary mt-1">
                        <Gem className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg" style={{ color: '#596371' }}>Valores</h4>
                        <p className="text-sm leading-relaxed">
                          Dedicação aos nossos clientes, Honestidade, Ética, Transparência, Comprometimento Socio ambiental.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Rodapé */}
              <footer className="text-center pt-8 border-t mt-8">
                <div contentEditable suppressContentEditableWarning className="focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm">
                  <p className="font-bold">Grupo Florencio</p>
                  <p className="text-xs">
                    comercial@grupoflorencio.com.br | +55 (21) 96453-9493
                  </p>
                  <p className="text-xs">www.grupoflorencio.com.br</p>
                </div>
              </footer>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 flex-wrap">
          <p className="text-xs text-muted-foreground text-left flex-1 mr-auto">
            Clique em qualquer texto para editar antes de gerar o PDF.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button onClick={handleSendWhatsApp}>
              <Send className="mr-2 h-4 w-4" />
              Enviar via WhatsApp
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
