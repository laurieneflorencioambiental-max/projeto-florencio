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
import { FileText, Link as LinkIcon, Loader2, Send, FileDown } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const formatCurrency = (value: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const generateLink = async (): Promise<string | null> => {
    if (!firestore) return null;
    try {
      const newDocRef = doc(collection(firestore, 'partnerships'));
      const partnershipData = {
        id: newDocRef.id,
        partnerName,
        templates,
        createdAt: serverTimestamp(),
      };
      await setDoc(newDocRef, partnershipData);
      return `${window.location.origin}/partnership/${newDocRef.id}`;
    } catch (error) {
      console.error('Error generating partnership link:', error);
      toast({ variant: 'destructive', title: 'Erro ao gerar link' });
      return null;
    }
  };

  const handleOpenLink = async () => {
    setIsGeneratingLink(true);
    const link = await generateLink();
    setIsGeneratingLink(false);
    if (link) {
        window.open(link, '_blank');
        toast({
            title: 'Link gerado com sucesso!',
            description: 'A página foi aberta em uma nova aba.',
        });
    }
  };

  const handleSendWhatsapp = async () => {
    const partnerWhatsapp = templates.length > 0 ? templates[0].partnerWhatsapp?.replace(/\D/g, '') : null;
    if (!partnerWhatsapp) {
      toast({
        variant: 'destructive',
        title: 'WhatsApp não encontrado',
        description: 'Cadastre o número de WhatsApp do parceiro para usar esta função.',
      });
      return;
    }

    setIsGeneratingLink(true);
    const link = await generateLink();
    setIsGeneratingLink(false);

    if (link) {
      const text = `Olá, ${partnerName}!\n\nSegue o detalhamento da nossa parceria comercial, com os valores e comissões para os serviços que podemos oferecer juntos.\n\nClique no link para ver os detalhes: ${link}\n\nQualquer dúvida, estou à disposição!\n\nAtenciosamente,\nGrupo Florencio`;
      const url = `https://wa.me/${partnerWhatsapp}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('partnership-details-print-area');
    if (!element) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: 'Não foi possível encontrar o conteúdo para conversão.' });
        return;
    }
    
    setIsGeneratingPdf(true);

    try {
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;
        
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`Parceria-${partnerName.replace(/\s+/g, '-')}.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: 'Houve um problema durante a criação do arquivo.' });
    } finally {
        setIsGeneratingPdf(false);
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
                <p style={{marginBottom: '0.5rem', color: '#555'}}>Este documento detalha os valores e comissões para os serviços prestados em parceria.</p>
                 <p style={{marginBottom: '1.5rem', color: '#888', fontStyle: 'italic', fontSize: '0.8rem'}}>Atenção: Os valores apresentados podem sofrer alterações de acordo com as taxas e percentuais vigentes à época da prestação do serviço. Consulte sempre as condições atualizadas.</p>

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
          <Button onClick={handleOpenLink} disabled={isGeneratingLink}>
            {isGeneratingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
            Gerar e Abrir Link
          </Button>
           <Button onClick={handleSendWhatsapp} disabled={isGeneratingLink}>
            {isGeneratingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar WhatsApp
          </Button>
          <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Salvar como PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
