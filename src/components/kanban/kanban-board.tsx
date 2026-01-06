'use client';

import { useState } from 'react';
import type { Lead, Status } from '@/lib/types';
import { statuses } from '@/lib/types';
import KanbanColumn from './kanban-column';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type KanbanBoardProps = {
  initialLeads: Lead[];
};

export default function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    newStatus: Status
  ) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prevLeads =>
      prevLeads.map(lead => (lead.id === updatedLead.id ? updatedLead : lead))
    );
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex w-max space-x-4 p-4">
        {statuses.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leads.filter(lead => lead.status === status)}
            onDrop={handleDrop}
            onUpdateLead={handleUpdateLead}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
