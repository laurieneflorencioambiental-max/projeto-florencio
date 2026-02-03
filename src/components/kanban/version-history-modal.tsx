'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '../ui/scroll-area';
import type { Lead, VersionHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { toDate } from '@/lib/utils';

type VersionHistoryModalProps = {
  lead: Lead;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function VersionHistoryModal({
  lead,
  isOpen,
  onOpenChange,
}: VersionHistoryModalProps) {
  const history = lead.versionHistory || [];

  const fullProposalNumberRoot = lead.proposalNumber
    ? `PTC-FLO-SST-${String(lead.proposalNumber).padStart(3, '0')}`
    : 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Histórico de Edições
          </DialogTitle>
          <DialogDescription>
            Acompanhe todas as versões da proposta para a empresa {lead.company}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] p-1">
          {history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Editor</TableHead>
                  <TableHead>Data da Edição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history
                  .slice()
                  .reverse()
                  .map((entry: VersionHistoryEntry) => (
                    <TableRow key={entry.version}>
                      <TableCell className="font-medium">{`${fullProposalNumberRoot}.${entry.version}`}</TableCell>
                      <TableCell>{entry.editedBy}</TableCell>
                      <TableCell>
                        {format(
                          toDate(entry.editedAt)!,
                          "dd/MM/yyyy 'às' HH:mm"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-full py-20 text-center text-sm text-muted-foreground">
              <p>
                Nenhum histórico de edição detalhado disponível para esta
                proposta.
              </p>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
