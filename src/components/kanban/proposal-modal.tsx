'use client';

import { useRef, useState, useEffect } from 'react';
import type { Lead, ProposalTemplate } from '@/lib/types';
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
import { Download, Send, ClipboardCheck, Recycle, ClipboardList, SearchCheck } from 'lucide-react';
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

type ProposalModalProps = {
  lead: Lead;
  allLeads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateLead: (lead: Lead) => void;
  proposalTemplates: ProposalTemplate[];
};

export default function ProposalModal({
  lead,
  allLeads,
  isOpen,
  onOpenChange,
  onUpdateLead,
  proposalTemplates,
}: ProposalModalProps) {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [proposalBody, setProposalBody] = useState(lead.proposalSummary);
  const [fullProposalNumber, setFullProposalNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProposalBody(lead.proposalSummary);

      let currentProposalNumber = lead.proposalNumber;

      if (!currentProposalNumber) {
        // This is a simplified way to get the next number. In a real multi-user app, this should be handled by a backend.
        const highestProposalNumber = Math.max(0, ...allLeads.map(l => l.proposalNumber || 0));
        currentProposalNumber = highestProposalNumber + 1;
      }
      
      const paddedNumber = String(currentProposalNumber).padStart(3, '0');
      const version = lead.proposalVersion || 0;
      const proposalId = `PTC-FLO-SST-${paddedNumber}.${version}`;
      setFullProposalNumber(proposalId);
      
      // Update lead state if a new number was generated
      if(!lead.proposalNumber) {
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
      setProposalBody(template.content);
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
      // Temporarily set the content of the editable div for PDF generation
      const editableDiv = input.querySelector('[contenteditable]');
      if (editableDiv) {
        editableDiv.innerHTML = proposalBody.replace(/\n/g, '<br />');
      }

      onUpdateLead({
        ...lead,
        proposalGeneratedCount: (lead.proposalGeneratedCount || 0) + 1,
      });
      html2canvas(input, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
    // Idealmente, aqui você também anexaria o PDF, o que é complexo via link direto.
    // Uma alternativa é primeiro salvar o PDF e depois enviá-lo manualmente.
  };

  const serviceAreas = [
    { icon: ClipboardCheck, label: 'Saúde e Segurança do Trabalho' },
    { icon: Recycle, label: 'Meio Ambiente' },
    { icon: ClipboardList, label: 'eSocial SST' },
    { icon: SearchCheck, label: 'Auditorias e Inspeções' },
  ];

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
          <Label htmlFor="proposal-template">Selecione um Modelo de Serviço</Label>
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
            className="p-8 bg-white dark:bg-black text-black dark:text-white"
            id="proposal-content"
          >
            {/* Cabeçalho da Proposta */}
            <header className="flex justify-between items-center pb-4 border-b">
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  Grupo Florencio
                </h1>
                <p className="text-sm">Soluções em Segurança do Trabalho</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold">Proposta Comercial</h2>
                 <p className="text-sm">
                  {fullProposalNumber}
                </p>
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

             {/* Sobre Nós */}
            <section className="my-8 space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Sobre nós</h3>
                <p className="text-sm leading-relaxed">
                Somos apaixonados há mais de uma década por transformar ambientes de trabalho. O Grupo Florêncio se consolidou como referência em Saúde e Segurança do Trabalho. Nossa equipe, especializada e eficiente, atua com cuidado e comprometimento para criar espaços corporativos mais seguros, sustentáveis e alinhados às Normas Regulamentadoras. Com transparência e expertise, proporcionamos a confiança que sua empresa precisa para elevar seus padrões de segurança e eficiência. Confie em nossa experiência para alcançar resultados valiosos e duradouros.
                </p>
                <blockquote className="border-l-4 border-primary pl-4 py-2 my-4">
                    <p className="text-sm italic">"Nossos serviços são investimentos, onde trazemos benefícios que superam qualquer custo, pois não é sobre preço, é sobre entregar resultados valiosos. Comprometemo-nos integralmente a proporcionar excelência em Saúde e Segurança do Trabalho, impulsionados pela nossa especialização e dedicação incansável.”</p>
                    <footer className="text-right text-xs font-medium mt-2">Grupo Florêncio</footer>
                </blockquote>

                <h4 className="text-md font-semibold text-center text-gray-800 dark:text-gray-200">Temos uma equipe especializada para oferecer as melhores soluções em:</h4>
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
                <div className='border-b'></div>

                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Objetivo</h3>
                <p className="text-sm leading-relaxed">
                Temos por objetivo o compromisso em oferecer serviços de Saúde Ocupacional e Segurança do Trabalho com excelência e em conformidade com a legislação, promovendo ambientes corporativos seguros, saudáveis e produtivos.
                </p>
                <div className='border-b'></div>
                <p className="text-sm leading-relaxed">
                Esta Proposta Comercial está com valores compatíveis de Negociação para o atendimento da Prestação de Serviços de QSMS - Qualidade, Segurança, Meio Ambiente e Saúde. Gostaríamos de salientar o grande interesse que temos em trabalhar em parceria com a sua empresa, pois a nossa missão é oferecer serviços em gestão através de uma visão estratégica buscando a satisfação do cliente e melhorias para a sociedade.
                </p>
                 <p className="text-sm leading-relaxed">
                Para tal, encaminhamos ao V. Sr. (a)., a presente Proposta de Preços para a realização dos serviços conforme descritos, de acordo com as diretrizes técnicas, para esta conceituada empresa.
                </p>
            </section>

            {/* Corpo da Proposta */}
            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                Objeto da Proposta
              </h3>
              <div
                contentEditable
                suppressContentEditableWarning
                className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                dangerouslySetInnerHTML={{
                  __html: proposalBody.replace(/\n/g, '<br />'),
                }}
                onBlur={e => setProposalBody(e.currentTarget.innerText)}
              />
            </section>

            {/* Investimento */}
            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                Investimento
              </h3>
              <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-lg">Valor Total:</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(lead.value)}
                </p>
              </div>
            </section>

            {/* Condições de Pagamento */}
            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                Condições de Pagamento
              </h3>
              <ul className="list-disc list-inside space-y-2">
                {lead.paymentMethods.map((pm, index) => (
                  <li key={index}>
                    {pm.method}
                    {pm.method.includes('Crédito') && pm.cardFee && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {' '}
                        (taxa de {pm.cardFee}% inclusa)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Rodapé */}
            <footer className="text-center pt-8 border-t mt-8">
              <p className="font-bold">Grupo Florencio</p>
              <p className="text-xs">
                comercial@grupoflorencio.com.br | +55 (21) 96453-9493
              </p>
              <p className="text-xs">www.grupoflorencio.com.br</p>
            </footer>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 flex-wrap">
          <p className="text-xs text-muted-foreground text-left flex-1 mr-auto">
            O objeto da proposta é editável. Clique no texto para alterar.
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
