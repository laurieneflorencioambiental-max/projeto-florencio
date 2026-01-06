'use client';

import { useState } from 'react';
import type { Lead } from '@/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
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
} from 'lucide-react';
import FollowUpModal from './follow-up-modal';
import EditLeadModal from './edit-lead-modal';
import { Badge } from '@/components/ui/badge';

type KanbanCardProps = {
  lead: Lead;
  onUpdateLead: (lead: Lead) => void;
};

export default function KanbanCard({ lead, onUpdateLead }: KanbanCardProps) {
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const formatCurrency = (value: number) => {
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

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        className="cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow bg-card w-full"
      >
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold">{lead.company}</CardTitle>
              <CardDescription>
                {lead.name}
                {lead.role && <span className="text-xs text-muted-foreground">, {lead.role}</span>}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditModalOpen(true)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4 text-sm overflow-x-auto">
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
                        <Badge variant="secondary" key={pm.method} className="flex gap-2 items-center">
                        {pm.method === 'Boleto' ? <Barcode /> : <CreditCard />}
                        <span>{pm.method}</span>
                        {pm.method === 'Cartão de Crédito/Débito' && pm.cardFee && (
                            <span className="text-xs opacity-75">({pm.cardFee}% taxa)</span>
                        )}
                        </Badge>
                    ))}
                    </div>
                </div>
                {(lead.status === 'Rejeitado' || lead.status === 'Desistência') && lead.rejectionReason && (
                    <div className="flex items-start gap-2 mt-4 p-2.5 bg-destructive/10 rounded-md border border-dashed border-destructive/30">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-destructive/80">
                            <span className="font-semibold text-destructive">Motivo:</span> {lead.rejectionReason}
                        </p>
                    </div>
                )}
                <div className="border-t border-border pt-4 mt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lead.email}`} className="text-sm text-muted-foreground hover:underline">
                        {lead.email}
                    </a>
                    </div>
                    <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:underline">
                        {lead.whatsapp}
                    </a>
                    </div>
                    {getContactSourceInfo()}
                </div>
            </div>
        </CardContent>
        {lead.status === 'Rejeitado' && (
          <CardFooter>
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
          </CardFooter>
        )}
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
      />
    </>
  );
}
