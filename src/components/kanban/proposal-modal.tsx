'use client';

import { useRef, useState, useEffect } from 'react';
import type {
  Lead,
  ProposalTemplate,
  Plan,
  ProposalState,
  ProposalData,
  ComplexityDefinition,
  PlanStructureItem,
} from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  Mail,
  Loader2,
  Copy,
  Goal,
  Eye,
  Settings,
  HardHat,
  Leaf,
  ExternalLink,
  Gem,
  FileDown,
  Save,
  Bold,
  Italic,
  Underline,
  List,
  Link as LinkIcon,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type ProposalModalProps = {
  lead: Lead;
  allLeads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateLead: (lead: Lead) => void;
  proposalTemplates: ProposalTemplate[];
  logoUrl?: string | null;
  proposalCoverUrl?: string | null;
  proposalClosingUrl?: string | null;
};

const COMMON_EMOJIS = ['✅', '❌', '⚠️', '🛡️', '🚀', '📈', '📊', '💼', '📄', '🤝', '🏢', '🏗️', '👷', '👨‍⚕️', '🩺', '💡', '🔍', '📍', '📞', '📧'];

export default function ProposalModal({
  lead,
  allLeads,
  isOpen,
  onOpenChange,
  onUpdateLead,
  proposalTemplates,
  logoUrl,
  proposalCoverUrl,
  proposalClosingUrl,
}: ProposalModalProps) {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [fullProposalNumber, setFullProposalNumber] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [proposalState, setProposalState] = useState<ProposalState>({
    proposalObject: lead.proposalSummary,
    serviceScope: 'A ser definido na proposta.',
    methodology: '',
    psychosocialTools: '',
    lgpdSecurity: '',
    clientResponsibilities: 'A ser definido na proposta.',
    contractorResponsibilities: 'A ser definido na proposta.',
    preliminaryErgonomicAnalysis: '',
    postErgonomicImplementation: '',
    deadline: 'A ser definido na proposta.',
    investment: 'A ser definido na proposta.',
    strategicVision: 'A ser definido na proposta.',
    paymentTerms: '',
    plans: [],
    exams: [],
    complexityDefinitions: [],
    planStructure: [],
  });
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleTemplateChange = (templateId: string) => {
    const actualId = templateId === 'none' ? null : templateId;
    setSelectedTemplateId(actualId);

    const template = proposalTemplates.find(t => t.id === actualId);
    
    const investmentText = lead.value > 0
        ? `
<div class="mt-4 flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
    <p class="text-lg">Valor Total do Orçamento:</p>
    <p class="text-2xl font-bold text-primary">${formatCurrency(
      lead.value
    )}</p>
</div>
        `
        : 'Valores detalhados nos planos abaixo.';

    setProposalState({
      proposalObject: template?.proposalObject || lead.proposalSummary,
      serviceScope: template?.serviceScope || 'A ser definido na proposta.',
      methodology: template?.methodology || '',
      psychosocialTools: template?.psychosocialTools || '',
      lgpdSecurity: template?.lgpdSecurity || '',
      clientResponsibilities: template?.clientResponsibilities || 'A ser definido na proposta.',
      contractorResponsibilities: template?.contractorResponsibilities || 'A ser definido na proposta.',
      preliminaryErgonomicAnalysis: template?.preliminaryErgonomicAnalysis || '',
      postErgonomicImplementation: template?.postErgonomicImplementation || '',
      deadline: template?.deadline || 'A ser definido na proposta.',
      investment: template?.investment || investmentText,
      strategicVision: template?.strategicVision || 'A ser definido na proposta.',
      paymentTerms: template?.paymentTerms || '',
      plans: template?.plans || [],
      exams: template?.exams || [],
      complexityDefinitions: template?.complexityDefinitions || [],
      planStructure: template?.planStructure || [],
    });
  };

  const handleSetDefaultTemplate = () => {
    const newTemplateId = selectedTemplateId || null;
    if (newTemplateId !== lead.selectedTemplateId) {
      onUpdateLead({ ...lead, selectedTemplateId: newTemplateId });
      toast({
        title: 'Modelo Padrão Salvo!',
        description:
          'Este modelo será carregado automaticamente para este lead no futuro.',
      });
    }
  };

  const resetState = () => {
    const defaultTemplateId = lead.selectedTemplateId || 'none';
    handleTemplateChange(defaultTemplateId);

    let currentProposalNumber = lead.proposalNumber;

    if (!currentProposalNumber) {
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

    if (!lead.proposalNumber) {
      onUpdateLead({
        ...lead,
        proposalNumber: currentProposalNumber,
      });
    }
    setIsGenerating(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, lead, allLeads, proposalTemplates]);

  const createAndShareProposalLink = async (): Promise<string | null> => {
    setIsGenerating(true);
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'A geração da proposta demorou muito. Tente novamente.'
            )
          ),
        30000
      )
    );

    try {
      const proposalGeneration = async () => {
        const proposalData: Omit<ProposalData, 'id'> = {
          lead: lead,
          proposalState: proposalState,
          fullProposalNumber: fullProposalNumber,
          createdAt: serverTimestamp(),
          logoUrl: logoUrl,
          proposalCoverUrl: proposalCoverUrl,
          proposalClosingUrl: proposalClosingUrl,
        };

        if (!firestore) {
          throw new Error('Firestore não está inicializado.');
        }

        const docRef = await addDoc(
          collection(firestore, 'proposals'),
          proposalData
        );
        const proposalUrl = `${window.location.origin}/proposal/${docRef.id}`;

        onUpdateLead({
          ...lead,
          proposalGeneratedCount: (lead.proposalGeneratedCount || 0) + 1,
        });

        toast({
          title: 'Link da Proposta Gerado!',
          description:
            'O link para a página da proposta está pronto para ser compartilhado.',
        });

        return proposalUrl;
      };

      const result = await Promise.race([proposalGeneration(), timeoutPromise]);
      return result;
    } catch (error) {
      console.error('Erro ao criar o link da proposta:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Gerar Link',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a proposta. Verifique o console.',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async (
    platform: 'whatsapp' | 'email' | 'copy' | 'open'
  ) => {
    const proposalLink = await createAndShareProposalLink();
    if (!proposalLink) return;

    if (platform === 'copy') {
      navigator.clipboard.writeText(proposalLink);
      toast({
        title: 'Sucesso',
        description: 'Link copiado para a área de transferência!',
      });
      return;
    }

    if (platform === 'open') {
      window.open(proposalLink, '_blank');
      return;
    }

    let text, url;
    if (platform === 'whatsapp') {
      onUpdateLead({
        ...lead,
        whatsappSentCount: (lead.whatsappSentCount || 0) + 1,
      });
      text = `Prezado(a) *${lead.name}*,
Parabéns pela escolha de entrar em contato com o Grupo Florencio, somos especialistas em Saúde Ocupacional Estratégica.

Nosso propósito é blindar a *${lead.company}* com uma gestão eficiente em Segurança do Trabalho, protegendo o seu negócio contra passivos trabalhistas e garantindo a conformidade legal.

Segue neste link a *Proposta Comercial nº ${fullProposalNumber}*, com diferentes opções de planos para a gestão completa da Segurança do Trabalho. Assim, você poderá escolher a alternativa que melhor se adequa à estratégia financeira da sua empresa:

🔗 ${proposalLink}

🔴 *Para abrir a proposta, clique ou copie e cole o link acima no seu navegador.*

Contamos com uma ampla rede de clínicas de Medicina do Trabalho no Rio de Janeiro, permitindo que seus colaboradores realizem os exames na unidade mais próxima da empresa ou de suas residências, oferecendo praticidade e agilidade no atendimento.

Fico à disposição para esclarecer qualquer dúvida e apoiar na definição do melhor plano para o seu negócio.

Atenciosamente,
*Grupo Florencio*`;
      url = `https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(text)}`;
    } else {
      const subject = `Proposta Comercial - Grupo Florencio para ${lead.company}`;
      const body = `Prezado(a) *${lead.name}*,

Parabéns pela escolha de entrar em contato com o Grupo Florencio, somos especialistas em Saúde Ocupacional Estratégica.

Nosso propósito é blindar a *${lead.company}* com uma gestão eficiente em Segurança do Trabalho, protegendo o seu negócio contra passivos trabalhistas e garantindo a conformidade legal.

Segue neste link a Proposta Comercial nº *${fullProposalNumber}*, com diferentes opções de planos para a gestão completa da Segurança do Trabalho. Assim, você poderá escolher a alternativa que melhor se adequa à estratégia financeira da sua empresa:

${proposalLink}

Clique ou copie o link para abrir a proposta

Contamos com uma ampla rede de clínicas de Medicina do Trabalho no Rio de Janeiro, permitindo que seus colaboradores realizem os exames na unidade mais próxima da empresa ou de suas residências, oferecendo praticidade e agilidade no atendimento.

Fico à disposição para esclarecer qualquer dúvida e apoiar na definição do melhor plano para o seu negócio.

Atenciosamente,
Grupo Florencio`;
      url = `mailto:${lead.email}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
    }
    window.open(url, '_blank');
  };
  
  const handleDownloadPdf = async () => {
    const element = document.getElementById('proposal-container');
    if (!element) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: 'Não foi possível encontrar o conteúdo da proposta para gerar o PDF.' });
        return;
    }
    
    setIsGeneratingPdf(true);

    try {
        const canvas = await html2canvas(element, { 
            scale: 2,
            useCORS: true,
            logging: false,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        
        const pdf = new jsPDF('p', 'mm', 'a4', true);
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
        
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageHeight;
        }

        pdf.save(`Proposta-${lead.company.replace(/\s+/g, '-')}-${fullProposalNumber}.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: 'Houve um problema ao processar as imagens da proposta.' });
    } finally {
        setIsGeneratingPdf(false);
    }
  };


  const serviceAreas = [
    { label: 'Saúde e Segurança do Trabalho', icon: HardHat },
    { label: 'Meio Ambiente', icon: Leaf },
    { label: 'eSocial SST', icon: Settings },
    { label: 'Auditorias e Inspeções', icon: Eye },
  ];

  const EditableDiv = ({
    field,
    className,
    path, // Para campos aninhados como plans.0.purpose
  }: {
    field: string;
    className?: string;
    path?: string;
  }) => {
    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      const content = e.currentTarget.innerHTML;
      if (path) {
          // Lógica simplificada para planos: path format like "plans.0.fieldName"
          const parts = path.split('.');
          if (parts[0] === 'plans') {
              const index = parseInt(parts[1]);
              const fieldKey = parts[2] as keyof Plan;
              setProposalState(prev => {
                  const newPlans = [...prev.plans];
                  newPlans[index] = { ...newPlans[index], [fieldKey]: content };
                  return { ...prev, plans: newPlans };
              });
          } else if (parts[0] === 'complexityDefinitions') {
              const index = parseInt(parts[1]);
              const fieldKey = parts[2] as keyof ComplexityDefinition;
              setProposalState(prev => {
                  const newDefs = [...(prev.complexityDefinitions || [])];
                  newDefs[index] = { ...newDefs[index], [fieldKey]: content };
                  return { ...prev, complexityDefinitions: newDefs };
              });
          } else if (parts[0] === 'planStructure') {
              const index = parseInt(parts[1]);
              const fieldKey = parts[2] as keyof PlanStructureItem;
              setProposalState(prev => {
                  const newStruct = [...(prev.planStructure || [])];
                  newStruct[index] = { ...newStruct[index], [fieldKey]: content };
                  return { ...prev, planStructure: newStruct };
              });
          }
      } else {
          setProposalState(prevState => ({
            ...prevState,
            [field]: content,
          }));
      }
    };

    const execCommand = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
    };

    const insertLink = () => {
        const url = window.prompt('Insira a URL:', 'https://');
        if (url) {
            execCommand('createLink', url);
            const selection = window.getSelection();
            if (selection && selection.anchorNode) {
                const parent = selection.anchorNode.parentElement;
                if (parent && parent.tagName === 'A') {
                    parent.setAttribute('style', 'color: #1b7689; text-decoration: underline; font-weight: bold;');
                    parent.setAttribute('target', '_blank');
                }
            }
        }
    };

    const insertEmoji = (emoji: string) => {
        execCommand('insertText', emoji);
    };

    const getInitialContent = () => {
        if (path) {
            const parts = path.split('.');
            if (parts[0] === 'plans') {
                const index = parseInt(parts[1]);
                const fieldKey = parts[2] as keyof Plan;
                return String(proposalState.plans[index]?.[fieldKey] || '');
            } else if (parts[0] === 'complexityDefinitions') {
                const index = parseInt(parts[1]);
                const fieldKey = parts[2] as keyof ComplexityDefinition;
                return String(proposalState.complexityDefinitions?.[index]?.[fieldKey] || '');
            } else if (parts[0] === 'planStructure') {
                const index = parseInt(parts[1]);
                const fieldKey = parts[2] as keyof PlanStructureItem;
                return String(proposalState.planStructure?.[index]?.[fieldKey] || '');
            }
        }
        return String((proposalState as any)[field] || '');
    };

    return (
      <div className="relative group">
        <div className="absolute -top-10 left-0 hidden group-focus-within:flex items-center gap-1 p-1 bg-white border rounded shadow-md z-50 flex-wrap max-w-[300px]">
            <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }}><Bold className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }}><Italic className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }}><Underline className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList'); }}><List className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); insertLink(); }}><LinkIcon className="h-4 w-4"/></Button>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => e.preventDefault()}><Smile className="h-4 w-4"/></Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" onOpenAutoFocus={e => e.preventDefault()}>
                    <div className="grid grid-cols-6 gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                            <Button key={emoji} variant="ghost" size="sm" className="h-8 w-8 p-0 text-lg" onMouseDown={(e) => { e.preventDefault(); insertEmoji(emoji); }}>
                                {emoji}
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <div
            contentEditable={!isGenerating}
            suppressContentEditableWarning
            className={cn(
            'focus:outline-none focus:ring-2 focus:ring-primary p-1 rounded-sm min-h-[1.5rem]',
            className
            )}
            onBlur={handleBlur}
            dangerouslySetInnerHTML={{
            __html: getInitialContent().replace(/\n/g, '<br />'),
            }}
        ></div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="pt-4 flex-wrap justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="font-headline">
                Gerador de Proposta
            </DialogTitle>
            <DialogDescription>
                Visualize, edite e envie a proposta para {lead.company}.
            </DialogDescription>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isGenerating}
            >
              {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Salvar como PDF
            </Button>
            <Button
              onClick={() => handleShare('open')}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Gerar e Abrir
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare('copy')}
              disabled={isGenerating}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar Link
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare('email')}
              disabled={isGenerating}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button onClick={() => handleShare('whatsapp')} disabled={isGenerating}>
              <Send className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogHeader>

        <div className="mb-4 space-y-2 px-6">
          <Label htmlFor="proposal-template">
            Selecione um Modelo de Serviço
          </Label>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                value={selectedTemplateId || 'none'}
                onValueChange={handleTemplateChange}
                disabled={isGenerating}
              >
                <SelectTrigger id="proposal-template">
                  <SelectValue placeholder="Escolha um modelo para o objeto da proposta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (usará proposta padrão)</SelectItem>
                  {proposalTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetDefaultTemplate}
              disabled={
                isGenerating ||
                (selectedTemplateId || null) === (lead.selectedTemplateId || null)
              }
            >
              <Save className="mr-2 h-4 w-4" />
              Definir como Padrão
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white rounded-md mx-6 mb-6">
          <div ref={proposalRef} className="p-0" id="proposal-container">
            {proposalCoverUrl && (
              <div
                className="a4-page"
                style={{ padding: 0, marginBottom: '1rem' }}
              >
                <img
                  src={proposalCoverUrl}
                  alt="Capa da Proposta"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div
              className="a4-page p-8 text-sm bg-white"
              style={{ color: '#596371', minHeight: '100%' }}
              id="proposal-content"
            >
              <header className="flex justify-between items-center pb-4 border-b">
                <div>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo da Empresa"
                      className="h-16 w-auto object-contain"
                    />
                  ) : (
                    <h1
                      className="text-2xl font-bold"
                      style={{ color: '#1b7689' }}
                    >
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
                    Data: {isClient ? new Date().toLocaleDateString('pt-BR') : '...'}
                  </p>
                </div>
              </header>

              <p className="text-xs italic text-center text-muted-foreground pt-2">
                Esta proposta comercial detalha o escopo e os valores dos serviços, não substituindo um contrato formal. Caso necessário, um contrato de prestação de serviços será elaborado em etapa posterior.
              </p>

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

              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2">Sobre nós</h3>
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
                <blockquote
                  className="border-l-4 pl-4 py-2 my-4"
                  style={{ borderColor: '#1b7689' }}
                >
                  <p className="text-sm italic">
                    "Nossos serviços são investimentos, onde trazemos benefícios
                    que superam qualquer custo, pois não é sobre preço, é sobre
                    entregar resultados valiosos. Comprometemo-nos
                    integralmente a proporcionar excellence em Saúde e Segurança
                    do Trabalho, impulsionados pela nossa especialização e
                    dedicação incansável.”
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
                      <Goal
                        className="h-10 w-10 mb-2"
                        style={{ color: '#1b7689' }}
                      />
                      <h4
                        className="font-bold text-lg"
                        style={{ color: '#1b7689' }}
                      >
                        Missão
                      </h4>
                      <p className="text-sm leading-relaxed mt-2 text-left">
                        Nossa missão é disponibilizar serviços da Qualidade, Saúde,
                        Meio Ambiente & Segurança do Trabalho em prol do uso
                        adequado dos recursos naturais, aumento da produtividade e
                        bem-estar social, superando as expectativas de nossos
                        clientes e agregando valores para a sociedade.
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <Eye
                        className="h-10 w-10 mb-2"
                        style={{ color: '#1b7689' }}
                      />
                      <h4
                        className="font-bold text-lg"
                        style={{ color: '#1b7689' }}
                      >
                        Visão
                      </h4>
                      <p className="text-sm leading-relaxed mt-2 text-left">
                        Sermos reconhecidos pela excelência dos nossos serviços, de
                        forma a garantir qualidade, satisfação do cliente exercendo
                        papel estratégico na execução de todos os trabalhos
                        prestados.
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <Gem
                        className="h-10 w-10 mb-2"
                        style={{ color: '#1b7689' }}
                      />
                      <h4
                        className="font-bold text-lg"
                        style={{ color: '#1b7689' }}
                      >
                        Valores
                      </h4>
                      <p className="text-sm leading-relaxed mt-2 text-left">
                        Dedicação aos nossos clientes, Honestidade, Ética,
                        Transparência, Comprometimento Socio ambiental.
                      </p>
                    </div>
                  </div>
                </div>
                <h4 className="text-md font-semibold text-center mt-6">
                  Temos uma equipe especializada para oferecer as melhores
                  soluções em:
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
              </section>

              <section className="my-8 space-y-6">
                {proposalState.proposalObject && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Objeto da Proposta
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="proposalObject" />
                        </div>
                    </>
                )}

                {proposalState.serviceScope && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Escopo do Serviço
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="serviceScope" />
                        </div>
                    </>
                )}

                {proposalState.methodology && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Metodologia
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="methodology" />
                        </div>
                    </>
                )}

                {proposalState.psychosocialTools && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Ferramentas de avaliação dos Fatores psicossociais
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="psychosocialTools" />
                        </div>
                    </>
                )}

                {proposalState.lgpdSecurity && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Segurança LGPD
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="lgpdSecurity" />
                        </div>
                    </>
                )}

                {proposalState.contractorResponsibilities && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Da Contratada
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="contractorResponsibilities" />
                        </div>
                    </>
                )}

                {proposalState.clientResponsibilities && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Da Contratante
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="clientResponsibilities" />
                        </div>
                    </>
                )}

                {proposalState.preliminaryErgonomicAnalysis && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Análise Ergonômica Preliminar
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="preliminaryErgonomicAnalysis" />
                        </div>
                    </>
                )}

                {proposalState.postErgonomicImplementation && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Roteiro pós implementação da análise Ergonômica (não inclusa nesta proposta técnica)
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="postErgonomicImplementation" />
                        </div>
                    </>
                )}

                {proposalState.complexityDefinitions && proposalState.complexityDefinitions.length > 0 && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                            São considerados Contratos de Baixa Complexidade, Média Complexidade, Alta Complexidade:
                        </h3>
                        <p className="text-sm italic mb-4">As opções de planos são de acordo com a estratégia financeira da sua empresa.</p>
                        <div className="space-y-4">
                            {proposalState.complexityDefinitions.map((def, index) => (
                                <div key={def.id} className="p-4 border rounded-lg bg-blue-50/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                        <EditableDiv field="dummy" path={`complexityDefinitions.${index}.title`} className="font-bold text-base" />
                                    </div>
                                    <EditableDiv field="dummy" path={`complexityDefinitions.${index}.description`} className="text-sm leading-relaxed" />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 italic">
                            Abaixo seguem as opções dos Planos, de acordo com a estratégia financeira da sua empresa. Investimento - Opções - Baixa Complexidade, Média Complexidade, Alta Complexidade:
                        </p>
                    </>
                )}

                {proposalState.planStructure && proposalState.planStructure.length > 0 && (
                    <div className="my-8 overflow-hidden rounded-lg border border-[#1b7689]">
                        <div className="bg-[#1b7689] p-3 text-center text-white font-bold uppercase tracking-wider">
                            ESTRUTURA DOS PLANOS
                        </div>
                        <div className="bg-[#1b7689] p-2 text-center text-white text-xs border-t border-white/20">
                            Avalie o plano que melhor se adequa a estrutura organizacional da sua empresa hoje:
                        </div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#8ec7d1] text-[#1b7689]">
                                    <th className="p-2 border-r border-[#1b7689] text-sm font-bold">PLANO</th>
                                    <th className="p-2 border-r border-[#1b7689] text-sm font-bold">PERFIL</th>
                                    <th className="p-2 text-sm font-bold">OBJETIVO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposalState.planStructure.map((item, index) => (
                                    <tr key={item.id} className="bg-[#d4e9ee] text-[#1b7689] border-t border-[#1b7689]">
                                        <td className="p-2 border-r border-[#1b7689] text-xs">
                                            <EditableDiv field="dummy" path={`planStructure.${index}.plan`} />
                                        </td>
                                        <td className="p-2 border-r border-[#1b7689] text-xs">
                                            <EditableDiv field="dummy" path={`planStructure.${index}.profile`} />
                                        </td>
                                        <td className="p-2 text-xs">
                                            <EditableDiv field="dummy" path={`planStructure.${index}.objective`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {proposalState.deadline && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Prazo para Realização dos Serviços
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="deadline" />
                        </div>
                    </>
                )}

                {proposalState.strategicVision && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Nossa Visão Estratégica
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="strategicVision" />
                        </div>
                    </>
                )}
              </section>

              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                  Investimento
                </h3>
                {lead.value > 0 && (
                  <div className="prose dark:prose-invert max-w-none p-2 rounded-md">
                    <EditableDiv field="investment" />
                  </div>
                )}

                {proposalState.plans && proposalState.plans.length > 0 && (
                  <div className="mt-4 space-y-8">
                    {proposalState.plans.map((plan, index) => (
                      <div key={plan.id} className="border rounded-lg overflow-hidden shadow-sm">
                        <div className="p-3 text-white font-bold flex justify-between items-center" style={{ backgroundColor: '#1b7689' }}>
                          <span>{plan.name}</span>
                          <span className="text-xs uppercase opacity-90">
                            Modelo: {
                                plan.paymentType === 'unique' ? 'Único' : 
                                plan.paymentType === 'monthly' ? 'Mensal' : 
                                'Por Contrato ativo, mensal.'
                            }
                          </span>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/20">
                          <div className="space-y-3">
                            {plan.purpose && <div><p className="text-[10px] font-bold text-primary uppercase tracking-wider">Finalidade</p><EditableDiv field="dummy" path={`plans.${index}.purpose`} className="text-sm leading-tight bg-white/50" /></div>}
                            {plan.differentiator && <div><p className="text-[10px] font-bold text-primary uppercase tracking-wider">Diferencial</p><EditableDiv field="dummy" path={`plans.${index}.differentiator`} className="text-sm leading-relaxed bg-white/50" /></div>}
                            {plan.focus && <div><p className="text-[10px] font-bold text-primary uppercase tracking-wider">Foco</p><p className="text-sm">{plan.focus}</p></div>}
                            {plan.employeeRange && <div><p className="text-[10px] font-bold text-primary uppercase tracking-wider">Faixa de Funcionários</p><p className="text-sm">{plan.employeeRange}</p></div>}
                          </div>
                          <div className="space-y-3">
                            {plan.servicesIncluded && (
                                <>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Serviços Inclusos</p>
                                    <EditableDiv field="dummy" path={`plans.${index}.servicesIncluded`} className="text-sm leading-relaxed bg-white/50" />
                                </>
                            )}
                            {plan.auditSupport && (
                                <>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Suporte em auditorias e fiscalizações</p>
                                    <EditableDiv field="dummy" path={`plans.${index}.auditSupport`} className="text-sm leading-relaxed bg-white/50" />
                                </>
                            )}
                            {plan.strategicManagement && (
                                <>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Gestão Estratégica</p>
                                    <EditableDiv field="dummy" path={`plans.${index}.strategicManagement`} className="text-sm leading-relaxed bg-white/50" />
                                </>
                            )}
                            {plan.specificManagement && (
                                <>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Gestão específica por contrato</p>
                                    <EditableDiv field="dummy" path={`plans.${index}.specificManagement`} className="text-sm leading-relaxed bg-white/50" />
                                </>
                            )}
                          </div>
                        </div>
                        
                        {plan.investments && plan.investments.length > 0 && (
                            <div className="p-4 bg-white border-t border-dashed">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Composição do Investimento</p>
                                <div className="space-y-1">
                                    {plan.investments.map((inv, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                                            <span>{inv.label}</span>
                                            <span className="font-semibold">{formatCurrency(inv.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {plan.extraServices && plan.extraServices.length > 0 && (
                          <div className="p-4 border-t border-dashed bg-white">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Serviços Adicionais</p>
                            <div className="grid grid-cols-1 gap-1">
                              {plan.extraServices.map((es, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-0">
                                  <span>{es.name}</span>
                                  <span className="font-semibold">{formatCurrency(es.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="p-4 bg-primary/5 border-t flex justify-between items-center">
                          <span className="font-bold text-sm">Investimento Total do Plano:</span>
                          <span className="text-xl font-bold text-primary">
                            {formatCurrency(
                                plan.investments && plan.investments.length > 0 
                                ? plan.investments.reduce((sum, inv) => sum + inv.value, 0)
                                : (plan.investment || 0)
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {proposalState.exams && proposalState.exams.length > 0 && (
                  <div className="mt-8">
                    <p className="text-sm mb-4 font-semibold">
                      Investimentos Adicionais - Exames/Serviços Avulsos (Gerais)
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
                          {proposalState.exams.map((exam, index) => (
                            <tr
                              key={exam.id}
                              className={cn(
                                'border-b',
                                index % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100'
                              )}
                              style={{
                                borderColor: 'rgba(27, 118, 137, 0.2)',
                              }}
                            >
                              <td className="p-3 align-top">{exam.service}</td>
                              <td className="p-3 align-top">
                                {exam.description}
                              </td>
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

              {proposalState.paymentTerms && (
                 <section className="my-8">
                    <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Condições de Pagamento Adicionais
                    </h3>
                    <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="paymentTerms" />
                    </div>
                </section>
              )}

              <div className="border-b my-8"></div>

              <section className="my-8" style={{ breakBefore: 'page' }}>
                <h3 className="text-lg font-semibold mb-4">
                  Termo de aprovação:
                </h3>

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
                    devolução via e-mail, assinada e datada por pessoa
                    responsável da CONTRATANTE.
                  </p>
                </div>

                <div className="mt-8 space-y-6">
                  <p>De acordo em: ______ / ______ / ______</p>
                  <p>
                    Nome do Aprovador:
                    ____________________________________________________
                  </p>
                </div>

                <div className="mt-8 border rounded-lg p-4 space-y-4">
                  <p className="font-semibold">Prezado cliente,</p>
                  <p>
                    Em nossa busca contínua em promover práticas de Segurança do
                    Trabalho e Sustentabilidade, gostaríamos de propor uma
                    parceria em nossas mídias sociais. Caso tenhamos a honra de
                    realizar este projeto com a sua empresa, gostaríamos de saber
                    se podemos divulgar nosso trabalho realizado nas suas
                    instalações em nossas plataformas digitais, como Instagram,
                    Linkedin, Site, YouTube?
                  </p>
                  <p>
                    Acreditamos que essa parceria poderá beneficiar a imagem
                    positiva da sua empresa no compromisso com a Segurança do
                    Trabalho e Meio Ambiente.
                  </p>
                  <div className="space-y-2 mt-4">
                    <p>( ) sim</p>
                    <p>( ) não</p>
                  </div>
                </div>
              </section>

              <footer className="text-center pt-8 border-t mt-8">
                <p className="font-bold" style={{ color: '#1b7689' }}>
                  Grupo Florencio
                </p>
                <p className="text-xs">
                  comercial@grupoflorencio.com.br | +55 (21) 96453-9493 |
                  @grupoflorencio
                </p>
                <p className="text-xs">www.grupoflorencio.com.br</p>
              </footer>
            </div>
            {proposalClosingUrl && (
              <div
                className="a4-page"
                style={{ padding: 0, marginTop: '1rem' }}
              >
                <img
                  src={proposalClosingUrl}
                  alt="Página de Encerramento da Proposta"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
