'use client';

import { useState } from 'react';
import type { Lead } from '@/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import FollowUpModal from './follow-up-modal';

type KanbanCardProps = {
  lead: Lead;
};

export default function KanbanCard({ lead }: KanbanCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        className="cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow bg-card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{lead.name}</CardTitle>
          <CardDescription>{lead.company}</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-lg font-bold text-primary">
            {formatCurrency(lead.value)}
          </p>
        </CardContent>
        {lead.status === 'Rejeitado' && (
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsModalOpen(true)}
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Enviar Follow-up
            </Button>
          </CardFooter>
        )}
      </Card>
      {lead.status === 'Rejeitado' && (
        <FollowUpModal
          lead={lead}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </>
  );
}
