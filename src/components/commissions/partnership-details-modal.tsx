'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '../ui/scroll-area';
import type { CommissionTemplate } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Printer, FileText } from 'lucide-react';
import { useMemo } from 'react';

type PartnershipDetailsModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  partnerName: string;
  templates: CommissionTemplate[];
};

export default function PartnershipDetailsModal({
  isOpen,
  onOpenChange,
  partnerName,
  templates,
}: PartnershipDetailsModalProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handlePrint = () => {
    const printContent = document.getElementById('partnership-details-print-area');
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50,top=50,width=800,height=600');

    if (printWindow && printContent) {
        const pageTitle = `Detalhes da Parceria - ${partnerName}`;
        printWindow.document.write(`<html><head><title>${pageTitle}</title>`);
        // Basic styling for printing
        printWindow.document.write(`
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h1, h2 { color: #333; }
                .no-print { display: none; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }
  };

  const totals = useMemo(() => {
    const totalBaseValue = templates.reduce((sum, t) => sum + t.baseServiceValue, 0);
    const totalCommissionValue = templates.reduce((sum, t) => sum + t.partnerCommissionValue, 0);
    const totalFinalPrice = templates.reduce((sum, t) => sum + t.finalClientPrice, 0);
    return { totalBaseValue, totalCommissionValue, totalFinalPrice };
  }, [templates]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText />
            Detalhes da Parceria: {partnerName}
          </DialogTitle>
          <DialogDescription>
            Resumo dos serviços, comissões e valores acordados para esta parceria.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
            <div id="partnership-details-print-area">
                <h1 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Parceria Comercial: {partnerName}</h1>
                <p style={{marginBottom: '1.5rem', color: '#555'}}>Este documento detalha os valores e comissões para os serviços prestados em parceria.</p>

                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead className="text-right">Seu Valor (Base)</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                        <TableHead className="text-right">Imposto</TableHead>
                        <TableHead className="text-right font-bold">Preço Final Cliente</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {templates.map((template) => {
                        const commissionValue = template.baseServiceValue * (template.commissionPercentage / 100);
                        const subtotal = template.baseServiceValue + commissionValue;
                        const taxValue = subtotal * (template.taxPercentage / 100);

                        return (
                        <TableRow key={template.id}>
                            <TableCell>
                                <p className="font-medium">{template.serviceName || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{template.name}</p>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(template.baseServiceValue)}</TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(commissionValue)}
                                <span className='text-muted-foreground text-xs ml-1'>({template.commissionPercentage}%)</span>
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(taxValue)}
                                <span className='text-muted-foreground text-xs ml-1'>({template.taxPercentage}%)</span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">{formatCurrency(template.finalClientPrice)}</TableCell>
                        </TableRow>
                        );
                    })}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell className="font-bold">Totais</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totals.totalBaseValue)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totals.totalCommissionValue)}</TableCell>
                            <TableCell colSpan={1}></TableCell>
                            <TableCell className="text-right font-extrabold text-lg text-primary">{formatCurrency(totals.totalFinalPrice)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </ScrollArea>
        <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir / Salvar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
