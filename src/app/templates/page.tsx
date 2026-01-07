'use client';

import { useState, useEffect } from 'react';
import type { ProposalTemplate } from '@/lib/types';
import { proposalTemplates as defaultProposalTemplates } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle, Save, Pencil, X, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';

export default function ManageTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    content: string;
  }>({ name: '', content: '' });
  const [editingTemplate, setEditingTemplate] =
    useState<ProposalTemplate | null>(null);

  // Load templates from localStorage on initial mount
  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem('proposalTemplates');
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      } else {
        // Only set default templates if nothing is in localStorage
        setTemplates(defaultProposalTemplates);
      }
    } catch (error) {
      console.error('Failed to access localStorage:', error);
      // Fallback to default templates in case of error
      setTemplates(defaultProposalTemplates);
    }
  }, []);

  // Save templates to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('proposalTemplates', JSON.stringify(templates));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [templates]);

  const handleAddTemplate = () => {
    if (newTemplate.name.trim() === '' || newTemplate.content.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome e o conteúdo do modelo são obrigatórios.',
      });
      return;
    }
    const newId = `template-${Date.now()}`;
    setTemplates([...templates, { id: newId, ...newTemplate }]);
    setNewTemplate({ name: '', content: '' });
    toast({
      title: 'Sucesso',
      description: 'Novo modelo de proposta adicionado.',
    });
  };

  const handleStartEditing = (template: ProposalTemplate) => {
    setEditingTemplate({ ...template });
  };

  const handleCancelEditing = () => {
    setEditingTemplate(null);
  };

  const handleUpdateTemplate = () => {
    if (
      !editingTemplate ||
      editingTemplate.name.trim() === '' ||
      editingTemplate.content.trim() === ''
    ) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome e o conteúdo do modelo não podem ser vazios.',
      });
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

  const handleDuplicateTemplate = (template: ProposalTemplate) => {
    const newId = `template-${Date.now()}`;
    const duplicatedTemplate = {
      ...template,
      id: newId,
      name: `${template.name} (Cópia)`,
    };
    setTemplates([...templates, duplicatedTemplate]);
    toast({
      title: 'Sucesso',
      description: `Modelo "${template.name}" duplicado.`,
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-template-name">Nome do Modelo</label>
            <Input
              id="new-template-name"
              placeholder="Ex: Treinamento NR-35"
              value={newTemplate.name}
              onChange={e =>
                setNewTemplate({ ...newTemplate, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="new-template-content">
              Conteúdo do Modelo (Objeto da Proposta)
            </label>
            <Textarea
              id="new-template-content"
              placeholder="A presente proposta tem por objeto a prestação de serviços de..."
              value={newTemplate.content}
              onChange={e =>
                setNewTemplate({ ...newTemplate, content: e.target.value })
              }
              rows={5}
            />
          </div>
          <Button onClick={handleAddTemplate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Modelo
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-headline font-semibold mb-4">
          Modelos Existentes
        </h2>
        {templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum modelo cadastrado.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(template => (
              <Card
                key={template.id}
                className="flex flex-col"
              >
                {editingTemplate?.id === template.id ? (
                  <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                    <div className="space-y-2">
                      <label>Nome do Modelo</label>
                      <Input
                        value={editingTemplate.name}
                        onChange={e =>
                          setEditingTemplate({
                            ...editingTemplate,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label>Conteúdo</label>
                      <Textarea
                        value={editingTemplate.content}
                        onChange={e =>
                          setEditingTemplate({
                            ...editingTemplate,
                            content: e.target.value,
                          })
                        }
                        rows={10}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="ghost" onClick={handleCancelEditing}>
                        <X className="mr-2 h-4 w-4" /> Cancelar
                      </Button>
                      <Button onClick={handleUpdateTemplate}>
                        <Save className="mr-2 h-4 w-4" /> Salvar
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle className="truncate">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                      <p className="text-sm text-muted-foreground p-4 rounded-md bg-muted/50 border whitespace-pre-wrap h-48 overflow-y-auto flex-1">
                        {template.content}
                      </p>
                      <div className="flex justify-end gap-2 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEditing(template)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Você tem certeza?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. Isso excluirá
                                permanentemente o modelo "
                                <span className="font-bold">{template.name}</span>
                                ".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
