'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Pencil, Save, PlusCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

type ManageSellersModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sellers: string[];
  setSellers: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function ManageSellersModal({
  isOpen,
  onOpenChange,
  sellers,
  setSellers,
}: ManageSellersModalProps) {
  const { toast } = useToast();
  const [newSellerName, setNewSellerName] = useState('');
  const [editingSeller, setEditingSeller] = useState<{ index: number; name: string } | null>(null);

  const handleAddSeller = () => {
    if (newSellerName.trim() === '') {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome do vendedor não pode ser vazio.' });
      return;
    }
    if (sellers.includes(newSellerName.trim())) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Este vendedor já existe.' });
      return;
    }
    setSellers([...sellers, newSellerName.trim()]);
    setNewSellerName('');
    toast({ title: 'Sucesso', description: `Vendedor "${newSellerName.trim()}" adicionado.` });
  };

  const handleUpdateSeller = () => {
    if (!editingSeller) return;
    
    const updatedName = editingSeller.name.trim();

    if (updatedName === '') {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome do vendedor não pode ser vazio.' });
      return;
    }

    // Check if the new name already exists, excluding the original name at the same index
    const originalName = sellers[editingSeller.index];
    if (updatedName !== originalName && sellers.includes(updatedName)) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Este vendedor já existe.' });
        return;
    }


    const updatedSellers = [...sellers];
    updatedSellers[editingSeller.index] = updatedName;
    setSellers(updatedSellers);
    setEditingSeller(null);
    toast({ title: 'Sucesso', description: 'Nome do vendedor atualizado.' });
  };

  const handleDeleteSeller = (index: number) => {
    const sellerToDelete = sellers[index];
    const updatedSellers = sellers.filter((_, i) => i !== index);
    setSellers(updatedSellers);
    toast({ title: 'Sucesso', description: `Vendedor "${sellerToDelete}" removido.` });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Gerenciar Vendedores</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova vendedores da sua equipe.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2">
                <Input
                    id="new-seller"
                    placeholder="Nome do novo vendedor"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSeller()}
                />
                <Button onClick={handleAddSeller} size="icon">
                    <PlusCircle className="h-4 w-4" />
                    <span className="sr-only">Adicionar</span>
                </Button>
            </div>
            <ScrollArea className='h-64 border rounded-md p-2'>
                <div className='space-y-2'>
                {sellers.map((seller, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                        {editingSeller?.index === index ? (
                            <Input
                                value={editingSeller.name}
                                onChange={(e) => setEditingSeller({ ...editingSeller, name: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateSeller()}
                                autoFocus
                                className="h-9"
                            />
                        ) : (
                            <p className="flex-1 text-sm">{seller}</p>
                        )}
                        <div className="flex items-center gap-1">
                            {editingSeller?.index === index ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={handleUpdateSeller}>
                                    <Save className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSeller({ index, name: seller })}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o vendedor
                                        <span className="font-bold"> {seller}</span>.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSeller(index)}>Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ))}
                {sellers.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhum vendedor cadastrado.</p>
                )}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
