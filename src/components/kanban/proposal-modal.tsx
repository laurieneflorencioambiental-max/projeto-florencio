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
      const editableDivs = input.querySelectorAll('[contenteditable]');

      const originalContents: { element: Element; content: string }[] = [];

      // Since we are now using onBlur to update state for multiple editable elements,
      // we need to make sure the PDF captures the latest state, not what's on the DOM from innerHTML.
      // This is a bit of a workaround because html2canvas reads the DOM.
      // The best way would be to manage state for all editable fields, but for a quick fix, let's just make sure the object is up-to-date.
      const objectContainer = input.querySelector('#object-container');
      if (objectContainer) {
        objectContainer.innerHTML = proposalBody.replace(/\n/g, '<br />');
      }

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
    // Idealmente, aqui você também anexaria o PDF, o que é complexo via link direto.
    // Uma alternativa é primeiro salvar o PDF e depois enviá-lo manualmente.
  };

  const serviceAreas = [
    { icon: ClipboardCheck, label: 'Saúde e Segurança do Trabalho' },
    { icon: Recycle, label: 'Meio Ambiente' },
    { icon: ClipboardList, label: 'eSocial SST' },
    { icon: SearchCheck, label: 'Auditorias e Inspeções' },
  ];

  const EditableDiv = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      contentEditable
      suppressContentEditableWarning
      className={cn(
        'focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm',
        className
      )}
    >
      {children}
    </div>
  );

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
            className="p-0 bg-white dark:bg-black text-black dark:text-white"
            id="proposal-container"
          >
            {/* Cover Page */}
            <div
              className="a4-page relative flex flex-col justify-between overflow-hidden bg-gray-100"
              style={{
                '--color-florencio-blue': '#408E92',
                '--color-florencio-green': '#A6CE39',
              }}
            >
              {/* Abstract Shapes */}
              <div className="absolute top-0 left-0 w-full h-full">
                <svg
                  width="595"
                  height="842"
                  viewBox="0 0 595 842"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute top-0 left-0 w-full h-full"
                >
                  <path
                    d="M-11.751 223.701C-11.751 161.477 22.8942 98.7107 72.8258 66.5298C122.757 34.3489 184.288 38.6475 229.479 77.0142C274.67 115.381 296.34 179.919 285.83 241.04C275.32 302.161 234.352 352.029 178.694 374.321C123.037 396.613 60.1065 388.243 -11.751 354.341V223.701Z"
                    fill="#A6CE39"
                    fillOpacity="0.8"
                  />
                  <path
                    d="M-13 478.026C-13 410.051 28.5204 336.852 90.1165 304.537C151.713 272.222 230.134 285.836 284.14 339.734C338.146 393.633 359.882 477.585 342.366 548.814C324.85 620.043 270.613 670.364 200.742 682.493C130.87 694.622 55.4851 665.626 -13 607.39V478.026Z"
                    fill="#408E92"
                    fillOpacity="0.5"
                  />
                </svg>
              </div>

              {/* Logo */}
              <div className="absolute top-8 right-8 flex flex-col items-end">
                <div className="flex items-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 54 55"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21.5791 54.5122C19.982 54.5122 18.6641 53.2099 18.6641 51.632V36.3159C18.6641 34.7379 19.982 33.4357 21.5791 33.4357H32.4209C34.018 33.4357 35.3359 34.7379 35.3359 36.3159V51.632C35.3359 53.2099 34.018 54.5122 32.4209 54.5122H21.5791Z"
                      fill="#408E92"
                    />
                    <path
                      d="M32.4209 23.364C34.018 23.364 35.3359 22.0617 35.3359 20.4838V5.16723C35.3359 3.58925 34.018 2.28702 32.4209 2.28702H21.5791C19.982 2.28702 18.6641 3.58925 18.6641 5.16723V20.4838C18.6641 22.0617 19.982 23.364 21.5791 23.364H32.4209Z"
                      fill="#408E92"
                    />
                    <path
                      d="M48.2725 15.1118C50.6973 12.7118 53.7915 11.4551 53.7915 8.01602C53.7915 5.86406 52.0525 4.14668 49.8733 4.14668C47.2755 4.14668 45.4705 5.56826 43.8396 7.17515C41.381 9.60424 38.253 10.8901 38.253 14.3629C38.253 16.5149 39.992 18.2323 42.1712 18.2323C44.769 18.2323 46.574 16.8107 48.2725 15.1118Z"
                      fill="#A6CE39"
                    />
                    <path
                      d="M15.7471 18.2323C17.9263 18.2323 19.6653 16.5149 19.6653 14.3629C19.6653 10.8901 16.5373 9.60424 14.0787 7.17515C12.4478 5.56826 10.6428 4.14668 8.04501 4.14668C5.86582 4.14668 4.12683 5.86406 4.12683 8.01602C4.12683 11.4551 7.22102 12.7118 9.64583 15.1118C11.3443 16.8107 13.1493 18.2323 15.7471 18.2323Z"
                      fill="#408E92"
                    />
                    <path
                      d="M10.8281 29.5891C10.8281 26.15 13.9223 24.8933 16.3471 27.2933C18.0456 28.9922 19.8506 30.4138 22.4484 30.4138C24.6276 30.4138 26.3666 28.6964 26.3666 26.5444C26.3666 23.0716 23.2386 21.7858 20.78 19.3567C18.3214 16.9276 15.1934 15.6418 15.1934 12.169C15.1934 10.0169 16.9324 8.29956 19.1116 8.29956C21.7094 8.29956 23.5144 9.72113 25.1453 11.328C27.6039 13.7571 30.7319 15.0429 30.7319 18.5157C30.7319 20.6677 28.9929 22.3851 26.8137 22.3851C24.2159 22.3851 22.4109 20.9635 20.7124 19.2646C19.2155 17.7846 17.7265 16.5149 15.7471 16.5149C14.4796 16.5149 13.4756 17.1593 12.7271 17.887C11.9706 18.6225 11.4896 19.5379 11.4896 20.4838C11.4896 21.8444 12.2806 22.9515 13.6706 24.3246C16.3159 26.9407 19.3441 28.2918 19.3441 31.7979C19.3441 33.95 17.6051 35.6673 15.4259 35.6673C12.8281 35.6673 11.0231 34.2458 9.39223 32.6389C6.93364 30.2098 3.80566 28.9239 3.80566 25.4511C3.80566 23.2992 5.54465 21.5818 7.72384 21.5818C10.3216 21.5818 12.1266 23.0034 13.8251 24.7023C14.8211 25.6898 15.7136 26.5444 16.7096 26.5444C17.4146 26.5444 17.9971 26.1836 18.4781 25.7071C18.9591 25.2307 19.2156 24.6225 19.2156 24.0143C19.2156 22.9725 18.6641 22.1836 17.6366 21.1629C15.0226 18.5759 12.1266 17.2248 12.1266 13.8856C12.1266 11.7336 13.8656 10.0163 16.0448 10.0163C18.6426 10.0163 20.4476 11.4379 22.0785 13.0447C23.7173 14.6593 25.5561 16.0886 28.1876 16.0886C29.4136 16.0886 30.4176 15.4442 31.1416 14.7336C31.9061 13.9823 32.3871 13.0668 32.3871 12.131C32.3871 10.7704 31.5961 9.66326 30.2061 8.29015C27.5608 5.67406 24.5326 4.32298 24.5326 0.816895C24.5326 -0.543719 25.5366 -1.33268 26.9266 -1.33268C28.5236 -1.33268 29.8416 -0.0147926 30.9571 1.09223C33.1701 3.29223 35.8491 4.54668 38.9771 4.54668C41.2238 4.54668 42.6653 3.69223 43.7471 2.629C45.3441 1.08447 47.1829 -0.370753 49.8733 -0.370753C53.3083 -0.370753 55.5473 1.83702 55.5473 4.87113C55.5473 8.33616 52.4193 9.62202 49.9607 12.0511C47.5021 14.4802 44.3741 15.7661 44.3741 19.2389C44.3741 21.3908 42.6351 23.1082 40.4559 23.1082C37.8581 23.1082 36.0531 21.6866 34.4223 20.0797C31.9637 17.6506 28.8357 16.3648 28.8357 12.892C28.8357 10.74 30.5747 9.02268 32.7539 9.02268C35.3517 9.02268 37.1567 10.4442 38.7876 12.0511C40.4263 13.6657 42.2651 15.095 44.8966 15.095C46.1641 15.095 47.1681 14.4506 47.9166 13.7229C48.6731 12.9874 49.1541 12.072 49.1541 11.1161C49.1541 9.75549 48.3631 8.64844 46.9731 7.27533C44.3278 4.65925 41.2996 3.30816 41.2996 -0.2C41.2996 -2.35195 39.5606 -4.06934 37.3814 -4.06934C34.7836 -4.06934 32.9786 -2.64777 31.3478 -1.04088C28.8892 1.38821 25.7612 2.67406 25.7612 6.14688C25.7612 8.30662 24.0222 10.024 21.843 10.024C19.2452 10.024 17.4402 8.6024 15.8093 7.00336C14.1706 5.38879 12.3318 3.95956 9.69251 3.95956C8.36082 3.95956 7.35682 4.60399 6.63282 5.3147C5.86832 6.06602 5.38733 6.98145 5.38733 7.93733C5.38733 9.29795 6.17832 10.405 7.56832 11.7781C10.2136 14.3942 13.2418 15.7453 13.2418 19.2492C13.2418 21.4012 11.5028 23.1185 9.32364 23.1185C6.72582 23.1185 4.92082 21.6969 3.28999 20.0823C1.65133 18.4678 -0.187499 17.0385 -2.82683 17.0385C-4.09434 17.0385 -5.09832 17.683 -5.82233 18.3937C-6.58683 19.145 -7.06783 20.0604 -7.06783 21.0163C-7.06783 22.377 -6.27683 23.484 -4.88683 24.8571C-2.2415 27.4732 0.786683 28.8243 0.786683 32.3281C0.786683 34.4801 2.52566 36.1975 4.70484 36.1975C7.30266 36.1975 9.10766 34.7759 10.7385 33.169C13.1971 30.74 16.3251 29.4541 16.3251 25.9813C16.3251 23.8293 14.5861 22.112 12.4069 22.112C9.80915 22.112 7.99615 23.5336 6.36532 25.1404C4.72665 26.755 2.88783 28.1843 0.248496 28.1843C-1.01901 28.1843 -2.023 28.8287 -2.74701 29.5394C-3.5115 30.2908 -3.9925 31.2062 -3.9925 32.162C-3.9925 33.5227 -3.2015 34.6297 -1.8115 36.0028C0.833836 38.6189 3.86201 39.97 3.86201 43.4739C3.86201 45.6258 5.601 47.3432 7.78017 47.3432C10.378 47.3432 12.183 45.9216 13.8138 44.3147C16.2724 41.8856 19.3926 40.6 19.3926 37.1272C19.3926 34.9752 17.6536 33.2578 15.4744 33.2578C12.8766 33.2578 11.0716 34.6794 9.44082 36.2863C7.79434 37.9008 5.95551 39.3301 3.31618 39.3301C2.04868 39.3301 1.04468 39.9745 0.320677 40.6852C-0.443822 41.4366 -0.924823 42.352 -0.924823 43.3079C-0.924823 44.6685 0.145677 45.7755 1.53568 47.1486C4.181 49.7647 7.20915 51.1158 7.20915 54.6197C7.20915 56.7716 8.94815 58.489 11.1273 58.489C13.7252 58.489 15.5302 57.0674 17.161 55.4605C19.6196 53.0314 22.7476 51.7456 22.7476 48.2728C22.7476 46.1208 21.0086 44.4034 18.8294 44.4034C16.2316 44.4034 14.4266 45.825 12.7958 47.4319C10.8281 49.3814 10.8281 29.5891 10.8281 29.5891Z"
                      fill="#408E92"
                    />
                  </svg>
                  <span className="text-3xl font-bold text-[#408E92]">FLORENCIO</span>
                </div>
                <p className="text-xs text-[#408E92] tracking-wider">
                  SAÚDE OCUPACIONAL ESTRATÉGICA
                </p>
              </div>

              {/* Content */}
              <div className="relative z-10 p-8 flex flex-col justify-center items-start h-full">
                <div className="w-1/2">
                  <Image
                    src="https://picsum.photos/seed/worker/400/600"
                    alt="Engenheiro de segurança do trabalho"
                    width={400}
                    height={600}
                    data-ai-hint="worker safety helmet"
                    className="absolute bottom-0 left-0 w-1/3 object-cover object-bottom"
                  />
                </div>
                <div className="w-1/2 ml-auto text-[#408E92]">
                  <div className="border-l-2 border-[#408E92] pl-4">
                    <h1 className="text-3xl font-bold">PROPOSTA</h1>
                    <h1 className="text-3xl font-bold">COMERCIAL</h1>
                    <p className="text-sm mt-2">
                      Engenharia de Segurança do Trabalho
                    </p>
                    <p className="text-sm">Saúde e Segurança Ocupacional</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="a4-page p-8" id="proposal-content">
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
                <EditableDiv>
                  <p className="font-bold">{lead.company}</p>
                  <p>
                    A/C: {lead.name}
                    {lead.role && `, ${lead.role}`}
                  </p>
                  <p>CNPJ: {lead.cnpj}</p>
                  <p>Email: {lead.email}</p>
                  <p>WhatsApp: {lead.whatsapp}</p>
                </EditableDiv>
              </section>

              {/* Sobre Nós */}
              <section className="my-8 space-y-6">
                <EditableDiv>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
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
                </EditableDiv>

                <h4 className="text-md font-semibold text-center text-gray-800 dark:text-gray-200">
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

                <EditableDiv>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6">
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
                    do cliente e melhorias para a sociedade.
                  </p>
                  <p className="text-sm leading-relaxed mt-4">
                    Para tal, encaminhamos ao V. Sr. (a)., a presente Proposta de
                    Preços para a realização dos serviços conforme descritos, de
                    acordo com as diretrizes técnicas, para esta conceituada
                    empresa.
                  </p>
                </EditableDiv>
              </section>

              {/* Localização Estratégica */}
              <section className="my-8">
                <EditableDiv>
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
                </EditableDiv>
              </section>

              {/* Corpo da Proposta */}
              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                  Objeto da Proposta
                </h3>
                <div
                  id="object-container"
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
                <EditableDiv>
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
                </EditableDiv>
              </section>

              <div className="border-b my-8" />

              {/* Missão, Visão, Valores */}
              <section className="my-8">
                <EditableDiv>
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="flex items-start gap-4">
                      <div className="text-primary mt-1">
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
                      <div className="text-primary mt-1">
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
                      <div className="text-primary mt-1">
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
                </EditableDiv>
              </section>

              {/* Rodapé */}
              <footer className="text-center pt-8 border-t mt-8">
                <EditableDiv>
                  <p className="font-bold">Grupo Florencio</p>
                  <p className="text-xs">
                    comercial@grupoflorencio.com.br | +55 (21) 96453-9493
                  </p>
                  <p className="text-xs">www.grupoflorencio.com.br</p>
                </EditableDiv>
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
