'use client';

import { useRef } from 'react';
import type { Lead } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ProposalModalProps = {
  lead: Lead;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateLead: (lead: Lead) => void;
};

export default function ProposalModal({
  lead,
  isOpen,
  onOpenChange,
  onUpdateLead,
}: ProposalModalProps) {
  const proposalRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const handleDownloadPdf = () => {
    const input = proposalRef.current;
    if (input) {
      onUpdateLead({ ...lead, proposalGeneratedCount: (lead.proposalGeneratedCount || 0) + 1 });
      html2canvas(input, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`proposta-${lead.company.toLowerCase().replace(/ /g, '-')}.pdf`);
      });
    }
  };

  const handleSendWhatsApp = () => {
    onUpdateLead({ ...lead, whatsappSentCount: (lead.whatsappSentCount || 0) + 1 });
    const message = `Olá ${lead.name}, segue a proposta para a empresa ${lead.company}. Estamos à disposição para qualquer esclarecimento.`;
    const whatsappUrl = `https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    // Idealmente, aqui você também anexaria o PDF, o que é complexo via link direto.
    // Uma alternativa é primeiro salvar o PDF e depois enviá-lo manualmente.
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Gerador de Proposta</DialogTitle>
          <DialogDescription>
            Visualize, edite e envie a proposta para {lead.company}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-md">
          <div ref={proposalRef} className="p-8 bg-white dark:bg-black text-black dark:text-white" id="proposal-content">
            {/* Cabeçalho da Proposta */}
            <header className="flex justify-between items-center pb-4 border-b">
              <div>
                 <h1 className="text-2xl font-bold text-primary">Grupo Florencio</h1>
                 <p className="text-sm">Soluções em Segurança do Trabalho</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold">Proposta Comercial</h2>
                <p className="text-sm">Data: {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </header>

            {/* Informações do Cliente */}
            <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Para:</h3>
                <p className="font-bold">{lead.company}</p>
                <p>A/C: {lead.name}{lead.role && `, ${lead.role}`}</p>
                <p>CNPJ: {lead.cnpj}</p>
                <p>Email: {lead.email}</p>
                <p>WhatsApp: {lead.whatsapp}</p>
            </section>

            {/* Corpo da Proposta */}
            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 border-b pb-2">Objeto da Proposta</h3>
              <div
                contentEditable
                suppressContentEditableWarning
                className="prose dark:prose-invert max-w-none p-2 bg-gray-50 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                dangerouslySetInnerHTML={{ __html: lead.proposalSummary.replace(/\n/g, '<br />') }}
              />
            </section>
            
            {/* Investimento */}
            <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Investimento</h3>
                 <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                    <p className="text-lg">Valor Total:</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(lead.value)}</p>
                </div>
            </section>
            
            {/* Condições de Pagamento */}
            <section className="my-8">
                 <h3 className="text-lg font-semibold mb-2 border-b pb-2">Condições de Pagamento</h3>
                 <ul className="list-disc list-inside space-y-2">
                    {lead.paymentMethods.map((pm, index) => (
                        <li key={index}>
                            {pm.method}
                            {pm.method.includes('Crédito') && pm.cardFee && (
                                <span className="text-sm text-gray-600 dark:text-gray-400"> (taxa de {pm.cardFee}% inclusa)</span>
                            )}
                        </li>
                    ))}
                </ul>
            </section>
            
            {/* Rodapé */}
            <footer className="text-center pt-8 border-t mt-8">
              <p className="font-bold">Grupo Florencio</p>
              <p className="text-xs">contato@grupoflorencio.com.br | (11) 99999-8888</p>
              <p className="text-xs">www.grupoflorencio.com.br</p>
            </footer>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 flex-wrap">
          <p className="text-xs text-muted-foreground text-left flex-1 mr-auto">O resumo da proposta é editável. Clique no texto para alterar.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button onClick={handleSendWhatsApp}>
              <Send className="mr-2 h-4 w-4" />
              Enviar via WhatsApp
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
