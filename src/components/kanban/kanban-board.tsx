'use client';

import { useState, useEffect } from 'react';
import type { Lead, Status } from '@/lib/types';
import KanbanColumn from './kanban-column';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type KanbanBoardProps = {
  allLeads: Lead[];
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  visibleStatuses: Status[];
  onUpdateLead: (lead: Lead) => void;
};

export default function KanbanBoard({ allLeads, leads, setLeads, visibleStatuses, onUpdateLead }: KanbanBoardProps) {

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    newStatus: Status
  ) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus, previousStatus: lead.status } : lead
      )
    );
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
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
