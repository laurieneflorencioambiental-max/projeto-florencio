
'use client';

import { useState, useEffect } from 'react';
import type { Lead, ProposalTemplate, AppSettings } from '@/lib/types';
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
} from '../ui/tooltip';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
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
};

export default function KanbanCard({
  lead,
  allLeads,
  onUpdateLead,
  onDeleteLead,
  proposalTemplates,
  appSettings,
  currentSeller,
}: KanbanCardProps) {
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // State for observations
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
      onUpdateLead({ ...lead, observations: observationText.trim() });
    }
    setIsEditingObservation(false);
  };

  const handleCancelEditObservation = () => {
    setObservationText(lead.observations || '');
    setIsEditingObservation(false);
  };

  const handleDeleteObservation = () => {
    onUpdateLead({ ...lead, observations: '' });
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
                  Esta ação removerá permanentemente esta observação.
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
  
  const FormattedCreationDate = () => {
    if (!isClient) return <span>...</span>;
    const date = toDate(lead.createdAt);
    return <span>{date ? format(date, "dd/MM/yyyy 'às' HH:mm") : '...'}</span>;
  };

  const VersionHistoryTooltipContent = () => {
    if (!isClient || !lead.versionHistory || lead.versionHistory.length === 0) {
      return <p>{lead.proposalVersion > 0 ? 'Histórico de edição não disponível' : 'Proposta nunca editada'}</p>;
    }
    const lastEdit = lead.versionHistory[lead.versionHistory.length - 1];
    const lastEditDate = toDate(lastEdit.editedAt);
    return <p>Última edição por {lastEdit.editedBy} em {lastEditDate ? format(lastEditDate, 'dd/MM/yy') : '...'}</p>;
  }

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
                <FormattedCreationDate />
              </div>
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
              <div className="flex flex-col gap-2">
                <p className="font-medium text-sm">Formas de Pagamento:</p>
                <div className="flex flex-wrap gap-2">
                  {lead.paymentMethods.map(pm => (
                    <Tooltip key={pm.method}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="flex gap-2 items-center"
                        >
                          {getPaymentMethodIcon(pm.method)}
                          <span>
                            {pm.method
                              .replace(' (Link)', '')
                              .replace(' (Maquininha)', '')}
                          </span>
                          {pm.method.includes('Crédito') && pm.cardFee && (
                            <span className="text-xs opacity-75">
                              ({pm.cardFee}% taxa)
                            </span>
                          )}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Forma de Pagamento</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <StaleLeadIndicator />
              {(lead.status === 'Rejeitado' ||
                lead.status === 'Desistência') &&
                lead.rejectionReason && (
                  <div className="flex items-start gap-2 p-2.5 bg-destructive/10 rounded-md border border-dashed border-destructive/30">
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Motivo da perda do lead.</p>
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-xs text-destructive whitespace-normal">
                      <span className="font-semibold">Motivo:</span>{' '}
                      {lead.rejectionReason}
                    </p>
                  </div>
                )}
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
                        Notas internas sobre a negociação. Não são visíveis para o
                        cliente.
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
                Gerar Proposta
              </Button>
              {lead.status === 'Rejeitado' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsFollowUpModalOpen(true)}
                  disabled={!lead.rejectionReason}
                >
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Gerar Follow-up com IA
                </Button>
              )}
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
                    <VersionHistoryTooltipContent />
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
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <FileSignature className="h-3 w-3" />{' '}
                    {lead.proposalGeneratedCount}
                  </TooltipTrigger>
                  <TooltipContent>
                    Proposta gerada {lead.proposalGeneratedCount}{' '}
                    {lead.proposalGeneratedCount === 1 ? 'vez' : 'vezes'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <Send className="h-3 w-3" /> {lead.whatsappSentCount}
                  </TooltipTrigger>
                  <TooltipContent>
                    Enviado por WhatsApp {lead.whatsappSentCount}{' '}
                    {lead.whatsappSentCount === 1 ? 'vez' : 'vezes'}
                  </TooltipContent>
                </Tooltip>
                {lead.previousStatus && (
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      <ArrowRightLeft className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Status anterior: {lead.previousStatus}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </CardFooter>
        </Card>
      </TooltipProvider>
      {lead.status === 'Rejeitado' && (
        <FollowUpModal
          lead={lead}
          isOpen={isFollowUpModalOpen}
          onOpenChange={setIsFollowUpModalOpen}
        />
      )}
      <EditLeadModal
        lead={lead}
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={onUpdateLead}
        currentSeller={currentSeller}
        proposalTemplates={proposalTemplates}
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
      />
      <VersionHistoryModal
        lead={lead}
        isOpen={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
      />
    </>
  );
}
