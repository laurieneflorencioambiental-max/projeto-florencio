'use client';

import { useState } from 'react';
import type { ProposalTemplate } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle, Save, Pencil, X } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

type ManageTemplatesModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  templates: ProposalTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ProposalTemplate[]>>;
};

export default function ManageTemplatesModal({
  isOpen,
  onOpenChange,
  templates,
  setTemplates,
}: ManageTemplatesModalProps) {
  const { toast } = useToast();
  const [newTemplate, setNewTemplate] = useState<{ name: string; content: string }>({ name: '', content: '' });
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);

  const handleAddTemplate = () => {
    if (newTemplate.name.trim() === '' || newTemplate.content.trim() === '') {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome e o conteúdo do modelo são obrigatórios.' });
      return;
    }
    const newId = `template-${Date.now()}`;
    setTemplates([...templates, { id: newId, ...newTemplate }]);
    setNewTemplate({ name: '', content: '' });
    toast({ title: 'Sucesso', description: 'Novo modelo de proposta adicionado.' });
  };
  
  const handleStartEditing = (template: ProposalTemplate) => {
    setEditingTemplate({ ...template });
  };

  const handleCancelEditing = () => {
    setEditingTemplate(null);
  }

  const handleUpdateTemplate = () => {
    if (!editingTemplate || editingTemplate.name.trim() === '' || editingTemplate.content.trim() === '') {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome e o conteúdo do modelo não podem ser vazios.' });
      return;
    }
    setTemplates(
      templates.map(t => (t.id === editingTemplate.id ? editingTemplate : t))
    );
    setEditingTemplate(null);
    toast({ title: 'Sucesso', description: 'Modelo de proposta atualizado.' });
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast({ title: 'Sucesso', description: 'Modelo de proposta removido.' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setEditingTemplate(null);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Gerenciar Modelos de Proposta</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova seus modelos de proposta.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b pb-4">
          <h3 className="text-lg font-medium mb-2">Adicionar Novo Modelo</h3>
          <div className="grid gap-2">
            <Input
              placeholder="Nome do novo modelo (ex: Treinamento NR-35)"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            />
            <Textarea
              placeholder="Conteúdo do modelo... (Este texto será o 'Objeto da Proposta')"
              value={newTemplate.content}
              onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
              rows={5}
              className="bg-muted/50"
            />
            <Button onClick={handleAddTemplate} size="sm" className="justify-self-start">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Modelo
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 mt-4">
          <h3 className="text-lg font-medium mb-2">Modelos Existentes</h3>
           {templates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum modelo cadastrado.</p>
           ): (
            <div className="space-y-4">
              {templates.map(template => (
                <div key={template.id} className="p-4 border rounded-lg bg-card">
                  {editingTemplate?.id === template.id ? (
                     <div className="flex flex-col gap-2">
                        <label className='text-sm font-medium'>Nome do Modelo</label>
                        <Input
                            value={editingTemplate.name}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        />
                        <label className='text-sm font-medium mt-2'>Conteúdo do Modelo (Objeto da Proposta)</label>
                        <Textarea
                            value={editingTemplate.content}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                            rows={10}
                            className="bg-muted/50"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button variant="ghost" onClick={handleCancelEditing}>Cancelar</Button>
                            <Button onClick={handleUpdateTemplate}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
                        </div>
                     </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h4 className="font-semibold">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mt-2 p-4 rounded-md bg-muted/50 border whitespace-pre-wrap">
                          {template.content}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleStartEditing(template)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                           <Trash2 className="mr-2 h-4 w-4" />
                           Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
           )}
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
