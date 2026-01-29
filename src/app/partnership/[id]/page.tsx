'use client';

import { useEffect, useState } from 'react';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import type { PartnershipDocument, AppSettings } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import '../../globals.css';

function PartnershipPageContent({ partnershipData, settings }: { partnershipData: PartnershipDocument, settings: Partial<AppSettings> }) {
    const { partnerName, templates } = partnershipData;

    const formatCurrency = (value: number) => {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        }).format(value);
    };

    return (
        <main className="bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 flex flex-col items-center">
            <div
                className="a4-page p-8 text-sm bg-white shadow-lg flex flex-col"
                style={{ color: '#596371', minHeight: '297mm' }}
            >
                <header className="flex justify-between items-center pb-4 border-b">
                    <div>
                        {settings.sidebarLogoUrl ? (
                        <img
                            src={settings.sidebarLogoUrl}
                            alt="Logo da Empresa"
                            className="h-16 w-auto object-contain"
                        />
                        ) : (
                        <h1 className="text-2xl font-bold" style={{ color: '#1b7689' }}>
                            Grupo Florencio
                        </h1>
                        )}
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold">Detalhes da Parceria</h2>
                        <p className="text-sm">
                        Data:{' '}
                        {new Date().toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </header>
                <section className="my-8">
                    <h3 className="text-lg font-semibold mb-2 border-b pb-2">Parceria Comercial com:</h3>
                    <p className="font-bold text-2xl" style={{ color: '#1b7689' }}>{partnerName}</p>
                    <p className="mt-2">Este documento detalha os valores e comissões para os serviços prestados em parceria.</p>
                </section>

                <div className="flex-grow">
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
                </div>

                <div className="mt-auto p-4 border-dashed border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <h4 className="font-bold">Observação Importante</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        A comissão do parceiro é calculada sobre o <strong>"Seu Valor (Base)"</strong>. O "Preço Final Cliente" já inclui o valor do imposto, que é um repasse governamental e não compõe a base de cálculo da comissão.
                    </p>
                </div>
            </div>
        </main>
    );
}


export default function PartnershipViewerPage() {
    const params = useParams();
    const [partnershipData, setPartnershipData] = useState<PartnershipDocument | null>(null);
    const [appSettings, setAppSettings] = useState<Partial<AppSettings>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const id = params.id as string;

    useEffect(() => {
        if (!id) {
          setIsLoading(false);
          setError('ID da parceria não encontrado.');
          return;
        }

        const fetchPartnershipData = async () => {
          setIsLoading(true);
          try {
            const { firestore } = initializeFirebase();

            const partnershipRef = doc(firestore, 'partnerships', id);
            const partnershipSnap = await getDoc(partnershipRef);

            if (!partnershipSnap.exists()) {
              setError('Parceria não encontrada.');
              setIsLoading(false);
              return;
            }

            const settingsRef = doc(firestore, 'app-settings', 'global');
            const settingsSnap = await getDoc(settingsRef);

            setPartnershipData(partnershipSnap.data() as PartnershipDocument);
            if (settingsSnap.exists()) {
                setAppSettings(settingsSnap.data() as AppSettings)
            }

          } catch (err) {
            console.error('Error fetching data:', err);
            setError('Ocorreu um erro ao carregar os detalhes da parceria.');
          } finally {
            setIsLoading(false);
          }
        };

        fetchPartnershipData();
    }, [id]);

    if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-destructive bg-background">
        {error}
      </div>
    );
  }

  if (!partnershipData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        Nenhuma parceria para exibir.
      </div>
    );
  }

  return <PartnershipPageContent partnershipData={partnershipData} settings={appSettings} />;
}
