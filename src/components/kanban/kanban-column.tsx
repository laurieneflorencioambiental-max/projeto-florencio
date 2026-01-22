'use client';

import { useState } from 'react';
import type { Lead, Status, ProposalTemplate } from '@/lib/types';
import KanbanCard from './kanban-card';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type KanbanColumnProps = {
  status: Status;
  allLeads: Lead[];
  leads: Lead[];
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: Status) => void;
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  proposalTemplates: ProposalTemplate[];
  logoUrl?: string | null;
  proposalCoverUrl?: string | null;
};

export default function KanbanColumn({
  status,
  allLeads,
  leads,
  onDrop,
  onUpdateLead,
  onDeleteLead,
  proposalTemplates,
  logoUrl,
  proposalCoverUrl,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    onDrop(e, status);
    setIsOver(false);
  };

  const statusColors: { [key in Status]: string } = {
    Novos: 'bg-blue-500/10 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'Pendente/Em negociação': 'bg-yellow-500/10 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    Aprovado: 'bg-green-500/10 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Desistência: 'bg-orange-500/10 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    Rejeitado: 'bg-red-500/10 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col h-[calc(100vh-12rem)] w-[320px] rounded-lg bg-muted/50 transition-colors',
        isOver && 'bg-primary/20'
      )}
    >
      <CardHeader className="p-4 sticky top-0 bg-muted/50 z-10 backdrop-blur-sm">
        <CardTitle className="font-headline text-lg flex justify-between items-center text-foreground/80">
          {status}
          <span
            className={cn(
              'text-sm font-semibold rounded-full px-2.5 py-0.5',
              statusColors[status]
            )}
          >
            {leads.length}
          </span>
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="flex flex-col gap-4 p-2 md:p-4 h-full">
          {leads.map(lead => (
            <KanbanCard key={lead.id} lead={lead} allLeads={allLeads} onUpdateLead={onUpdateLead} onDeleteLead={onDeleteLead} proposalTemplates={proposalTemplates} logoUrl={logoUrl} proposalCoverUrl={proposalCoverUrl} />
          ))}
        </CardContent>
      </ScrollArea>
    </div>
  );
}
