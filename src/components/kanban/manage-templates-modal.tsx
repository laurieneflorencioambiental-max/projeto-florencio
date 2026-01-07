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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Trash2, PlusCircle, Save } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Gerenciar Modelos de Proposta</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova seus modelos de proposta.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <h3 className="text-lg font-medium">Adicionar Novo Modelo</h3>
          <div className="grid gap-2">
            <Input
              placeholder="Nome do novo modelo (ex: Treinamento NR-35)"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            />
            <Textarea
              placeholder="Conteúdo do modelo..."
              value={newTemplate.content}
              onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
              rows={5}
            />
            <Button onClick={handleAddTemplate} size="sm" className="justify-self-start">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Modelo
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 mt-4 border-t pt-4">
          <h3 className="text-lg font-medium mb-2">Modelos Existentes</h3>
           {templates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum modelo cadastrado.</p>
           ): (
          <Accordion type="single" collapsible className="w-full">
            {templates.map(template => (
              <AccordionItem value={template.id} key={template.id}>
                <AccordionTrigger>{template.name}</AccordionTrigger>
                <AccordionContent>
                  {editingTemplate?.id === template.id ? (
                     <div className="flex flex-col gap-2">
                        <Input
                            value={editingTemplate.name}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                            className="font-bold"
                        />
                        <Textarea
                            value={editingTemplate.content}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                            rows={8}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button variant="ghost" onClick={handleCancelEditing}>Cancelar</Button>
                            <Button onClick={handleUpdateTemplate}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
                        </div>
                     </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap p-2 rounded-md bg-muted/50">
                        {template.content}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleStartEditing(template)}>
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                           <Trash2 className="mr-2 h-4 w-4" />
                           Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
           )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
