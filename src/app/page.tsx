import KanbanBoard from '@/components/kanban/kanban-board';
import { initialLeads } from '@/lib/data';

export default function Home() {
  return (
    <div className='-m-4 sm:-m-6'>
        <KanbanBoard initialLeads={initialLeads} />
    </div>
  );
}
