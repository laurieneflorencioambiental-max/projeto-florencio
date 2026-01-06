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
} from 'lucide-react';
import FollowUpModal from './follow-up-modal';
import { Badge } from '@/components/ui/badge';

type KanbanCardProps = {
  lead: Lead;
};

export default function KanbanCard({ lead }: KanbanCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          <CardTitle className="text-lg font-bold">{lead.company}</CardTitle>
          <CardDescription>{lead.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4 text-sm">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xs">{lead.cnpj}</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-1" />
            <p className="flex-1">{lead.proposalSummary}</p>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-base font-bold text-primary">
              {formatCurrency(lead.value)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
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
          <div className="border-t border-border pt-4 flex flex-col gap-3">
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
        </CardContent>
        {lead.status === 'Rejeitado' && (
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsModalOpen(true)}
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Gerar Follow-up
            </Button>
          </CardFooter>
        )}
      </Card>
      {lead.status === 'Rejeitado' && (
        <FollowUpModal
          lead={lead}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </>
  );
}
