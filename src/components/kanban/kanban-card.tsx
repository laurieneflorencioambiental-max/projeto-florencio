'use client';

import { useState, useEffect } from 'react';
import type { Lead, ProposalTemplate, AppSettings, VersionHistoryEntry, ProposalArea } from '@/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MessageSquarePlus,
  Mail,
  Phone,
  Briefcase,
  FileText,
  DollarSign,
  CreditCard,
  Barcode,
  Users,
  UserCheck,
  Pencil,
  Trash2,
  AlertCircle,
  Calendar,
  MousePointer,
  Tablet,
  FileSignature,
  User,
  Repeat,
  Send,
  ArrowRightLeft,
  StickyNote,
  Save,
  X,
  History,
  Clock,
  Eye,
} from 'lucide-react';
import FollowUpModal from './follow-up-modal';
import EditLeadModal from './edit-lead-modal';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import ProposalModal from './proposal-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import VersionHistoryModal from './version-history-modal';
import { toDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

type KanbanCardProps = {
  lead: Lead;
  allLeads: Lead[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  proposalTemplates: ProposalTemplate[];
  appSettings?: Partial<AppSettings> | null;
  currentSeller: string;
  proposalAreas: ProposalArea[];
};

export default function KanbanCard({
  lead,
  allLeads,
  onUpdateLead,
  onDeleteLead,
  proposalTemplates,
  appSettings,
  currentSeller,
  proposalAreas,
}: KanbanCardProps) {
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [isEditingObservation, setIsEditingObservation] = useState(false);
  const [observationText, setObservationText] = useState(lead.observations || '');
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setObservationText(lead.observations || '');
    if (!lead.observations) {
      setIsEditingObservation(false);
    }
  }, [lead.observations]);
  
  const handleSaveObservation = () => {
    if (observationText.trim() !== (lead.observations || '').trim()) {
      const newHistoryEntry: VersionHistoryEntry = {
        version: lead.proposalVersion || 0,
        editedBy: currentSeller || 'Sistema',
        editedAt: new Date(),
      };
      const newHistory = [...(lead.versionHistory || []), newHistoryEntry];

      onUpdateLead({ 
        ...lead, 
        observations: observationText.trim(),
        versionHistory: newHistory
      });
    }
    setIsEditingObservation(false);
  };

  const handleCancelEditObservation = () => {
    setObservationText(lead.observations || '');
    setIsEditingObservation(false);
  };

  const handleDeleteObservation = () => {
    const newHistoryEntry: VersionHistoryEntry = {
      version: lead.proposalVersion || 0,
      editedBy: currentSeller || 'Sistema',
      editedAt: new Date(),
    };
    const newHistory = [...(lead.versionHistory || []), newHistoryEntry];

    onUpdateLead({ 
      ...lead, 
      observations: '',
      versionHistory: newHistory
    });
    setObservationText('');
    setIsEditingObservation(false);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return 'A definir';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getContactSourceInfo = () => {
    const { source, indicatedBy } = lead.contactSource;
    let icon = <Users className="h-4 w-4 text-muted-foreground" />;
    let text: string = source;
    if (source === 'Indicação' && indicatedBy) {
      icon = <UserCheck className="h-4 w-4 text-muted-foreground" />;
      text = `${source} (${indicatedBy})`;
    }
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>{icon}</TooltipTrigger>
          <TooltipContent>
            <p>Origem do Contato</p>
          </TooltipContent>
        </Tooltip>
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    if (method.includes('Boleto')) return <Barcode />;
    if (method.includes('Link')) return <MousePointer />;
    if (method.includes('Maquininha')) return <Tablet />;
    return <CreditCard />;
  };

  const handleDelete = () => {
    onDeleteLead(lead.id);
    setIsDeleteDialogOpen(false);
  };
  
  const renderObservationContent = () => {
    if (isEditingObservation) {
      return (
        <div className="mt-1 space-y-2">
          <Textarea
            id={`obs-${lead.id}`}
            placeholder="Adicione uma nota sobre a negociação..."
            className="text-xs h-24 bg-muted/50 border-dashed"
            value={observationText}
            onChange={(e) => setObservationText(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEditObservation}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveObservation}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>
      );
    }

    if (!lead.observations) {
      return (
        <div className="p-2 text-center">
            <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setIsEditingObservation(true)}
            >
            Adicionar Observação
            </Button>
        </div>
      );
    }

    return (
      <div className="mt-1 group relative">
        <p className="text-xs p-3 bg-muted/40 rounded-md min-h-[5rem] border border-transparent whitespace-pre-wrap">
          {lead.observations}
        </p>
        <div className="absolute top-0 right-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/40 rounded-tr-md rounded-bl-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsEditingObservation(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Observação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação removerá permanentemente esta observação. O contador de inatividade será reiniciado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteObservation}>
                  Sim, Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  const StaleLeadIndicator = () => {
    if (!isClient) return null;

    const staleDays = appSettings?.staleLeadDays || 7;
    if (lead.status !== 'Pendente/Em negociação') return null;

    const history = lead.versionHistory || [];
    const lastActivityDate =
      history.length > 0
        ? toDate(history[history.length - 1].editedAt)
        : toDate(lead.createdAt);

    if (!lastActivityDate || differenceInDays(new Date(), lastActivityDate) <= staleDays) {
      return null;
    }

    return (
      <div className="flex items-start gap-2 mt-4 p-2.5 bg-amber-500/10 rounded-md border border-dashed border-amber-500/30">
        <Tooltip>
          <TooltipTrigger>
            <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Este lead não recebe uma atualização há muito tempo.</p>
          </TooltipContent>
        </Tooltip>
        <p className="text-xs text-amber-700 whitespace-normal">
          <span className="font-semibold">Atenção:</span> Lead
          inativo há mais de {staleDays} dias.
        </p>
      </div>
    );
  };
  
  const FormattedBudgetDate = () => {
    if (!isClient) return <span>...</span>;
    
    if (lead.budgetDate) {
      const parts = lead.budgetDate.split('-');
      if (parts.length === 3) {
        return <span>{`${parts[2]}/${parts[1]}/${parts[0]}`}</span>;
      }
    }
    
    const date = toDate(lead.createdAt);
    return <span>{date ? format(date, "dd/MM/yyyy") : '...'}</span>;
  };

  const getFormattedProposalCode = () => {
    if (!lead.proposalNumber) return 'N/A';
    
    const acronym = lead.proposalAreaAcronym || lead.proposalArea || 'SST';
    const serviceCode = lead.proposalServiceCode || (acronym === 'MA' ? '002' : '001');
    const paddedNum = String(lead.proposalNumber).padStart(3, '0');
    const version = lead.proposalVersion || 0;
    
    return `PTC-FLO-${acronym.toUpperCase()}-${serviceCode}-${paddedNum}.${version}`;
  };

  const isLostStatus = lead.status === 'Rejeitado' || lead.status === 'Desistência';

  return (
    <>
      <TooltipProvider>
        <Card
          draggable
          onDragStart={handleDragStart}
          className="cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow bg-card w-full flex flex-col"
        >
          <CardHeader className="pb-4">
            <div className="flex flex-shrink-0 items-center -ml-2 -mt-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditModalOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Editar</span>
              </Button>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o orçamento da empresa "{lead.company}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
            <CardTitle className="text-lg font-bold break-words min-w-0 pt-1">
                {lead.company}
            </CardTitle>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="truncate">
                {lead.name}
                {lead.role && (
                  <span className="text-xs text-muted-foreground/80">
                    , {lead.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <FormattedBudgetDate />
              </div>
              {lead.proposalNumber && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>
                    Proposta nº: {getFormattedProposalCode()}
                  </span>
                </div>
              )}
              {isClient && lead.proposalViewCount > 0 && (
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-primary font-medium">
                    <Eye className="h-3 w-3" />
                    <span>
                      Visualizada {lead.proposalViewCount} {lead.proposalViewCount === 1 ? 'vez' : 'vezes'}
                      {lead.proposalLastViewedAt && (
                        <>
                          {' '}(Última: {format(toDate(lead.proposalLastViewedAt)!, "dd/MM 'às' HH:mm")})
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 py-0 px-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>CNPJ da Empresa</p>
                  </TooltipContent>
                </Tooltip>
                <span className="font-mono text-xs break-all">{lead.cnpj}</span>
              </div>
              <div className="flex items-start gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Resumo da Proposta</p>
                  </TooltipContent>
                </Tooltip>
                <p className="flex-1 whitespace-pre-wrap">{lead.proposalSummary}</p>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Valor do Orçamento</p>
                  </TooltipContent>
                </Tooltip>
                <p className="text-base font-bold text-primary">
                  {formatCurrency(lead.value)}
                </p>
              </div>
              
              {isLostStatus && lead.rejectionReason && (
                <div className="flex items-start gap-2 p-2 bg-destructive/5 rounded-md border border-destructive/10 animate-in fade-in slide-in-from-top-1 duration-300">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-tight">Motivo da Perda</p>
                    <p className="text-xs text-destructive/90 font-medium">{lead.rejectionReason}</p>
                  </div>
                </div>
              )}

              <StaleLeadIndicator />
              <div className="border-t border-border pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>E-mail do contato</p>
                    </TooltipContent>
                  </Tooltip>
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm text-muted-foreground hover:underline break-all"
                  >
                    {lead.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger>
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>WhatsApp do contato</p>
                    </TooltipContent>
                  </Tooltip>
                  <a
                    href={`https://wa.me/${lead.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:underline break-all"
                  >
                    {lead.whatsapp}
                  </a>
                </div>
                {getContactSourceInfo()}
              </div>
              <div className="border-t pt-4">
                <Label
                  htmlFor={`obs-${lead.id}`}
                  className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <StickyNote className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Notas internas sobre a negociação.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  Observações Internas
                </Label>
                {renderObservationContent()}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 p-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsProposalModalOpen(true)}
              >
                <FileSignature className="mr-2 h-4 w-4" />
                Configurador de Proposta
              </Button>
            <div className="w-full pt-4 mt-2 border-t">
              <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {lead.createdBy.split(' ')[0]}
                  </TooltipTrigger>
                  <TooltipContent>Criado por: {lead.createdBy}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsHistoryModalOpen(true)}
                      className="flex items-center gap-1"
                      disabled={lead.proposalVersion === 0}
                    >
                      <History className="h-3 w-3" /> v{lead.proposalVersion}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Histórico de edições da proposta.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <Repeat className="h-3 w-3" /> {lead.editCount}
                  </TooltipTrigger>
                  <TooltipContent>
                    Editado {lead.editCount}{' '}
                    {lead.editCount === 1 ? 'vez' : 'vezes'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardFooter>
        </Card>
      </TooltipProvider>
      <EditLeadModal
        lead={lead}
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={onUpdateLead}
        currentSeller={currentSeller}
        proposalTemplates={proposalTemplates}
        proposalAreas={proposalAreas}
      />
      <ProposalModal
        lead={lead}
        allLeads={allLeads}
        isOpen={isProposalModalOpen}
        onOpenChange={setIsProposalModalOpen}
        onUpdateLead={onUpdateLead}
        proposalTemplates={proposalTemplates}
        logoUrl={appSettings?.proposalLogoUrl}
        proposalCoverUrl={appSettings?.proposalCoverUrl}
        proposalClosingUrl={appSettings?.proposalClosingUrl}
        proposalAreas={proposalAreas}
      />
      <VersionHistoryModal
        lead={lead}
        isOpen={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
      />
    </>
  );
}
