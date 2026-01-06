import KanbanBoard from '@/components/kanban/kanban-board';
import { initialLeads } from '@/lib/data';

export default function Home() {
  return (
    <div>
      <KanbanBoard initialLeads={initialLeads} />
    </div>
  );
}
