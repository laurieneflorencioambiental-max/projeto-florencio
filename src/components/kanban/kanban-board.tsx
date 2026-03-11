'use client';

import type { Lead, Status, ProposalTemplate, AppSettings, ProposalArea } from '@/lib/types';
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
  proposalAreas: ProposalArea[];
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
  proposalAreas,
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
    <div className="flex gap-4 overflow-x-auto pb-4">
      {visibleStatuses.map(status => (
        <div key={status} className="w-80 flex-shrink-0 lg:w-96">
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
            proposalAreas={proposalAreas}
          />
        </div>
      ))}
    </div>
  );
}
