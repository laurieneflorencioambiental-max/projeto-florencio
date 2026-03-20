'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type {
  Lead,
  ProposalTemplate,
  Plan,
  ProposalState,
  ProposalData,
  ComplexityDefinition,
  PlanStructureItem,
  InvestmentOption,
  InvestmentOptionItem,
  DiverseServiceItem,
  ProposalArea,
  AppSettings,
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
  Smile,
  ShieldCheck,
  X,
  Table as TableIcon
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
import { useFirestore, errorEmitter, FirestorePermissionError, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  proposalLocationUrl?: string | null;
  proposalClosingUrl?: string | null;
  proposalAreas: ProposalArea[];
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
  proposalLocationUrl,
  proposalClosingUrl,
  proposalAreas,
}: ProposalModalProps) {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [fullProposalNumber, setFullProposalNumber] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);

  const [currentLink, setCurrentLink] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedAreaAcronym, setSelectedAreaAcronym] = useState<string>(lead.proposalArea || 'SST');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'app-settings', 'global') : null, [firestore]);
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

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
    investment: '',
    strategicVision: 'A ser definido na proposta.',
    paymentTerms: '',
    plans: [],
    exams: [],
    complexityDefinitions: [],
    planStructure: [],
    investmentOptions: [],
    diverseServices: [],
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
      investment: template?.investment || '',
      strategicVision: template?.strategicVision || 'A ser definido na proposta.',
      paymentTerms: template?.paymentTerms || '',
      plans: template?.plans || [],
      exams: template?.exams || [],
      complexityDefinitions: template?.complexityDefinitions || [],
      planStructure: template?.planStructure || [],
      investmentOptions: template?.investmentOptions || [],
      diverseServices: template?.diverseServices || [],
    });
    
    setIsDirty(true);
    setCurrentLink(null);
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

  const currentAreaInfo = useMemo(() => {
    const acronym = (lead.proposalAreaAcronym || lead.proposalArea || selectedAreaAcronym).toUpperCase();
    const area = proposalAreas.find(a => a.acronym === acronym);
    if (area) return area;
    
    // Fallback para mapeamento fixo legados
    if (acronym === 'MA') return { acronym: 'MA', serviceCode: '002' };
    return { acronym: 'SST', serviceCode: '001' };
  }, [proposalAreas, lead.proposalArea, lead.proposalAreaAcronym, selectedAreaAcronym]);

  useEffect(() => {
    if (!isOpen) return;

    const acronym = currentAreaInfo.acronym;
    const serviceCode = currentAreaInfo.serviceCode;
    
    let num = lead.proposalNumber;
    
    if (!num) {
        const areaLeads = allLeads.filter(l => (l.proposalAreaAcronym || l.proposalArea || 'SST').toUpperCase() === acronym);
        const maxNum = Math.max(0, ...areaLeads.map(l => l.proposalNumber || 0));
        num = maxNum + 1;
    }

    const paddedNumber = String(num).padStart(3, '0');
    let displayVersion = lead.proposalVersion ?? 0;
    if (lead.proposalNumber && isDirty) {
        displayVersion = (lead.proposalVersion ?? 0) + 1;
    }
    
    const proposalId = `PTC-FLO-${acronym}-${serviceCode}-${paddedNumber}.${displayVersion}`;
    setFullProposalNumber(proposalId);
  }, [currentAreaInfo, lead.proposalNumber, lead.proposalVersion, allLeads, isOpen, isDirty]);

  const resetState = () => {
    const defaultTemplateId = lead.selectedTemplateId || 'none';
    handleTemplateChange(defaultTemplateId);
    setSelectedAreaAcronym((lead.proposalAreaAcronym || lead.proposalArea || 'SST').toUpperCase());
    setIsGenerating(false);
    setCurrentLink(null);
    setIsDirty(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const createAndShareProposalLink = async (): Promise<string | null> => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Banco de dados não conectado.' });
      return null;
    }

    setIsGenerating(true);
    try {
      const finalAcronym = currentAreaInfo.acronym;
      const finalServiceCode = currentAreaInfo.serviceCode;
      
      let finalNum = lead.proposalNumber;
      let newVersion = lead.proposalVersion ?? 0;

      if (!finalNum) {
          const areaLeads = allLeads.filter(l => (l.proposalAreaAcronym || l.proposalArea || 'SST').toUpperCase() === finalAcronym);
          const maxNum = Math.max(0, ...areaLeads.map(l => l.proposalNumber || 0));
          finalNum = maxNum + 1;
          newVersion = 0;
      } else if (isDirty) {
          newVersion = (lead.proposalVersion ?? 0) + 1;
      }

      const finalFullCode = `PTC-FLO-${finalAcronym}-${finalServiceCode}-${String(finalNum).padStart(3, '0')}.${newVersion}`;

      const { value, ...leadWithoutInternalValue } = lead;

      const proposalData: Omit<ProposalData, 'id'> = {
        lead: {
            ...leadWithoutInternalValue,
            proposalNumber: finalNum,
            proposalArea: finalAcronym,
            proposalAreaAcronym: finalAcronym,
            proposalServiceCode: finalServiceCode,
            proposalVersion: newVersion,
        } as Lead,
        proposalState: proposalState,
        fullProposalNumber: finalFullCode,
        createdAt: serverTimestamp(),
        logoUrl: logoUrl ?? null,
        proposalCoverUrl: proposalCoverUrl ?? null,
        proposalLocationUrl: proposalLocationUrl ?? null,
        proposalClosingUrl: proposalClosingUrl ?? null,
      };

      const docRef = doc(collection(firestore, 'proposals'));
      await setDoc(docRef, proposalData);
      
      onUpdateLead({
        ...lead,
        proposalGeneratedCount: (lead.proposalGeneratedCount || 0) + 1,
        proposalNumber: finalNum,
        proposalArea: finalAcronym,
        proposalAreaAcronym: finalAcronym,
        proposalServiceCode: finalServiceCode,
        proposalVersion: newVersion,
      });
      setIsDirty(false);
      toast({ title: 'Link da Proposta Gerado!' });

      return `${window.location.origin}/proposal/${docRef.id}`;
    } catch (error) {
      console.error('Erro ao criar o link da proposta:', error);
      toast({ variant: 'destructive', title: 'Erro ao Gerar Link' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const replaceVariables = (template: string, link: string) => {
    if (!template) return '';
    
    const formattedValue = formatCurrency(lead.value);
    const formattedDate = lead.budgetDate ? lead.budgetDate.split('-').reverse().join('/') : (isClient ? new Date().toLocaleDateString('pt-BR') : '');
    const formattedPayments = lead.paymentMethods.map(m => m.method.split(' (')[0]).join(', ');

    return template
      .replace(/{{name}}/g, lead.name)
      .replace(/{{role}}/g, lead.role || '')
      .replace(/{{company}}/g, lead.company)
      .replace(/{{cnpj}}/g, lead.cnpj)
      .replace(/{{email}}/g, lead.email)
      .replace(/{{whatsapp}}/g, lead.whatsapp)
      .replace(/{{proposalSummary}}/g, lead.proposalSummary)
      .replace(/{{value}}/g, formattedValue)
      .replace(/{{budgetDate}}/g, formattedDate)
      .replace(/{{paymentMethods}}/g, formattedPayments)
      .replace(/{{proposalNumber}}/g, String(lead.proposalNumber || ''))
      .replace(/{{proposalAreaAcronym}}/g, lead.proposalAreaAcronym || '')
      .replace(/{{proposalServiceCode}}/g, lead.proposalServiceCode || '')
      .replace(/{{proposalVersion}}/g, String(lead.proposalVersion || 0))
      .replace(/{{fullProposalNumber}}/g, fullProposalNumber)
      .replace(/{{createdBy}}/g, lead.createdBy)
      .replace(/{{proposalLink}}/g, link);
  };

  const handleShare = async (
    platform: 'whatsapp' | 'email' | 'copy' | 'open'
  ) => {
    let proposalLink = currentLink;
    if (!proposalLink) {
        proposalLink = await createAndShareProposalLink();
        if (proposalLink) setCurrentLink(proposalLink);
    }
    
    if (!proposalLink) return;

    if (platform === 'copy') {
      navigator.clipboard.writeText(proposalLink);
      window.open(proposalLink, '_blank');
      toast({ title: 'Sucesso', description: 'Link copiado!' });
      return;
    }

    if (platform === 'open') {
      window.open(proposalLink, '_blank');
      return;
    }

    if (platform === 'whatsapp') {
      onUpdateLead({
        ...lead,
        whatsappSentCount: (lead.whatsappSentCount || 0) + 1,
      });
      
      const defaultWATemplate = `Prezado(a) {{name}},\n\nSegue o link da sua proposta comercial nº {{fullProposalNumber}} referente à empresa {{company}}.\n\n{{proposalLink}}\n\nPermaneço à disposição para quaisquer esclarecimentos.\n\nAtenciosamente,\n{{createdBy}}\nGrupo Florêncio`;
      const template = appSettings?.whatsappTemplate || defaultWATemplate;
      const message = replaceVariables(template, proposalLink);
      
      const url = `https://wa.me/${lead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else if (platform === 'email') {
      const defaultSubject = `Proposta Comercial {{fullProposalNumber}} - {{company}}`;
      const defaultBody = `Prezado(a) {{name}},\n\nEncaminhamos o link da sua proposta comercial nº {{fullProposalNumber}}, elaborada para a empresa {{company}}.\n\nAcesse pelo link abaixo:\n{{proposalLink}}\n\nEm caso de dúvidas, permanecemos à disposição.\n\nAtenciosamente,\n{{createdBy}}\nGrupo Florêncio`;
      
      const subjectTemplate = appSettings?.emailSubjectTemplate || defaultSubject;
      const bodyTemplate = appSettings?.emailBodyTemplate || defaultBody;
      
      const subject = replaceVariables(subjectTemplate, proposalLink);
      const body = replaceVariables(bodyTemplate, proposalLink);
      
      const url = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    }
  };
  
  const handleDownloadPdf = async () => {
    const element = document.getElementById('proposal-container');
    if (!element) return;
    setIsGeneratingPdf(true);
    try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4', true);
        pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
        pdf.save(`Proposta-${lead.company}-${fullProposalNumber}.pdf`);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
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
    path,
  }: {
    field: string;
    className?: string;
    path?: string;
  }) => {
    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      const content = e.currentTarget.innerHTML;
      if (path) {
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
          } else if (parts[0] === 'investmentOptions') {
              const index = parseInt(parts[1]);
              const fieldKey = parts[2] as keyof InvestmentOption;
              setProposalState(prev => {
                  const newOptions = [...(prev.investmentOptions || [])];
                  newOptions[index] = { ...newOptions[index], [fieldKey]: content };
                  return { ...prev, investmentOptions: newOptions };
              });
          }
      } else {
          setProposalState(prevState => ({
            ...prevState,
            [field]: content,
          }));
      }
      setIsDirty(true);
      setCurrentLink(null);
    };

    const execCommand = (cmd: string, val?: string) => document.execCommand(cmd, false, val);

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
            } else if (parts[0] === 'investmentOptions') {
                const index = parseInt(parts[1]);
                const fieldKey = parts[2] as keyof InvestmentOption;
                return String((proposalState.investmentOptions?.[index] as any)?.[fieldKey] || '');
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
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => e.preventDefault()}><Smile className="h-4 w-4"/></Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" onOpenAutoFocus={e => e.preventDefault()}>
                    <div className="grid grid-cols-6 gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                            <Button key={emoji} variant="ghost" size="sm" className="h-8 w-8 p-0 text-lg" onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertText', false, emoji); }}>
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

  const activeAreas = useMemo(() => proposalAreas.filter(a => a.active || a.acronym === lead.proposalArea), [proposalAreas, lead.proposalArea]);

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
              Copiar/Abrir Link
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 mb-4">
          <div className="space-y-2">
            <Label htmlFor="proposal-area">Área da Proposta</Label>
            <Select 
              value={selectedAreaAcronym} 
              onValueChange={(v: string) => {
                  setSelectedAreaAcronym(v);
                  setIsDirty(true);
                  setCurrentLink(null);
              }}
              disabled={isGenerating || !!lead.proposalNumber}
            >
              <SelectTrigger id="proposal-area">
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                {activeAreas.map(area => (
                  <SelectItem key={area.id} value={area.acronym}>{area.acronym} - {area.serviceCode} ({area.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal-template">
              Modelo de Serviço
            </Label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  value={selectedTemplateId || 'none'}
                  onValueChange={handleTemplateChange}
                  disabled={isGenerating}
                >
                  <SelectTrigger id="proposal-template">
                    <SelectValue placeholder="Escolha um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (padrão)</SelectItem>
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
                <Save className="h-4 w-4" />
              </Button>
            </div>
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

              <section className="my-8 space-y-6">
                {proposalState.proposalObject?.trim() && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Objeto da Proposta
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="proposalObject" />
                        </div>
                    </>
                )}

                {proposalState.serviceScope?.trim() && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Escopo do Serviço
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="serviceScope" />
                        </div>
                    </>
                )}

                {proposalState.methodology?.trim() && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Metodologia
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="methodology" />
                        </div>
                    </>
                )}

                {proposalState.complexityDefinitions && proposalState.complexityDefinitions.length > 0 && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                            São considerados Contratos de Baixa Complexidade, Média Complexidade, Alta Complexidade:
                        </h3>
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
                    </>
                )}

                {proposalState.planStructure && proposalState.planStructure.length > 0 && (
                    <div className="my-8 overflow-hidden rounded-lg border border-[#1b7689]">
                        <div className="bg-[#1b7689] p-3 text-center text-white font-bold uppercase tracking-wider">
                            ESTRUTURA DOS PLANOS
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

                {proposalState.deadline?.trim() && (
                    <>
                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                        Prazo para Realização dos Serviços
                        </h3>
                        <div className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <EditableDiv field="deadline" />
                        </div>
                    </>
                )}
              </section>

              <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                  Investimentos
                </h3>
                
                <div className="prose dark:prose-invert max-w-none p-2 rounded-md mt-8">
                  <EditableDiv field="investment" />
                </div>

                {proposalState.plans && proposalState.plans.length > 0 && (
                  <div className="mt-12 space-y-8">
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
                          <div className="space-y-4">
                            {plan.purpose?.trim() && (
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Finalidade</p>
                                <EditableDiv field="dummy" path={`plans.${index}.purpose`} className="text-sm leading-tight bg-white/50" />
                              </div>
                            )}
                            {plan.servicesIncluded?.trim() && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Serviços Inclusos</p>
                                    <EditableDiv field="dummy" path={`plans.${index}.servicesIncluded`} className="text-sm leading-relaxed bg-white/50" />
                                </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-primary/5 border-t flex justify-between items-center">
                          <span className="font-bold text-sm">Investimento do Plano:</span>
                          <span className="text-xl font-bold text-primary">
                            {formatCurrency(plan.investment || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <footer className="text-center pt-8 border-t mt-8">
                <p className="font-bold" style={{ color: '#1b7689' }}>
                  Grupo Florencio
                </p>
                <p className="text-xs">
                  comercial@grupoflorencio.com.br | +55 (21) 96453-9493
                </p>
              </footer>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
