'use client';

import { useState, useEffect } from 'react';
import type { Service, PricingTemplate } from '@/lib/types';
import { serviceSchema } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle, Save, Pencil, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const catalogFormSchema = serviceSchema.omit({ id: true });

export default function CatalogPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const servicesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
  const { data: services, isLoading: areServicesLoading } = useCollection<Service>(servicesCollectionRef);
  
  const pricingTemplatesRef = useMemoFirebase(() => firestore ? collection(firestore, 'pricing-templates') : null, [firestore]);
  const { data: pricingTemplates, isLoading: areTemplatesLoading } = useCollection<PricingTemplate>(pricingTemplatesRef);

  const form = useForm<z.infer<typeof catalogFormSchema>>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: { service: '', description: '', value: 0 },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const resetForm = () => {
    form.reset({ service: '', description: '', value: 0 });
    setEditingServiceId(null);
  };

  const handleSaveService = async (data: z.infer<typeof catalogFormSchema>) => {
    if (!firestore) return;

    if (editingServiceId) {
      const serviceRef = doc(firestore, 'services', editingServiceId);
      const serviceWithId: Service = { id: editingServiceId, ...data };
      await setDoc(serviceRef, serviceWithId, { merge: true });
      toast({ title: 'Sucesso', description: 'Serviço atualizado no catálogo.' });
    } else {
      const newDocRef = doc(servicesCollectionRef!);
      const serviceWithId: Service = { id: newDocRef.id, ...data };
      await setDoc(newDocRef, serviceWithId);
      toast({ title: 'Sucesso', description: 'Novo serviço adicionado ao catálogo.' });
    }
    resetForm();
  };
  
  const handleStartEditing = (service: Service) => {
    setEditingServiceId(service.id);
    form.reset(service);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteService = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'services', id));
    if (id === editingServiceId) {
      resetForm();
    }
    toast({ title: 'Sucesso', description: 'Serviço removido do catálogo.' });
  };

  const formatCurrency = (value: number) => {
    if (!value && value !== 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  if (isUserLoading || !user || areServicesLoading || areTemplatesLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{editingServiceId ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</CardTitle>
          <CardDescription>
            Gerencie os itens do seu catálogo de serviços.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveService)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="service" render={({ field }) => (<FormItem><Label>Nome do Serviço</Label><FormControl><Input placeholder="Ex: ASO Clínico" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><Label>Descrição</Label><FormControl><Input placeholder="Ex: Exame Admissional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem>
                    <Label>Valor Padrão (R$)</Label>
                    <FormControl>
                      <Input type="number" placeholder="50.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end items-center flex-wrap gap-2 pt-4">
                <div className="flex-1 flex justify-end gap-2">
                    {editingServiceId && (<Button type="button" variant="ghost" onClick={resetForm}><X className="mr-2 h-4 w-4" /> Cancelar Edição</Button>)}
                    <Button type="submit">
                      {editingServiceId ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      {editingServiceId ? 'Salvar Alterações' : 'Adicionar Serviço'}
                    </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Serviços Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor Padrão</TableHead>
                <TableHead className="w-[100px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services && services.length > 0 ? (
                services.map(service => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.service}</TableCell>
                    <TableCell>{service.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(service.value)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleStartEditing(service)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Isso excluirá permanentemente o serviço "<span className="font-bold">{service.service}</span>".</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteService(service.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum serviço cadastrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
