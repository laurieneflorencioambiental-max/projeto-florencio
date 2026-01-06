'use client';

import { useState } from 'react';
import type { Lead, Status } from '@/lib/types';
import { statuses } from '@/lib/types';
import KanbanColumn from './kanban-column';

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
      {statuses.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          leads={leads.filter(lead => lead.status === status)}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
