'use client';

import type { Lead, Status, ProposalTemplate } from '@/lib/types';
import KanbanColumn from './kanban-column';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type KanbanBoardProps = {
  allLeads: Lead[];
  leads: Lead[];
  visibleStatuses: Status[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onLeadStatusChange: (leadId: string, newStatus: Status) => void;
  proposalTemplates: ProposalTemplate[];
};

export default function KanbanBoard({ allLeads, leads, visibleStatuses, onUpdateLead, onDeleteLead, onLeadStatusChange, proposalTemplates }: KanbanBoardProps) {

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    newStatus: Status
  ) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    onLeadStatusChange(leadId, newStatus);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex w-max space-x-4 pb-4">
        {visibleStatuses.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            allLeads={allLeads}
            leads={leads.filter(lead => lead.status === status)}
            onDrop={handleDrop}
            onUpdateLead={onUpdateLead}
            onDeleteLead={onDeleteLead}
            proposalTemplates={proposalTemplates}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
