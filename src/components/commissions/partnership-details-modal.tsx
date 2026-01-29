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
} from '@/components/ui/table';
import { Printer, FileText, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


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
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleGenerateLink = async (openInNewTab: boolean = false) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de Conexão' });
      return;
    }
    setIsGeneratingLink(true);
    try {
      const partnershipData = {
        partnerName,
        templates,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(firestore, 'partnerships'), partnershipData);
      const link = `${window.location.origin}/partnership/${docRef.id}`;
      
      if (openInNewTab) {
        window.open(link, '_blank');
        toast({
          title: 'Link gerado com sucesso!',
          description: 'A página de detalhes da parceria foi aberta em uma nova aba.',
        });
      } else {
        await navigator.clipboard.writeText(link);
        toast({
          title: 'Link copiado!',
          description: 'O link para compartilhar foi copiado para a área de transferência.',
        });
      }
    } catch (error) {
      console.error('Error generating partnership link:', error);
      toast({ variant: 'destructive', title: 'Erro ao gerar link' });
    } finally {
      setIsGeneratingLink(false);
    }
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
                </Table>
                
                <div style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <h2 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Observação Importante</h2>
                    <p style={{ fontSize: '0.8rem', color: '#555', lineHeight: '1.5' }}>
                        A comissão do parceiro é calculada sobre o <strong>"Seu Valor (Base)"</strong>. O "Preço Final Cliente" já inclui o valor do imposto, que é um repasse governamental e não compõe a base de cálculo da comissão.
                    </p>
                </div>
            </div>
        </ScrollArea>
        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => handleGenerateLink(true)} disabled={isGeneratingLink}>
            {isGeneratingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
            Gerar e Abrir Link
          </Button>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir / Salvar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
