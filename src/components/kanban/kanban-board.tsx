'use client';

import { useState, useEffect } from 'react';
import type { Lead, Status } from '@/lib/types';
import KanbanColumn from './kanban-column';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type KanbanBoardProps = {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  visibleStatuses: Status[];
};

export default function KanbanBoard({ leads, setLeads, visibleStatuses }: KanbanBoardProps) {

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
      <div className="flex w-max space-x-4 pb-4">
        {visibleStatuses.map(status => (
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
