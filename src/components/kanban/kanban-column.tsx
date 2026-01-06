'use client';

import { useState } from 'react';
import type { Lead, Status } from '@/lib/types';
import KanbanCard from './kanban-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KanbanColumnProps = {
  status: Status;
  leads: Lead[];
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: Status) => void;
};

export default function KanbanColumn({
  status,
  leads,
  onDrop,
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
    Novos: 'bg-blue-500/10 text-blue-800',
    Pendente: 'bg-yellow-500/10 text-yellow-800',
    Aprovado: 'bg-green-500/10 text-green-800',
    Desistência: 'bg-orange-500/10 text-orange-800',
    Rejeitado: 'bg-red-500/10 text-red-800',
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col h-full min-h-[200px] rounded-lg bg-card/50 transition-colors',
        isOver && 'bg-primary/20'
      )}
    >
      <CardHeader className="p-4">
        <CardTitle className="font-headline text-lg flex justify-between items-center text-foreground/80">
          {status}
          <span
            className={cn(
              'text-xs font-semibold rounded-full px-2 py-0.5',
              statusColors[status]
            )}
          >
            {leads.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-2 md:p-4">
        {leads.map(lead => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
      </CardContent>
    </div>
  );
}
