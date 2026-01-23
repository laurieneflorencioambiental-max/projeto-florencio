'use client';

import { useState, useEffect } from 'react';
import type { Lead, ProposalTemplate } from '@/lib/types';
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
  GitBranch,
} from 'lucide-react';
import FollowUpModal from './follow-up-modal';
import EditLeadModal from './edit-lead-modal';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
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

type KanbanCardProps = {
  lead: Lead;
  allLeads: Lead[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  proposalTemplates: ProposalTemplate[];
  logoUrl?: string | null;
  proposalCoverUrl?: string | null;
  proposalClosingUrl?: string | null;
  currentSeller: string;
};

const getLeadDate = (date: any): Date => {
  if (date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date);
  }
  return date;
};

export default function KanbanCard({
  lead,
  allLeads,
  onUpdateLead,
  onDeleteLead,
  proposalTemplates,
  logoUrl,
  proposalCoverUrl,
  proposalClosingUrl,
  currentSeller,
}: KanbanCardProps) {
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // State for observations
  const [isEditingObservation, setIsEditingObservation] = useState(false);
  const [observationText, setObservationText] = useState(lead.observations || '');

  const lastEdit =
    lead.versionHistory && lead.versionHistory.length > 0
      ? lead.versionHistory[lead.versionHistory.length - 1]
      : null;

  useEffect(() => {
    setObservationText(lead.observations || '');
    // If the observation is deleted from outside, exit editing mode
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
    let text = source;
    if (source === 'Indicação' && indicatedBy) {
      icon = <UserCheck className="h-4 w-4 text-muted-foreground" />;
      text = `${source} (${indicatedBy})`;
    }
    return (
      <div className="flex items-center gap-2">
        {icon}
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
        <p className="text-xs whitespace-pre-wrap p-3 bg-muted/40 rounded-md min-h-[5rem] border border-transparent">
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


  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        className="cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow bg-card w-full flex flex-col"
      >
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold">{lead.company}</CardTitle>
              <div className="text-sm text-muted-foreground space-y-1 mt-1">
                <div>
                  {lead.name}
                  {lead.role && (
                    <span className="text-xs text-muted-foreground/80">
                      , {lead.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(getLeadDate(lead.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá
                      permanentemente o orçamento da empresa "{lead.company}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4 text-sm overflow-x-auto flex-1">
          <div className="pr-4 whitespace-normal">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs">{lead.cnpj}</span>
            </div>
            <div className="flex items-start gap-2 mt-4">
              <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              <p className="flex-1">{lead.proposalSummary}</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-base font-bold text-primary">
                {formatCurrency(lead.value)}
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <p className="font-medium text-sm">Formas de Pagamento:</p>
              <div className="flex flex-wrap gap-2">
                {lead.paymentMethods.map(pm => (
                  <Badge
                    variant="secondary"
                    key={pm.method}
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
                ))}
              </div>
            </div>
            {(lead.status === 'Rejeitado' ||
              lead.status === 'Desistência') &&
              lead.rejectionReason && (
                <div className="flex items-start gap-2 mt-4 p-2.5 bg-destructive/10 rounded-md border border-dashed border-destructive/30">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">
                    <span className="font-semibold">Motivo:</span>{' '}
                    {lead.rejectionReason}
                  </p>
                </div>
              )}
            <div className="border-t border-border pt-4 mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${lead.email}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {lead.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`https://wa.me/${lead.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {lead.whatsapp}
                </a>
              </div>
              {getContactSourceInfo()}
            </div>
            <div className="mt-4 border-t pt-4">
              <Label
                htmlFor={`obs-${lead.id}`}
                className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
              >
                <StickyNote className="h-3 w-3" />
                Observações Internas
              </Label>
              {renderObservationContent()}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 items-start">
          <div className="w-full flex flex-col gap-2">
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
          </div>
          <div className="w-full pt-2 mt-2 border-t">
            <TooltipProvider>
              <div className="flex justify-around items-center text-xs text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {lead.createdBy.split(' ')[0]}
                  </TooltipTrigger>
                  <TooltipContent>Criado por: {lead.createdBy}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" /> v{lead.proposalVersion}
                  </TooltipTrigger>
                  <TooltipContent>
                    {lastEdit ? (
                      <span>
                        Última edição por {lastEdit.editedBy.split(' ')[0]} em{' '}
                        {format(getLeadDate(lastEdit.editedAt), 'dd/MM/yy')}
                      </span>
                    ) : lead.proposalVersion > 0 ? (
                      <span>Histórico de edição não disponível.</span>
                    ) : (
                      <span>Proposta nunca editada</span>
                    )}
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
            </TooltipProvider>
          </div>
        </CardFooter>
      </Card>
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
      />
      <ProposalModal
        lead={lead}
        allLeads={allLeads}
        isOpen={isProposalModalOpen}
        onOpenChange={setIsProposalModalOpen}
        onUpdateLead={onUpdateLead}
        proposalTemplates={proposalTemplates}
        logoUrl={logoUrl}
        proposalCoverUrl={proposalCoverUrl}
        proposalClosingUrl={proposalClosingUrl}
      />
    </>
  );
}
