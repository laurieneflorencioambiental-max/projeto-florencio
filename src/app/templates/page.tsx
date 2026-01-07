'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';

const getSavedTemplates = (): ProposalTemplate[] => {
  try {
    const savedTemplates = localStorage.getItem('proposalTemplates');
    if (savedTemplates) {
      return JSON.parse(savedTemplates);
    }
  } catch (error) {
    console.error('Failed to parse templates from localStorage:', error);
  }
  // If nothing is saved, initialize with default and save it.
  try {
    localStorage.setItem(
      'proposalTemplates',
      JSON.stringify(defaultProposalTemplates)
    );
  } catch (error) {
    console.error('Failed to save default templates to localStorage:', error);
  }
  return defaultProposalTemplates;
};

const saveTemplates = (templates: ProposalTemplate[]) => {
  try {
    localStorage.setItem('proposalTemplates', JSON.stringify(templates));
  } catch (error) {
    console.error('Failed to save templates to localStorage:', error);
  }
};

const emptyTemplate: Omit<ProposalTemplate, 'id' | 'name'> = {
  proposalObject: '',
  serviceScope: '',
  clientResponsibilities: '',
  contractorResponsibilities: '',
  deadline: '',
  strategicVision: '',
  investment: '',
};

export default function ManageTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateData, setNewTemplateData] = useState(emptyTemplate);

  const [editingTemplate, setEditingTemplate] =
    useState<ProposalTemplate | null>(null);

  const loadTemplates = useCallback(() => {
    setTemplates(getSavedTemplates());
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleAddTemplate = () => {
    if (newTemplateName.trim() === '' || newTemplateData.proposalObject.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome e o objeto da proposta são obrigatórios.',
      });
      return;
    }
    const newId = `template-${Date.now()}`;
    const currentTemplates = getSavedTemplates();
    const newFullTemplate: ProposalTemplate = {
        id: newId,
        name: newTemplateName,
        ...newTemplateData,
    };
    const updatedTemplates = [...currentTemplates, newFullTemplate];
    saveTemplates(updatedTemplates);
    loadTemplates(); // Re-load from storage
    setNewTemplateName('');
    setNewTemplateData(emptyTemplate);
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
      editingTemplate.proposalObject.trim() === ''
    ) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome e o objeto da proposta não podem ser vazios.',
      });
      return;
    }
    const currentTemplates = getSavedTemplates();
    const updatedTemplates = currentTemplates.map(t =>
      t.id === editingTemplate.id ? editingTemplate : t
    );
    saveTemplates(updatedTemplates);
    loadTemplates(); // Re-load from storage
    setEditingTemplate(null);
    toast({ title: 'Sucesso', description: 'Modelo de proposta atualizado.' });
  };

  const handleDeleteTemplate = (id: string) => {
    const currentTemplates = getSavedTemplates();
    const updatedTemplates = currentTemplates.filter(t => t.id !== id);
    saveTemplates(updatedTemplates);
    loadTemplates(); // Re-load from storage
    toast({ title: 'Sucesso', description: 'Modelo de proposta removido.' });
  };

  const handleDuplicateTemplate = (template: ProposalTemplate) => {
    const newId = `template-${Date.now()}`;
    const duplicatedTemplate = {
      ...template,
      id: newId,
      name: `${template.name} (Cópia)`,
    };
    const currentTemplates = getSavedTemplates();
    const updatedTemplates = [...currentTemplates, duplicatedTemplate];
    saveTemplates(updatedTemplates);
    loadTemplates(); // Re-load from storage
    toast({
      title: 'Sucesso',
      description: `Modelo "${template.name}" duplicado.`,
    });
  };

  const renderFormField = (label: string, fieldName: keyof Omit<ProposalTemplate, 'id'|'name'>, value: string, onChange: (value: string) => void) => (
    <div className="space-y-2">
        <Label htmlFor={`template-${fieldName}`}>{label}</Label>
        <Textarea
            id={`template-${fieldName}`}
            placeholder={`Conteúdo para "${label}"`}
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={fieldName === 'proposalObject' ? 5 : 3}
        />
    </div>
  );


  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-template-name">Nome do Modelo</Label>
            <Input
              id="new-template-name"
              placeholder="Ex: Treinamento NR-35"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
            />
          </div>
          {renderFormField('Objeto da Proposta', 'proposalObject', newTemplateData.proposalObject, (val) => setNewTemplateData(p => ({...p, proposalObject: val})))}
          {renderFormField('Escopo do Serviço', 'serviceScope', newTemplateData.serviceScope, (val) => setNewTemplateData(p => ({...p, serviceScope: val})))}
          {renderFormField('Da Contratante', 'clientResponsibilities', newTemplateData.clientResponsibilities, (val) => setNewTemplateData(p => ({...p, clientResponsibilities: val})))}
          {renderFormField('Da Contratada', 'contractorResponsibilities', newTemplateData.contractorResponsibilities, (val) => setNewTemplateData(p => ({...p, contractorResponsibilities: val})))}
          {renderFormField('Prazo para Realização dos Serviços', 'deadline', newTemplateData.deadline, (val) => setNewTemplateData(p => ({...p, deadline: val})))}
          {renderFormField('Investimento', 'investment', newTemplateData.investment, (val) => setNewTemplateData(p => ({...p, investment: val})))}
          {renderFormField('Nossa Visão Estratégica', 'strategicVision', newTemplateData.strategicVision, (val) => setNewTemplateData(p => ({...p, strategicVision: val})))}

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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {templates.map(template => (
              <Card
                key={template.id}
                className="flex flex-col"
              >
                {editingTemplate?.id === template.id ? (
                  <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                    <div className="space-y-2">
                      <Label>Nome do Modelo</Label>
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
                     {renderFormField('Objeto da Proposta', 'proposalObject', editingTemplate.proposalObject, (val) => setEditingTemplate(p => p && {...p, proposalObject: val}))}
                     {renderFormField('Escopo do Serviço', 'serviceScope', editingTemplate.serviceScope, (val) => setEditingTemplate(p => p && ({...p, serviceScope: val})))}
                     {renderFormField('Da Contratante', 'clientResponsibilities', editingTemplate.clientResponsibilities, (val) => setEditingTemplate(p => p && ({...p, clientResponsibilities: val})))}
                     {renderFormField('Da Contratada', 'contractorResponsibilities', editingTemplate.contractorResponsibilities, (val) => setEditingTemplate(p => p && ({...p, contractorResponsibilities: val})))}
                     {renderFormField('Prazo para Realização dos Serviços', 'deadline', editingTemplate.deadline, (val) => setEditingTemplate(p => p && ({...p, deadline: val})))}
                     {renderFormField('Investimento', 'investment', editingTemplate.investment, (val) => setEditingTemplate(p => p && ({...p, investment: val})))}
                     {renderFormField('Nossa Visão Estratégica', 'strategicVision', editingTemplate.strategicVision, (val) => setEditingTemplate(p => p && ({...p, strategicVision: val})))}

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
                      <div className="text-sm text-muted-foreground p-4 rounded-md bg-muted/50 border space-y-4 h-96 overflow-y-auto">
                        <div>
                            <h4 className='font-bold text-foreground'>Objeto da Proposta</h4>
                            <p className="whitespace-pre-wrap">{template.proposalObject}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Escopo do Serviço</h4>
                            <p className="whitespace-pre-wrap">{template.serviceScope}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Da Contratante</h4>
                            <p className="whitespace-pre-wrap">{template.clientResponsibilities}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Da Contratada</h4>
                            <p className="whitespace-pre-wrap">{template.contractorResponsibilities}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Prazo</h4>
                            <p className="whitespace-pre-wrap">{template.deadline}</p>
                        </div>
                        <div>
                            <h4 className='font-bold text-foreground'>Investimento</h4>
                            <p className="whitespace-pre-wrap">{template.investment}</p>
                        </div>
                         <div>
                            <h4 className='font-bold text-foreground'>Visão Estratégica</h4>
                            <p className="whitespace-pre-wrap">{template.strategicVision}</p>
                        </div>
                      </div>
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
