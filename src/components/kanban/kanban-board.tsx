'use client';

import type { Lead, Status, ProposalTemplate, AppSettings } from '@/lib/types';
import KanbanColumn from './kanban-column';

type KanbanBoardProps = {
  allLeads: Lead[];
  leads: Lead[];
  visibleStatuses: Status[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onLeadStatusChange: (leadId: string, newStatus: Status) => void;
  proposalTemplates: ProposalTemplate[];
  settings?: Partial<AppSettings> | null;
  currentSeller: string;
};

export default function KanbanBoard({
  allLeads,
  leads,
  visibleStatuses,
  onUpdateLead,
  onDeleteLead,
  onLeadStatusChange,
  proposalTemplates,
  settings,
  currentSeller,
}: KanbanBoardProps) {
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
          settings={settings}
          currentSeller={currentSeller}
        />
      ))}
    </div>
  );
}
