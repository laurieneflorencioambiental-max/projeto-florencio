'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Clock,
  Calendar as CalendarIcon,
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface Meeting {
  id: number;
  title: string;
  date: Date;
  time: string;
  description: string;
  status: 'agendada' | 'realizada';
}

export default function AgendaPage() {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // State for the form
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState<Date | undefined>();
  const [newMeetingTime, setNewMeetingTime] = useState('09:00');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');

  // State for editing
  const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle || !newMeetingDate || !newMeetingTime) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor, preencha o título, data e horário da reunião.',
      });
      return;
    }

    if (editingMeetingId) {
      setMeetings(
        meetings.map(m =>
          m.id === editingMeetingId
            ? {
                ...m,
                title: newMeetingTitle,
                date: newMeetingDate,
                time: newMeetingTime,
                description: newMeetingDescription,
              }
            : m
        )
      );
      toast({
        title: 'Reunião Atualizada!',
        description: 'Os detalhes da reunião foram salvos.',
      });
    } else {
      const newMeeting: Meeting = {
        id: Date.now(),
        title: newMeetingTitle,
        date: newMeetingDate,
        time: newMeetingTime,
        description: newMeetingDescription,
        status: 'agendada',
      };
      setMeetings([...meetings, newMeeting]);
      toast({
        title: 'Reunião Agendada!',
        description: 'Sua reunião foi adicionada com sucesso.',
      });
    }
    handleCancelEditing();
  };
  
  const handleStartEditing = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id);
    setNewMeetingTitle(meeting.title);
    setNewMeetingDate(meeting.date);
    setNewMeetingTime(meeting.time);
    setNewMeetingDescription(meeting.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditing = () => {
    setEditingMeetingId(null);
    setNewMeetingTitle('');
    setNewMeetingDescription('');
    setNewMeetingTime('09:00');
    setNewMeetingDate(undefined);
  };
  
  const handleDeleteMeeting = (id: number) => {
    setMeetings(meetings.filter(m => m.id !== id));
    toast({
      title: 'Reunião Removida',
      description: 'A reunião foi excluída da sua agenda.',
    });
  };

  const handleToggleStatus = (id: number) => {
    setMeetings(
      meetings.map(m =>
        m.id === id
          ? {
              ...m,
              status: m.status === 'agendada' ? 'realizada' : 'agendada',
            }
          : m
      )
    );
  };


  const groupedMeetings = useMemo(() => {
    const sorted = [...meetings].sort(
        (a, b) =>
          new Date(`${format(a.date, 'yyyy-MM-dd')}T${a.time}`).getTime() -
          new Date(`${format(b.date, 'yyyy-MM-dd')}T${b.time}`).getTime()
      );
    return sorted.reduce((acc, meeting) => {
      const dateKey = format(meeting.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(meeting);
      return acc;
    }, {} as Record<string, Meeting[]>);
  }, [meetings]);

  const sortedDateKeys = useMemo(
    () => Object.keys(groupedMeetings).sort(),
    [groupedMeetings]
  );

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingMeetingId ? 'Editar Reunião' : 'Adicionar Nova Reunião'}
          </CardTitle>
          <CardDescription>
            {editingMeetingId
              ? 'Altere os detalhes da reunião selecionada.'
              : 'Preencha os detalhes para agendar uma nova reunião.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Título da Reunião</Label>
              <Input
                id="meeting-title"
                placeholder="Ex: Alinhamento Semanal de Marketing"
                value={newMeetingTitle}
                onChange={(e) => setNewMeetingTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-description">Descrição (Opcional)</Label>
              <Textarea
                id="meeting-description"
                placeholder="Ex: Discutir resultados da campanha do Instagram."
                value={newMeetingDescription}
                onChange={(e) => setNewMeetingDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="meeting-date">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="meeting-date"
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !newMeetingDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newMeetingDate ? (
                        format(newMeetingDate, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newMeetingDate}
                      onSelect={setNewMeetingDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-time">Horário</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={newMeetingTime}
                  onChange={(e) => setNewMeetingTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-2">
              {editingMeetingId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelEditing}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
              <Button type="submit">
                {editingMeetingId ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {editingMeetingId ? 'Salvar Alterações' : 'Adicionar Reunião'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas Reuniões</CardTitle>
          <CardDescription>
            Visualize, edite e acompanhe todas as reuniões agendadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {sortedDateKeys.length > 0 ? (
              sortedDateKeys.map(dateKey => (
                <div key={dateKey}>
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                    {format(new Date(dateKey), 'PPP', { locale: ptBR })}
                  </h3>
                  <div className="space-y-4">
                    {groupedMeetings[dateKey].map(meeting => {
                      const isCompleted = meeting.status === 'realizada';
                      const isOverdue =
                        isPast(meeting.date) &&
                        !isToday(meeting.date) &&
                        !isCompleted;

                      return (
                        <div
                          key={meeting.id}
                          className={cn(
                            'p-3 border rounded-lg transition-all',
                            isCompleted && 'bg-muted/40 opacity-70',
                            isOverdue && 'border-destructive/50 bg-destructive/10'
                          )}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                id={`completed-${meeting.id}`}
                                checked={isCompleted}
                                onCheckedChange={() => handleToggleStatus(meeting.id)}
                                aria-label="Marcar como realizada"
                              />
                              <div className="flex-1">
                                <p
                                  className={cn(
                                    'font-semibold',
                                    isCompleted && 'line-through'
                                  )}
                                >
                                  {meeting.title}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEditing(meeting)}
                                disabled={isCompleted}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                     <span className="sr-only">Excluir</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Tem certeza que deseja excluir esta reunião?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. A reunião "{meeting.title}" será removida permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteMeeting(meeting.id)}
                                    >
                                      Sim, Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          
                          <div className='pl-9'>
                            <div className="flex items-center gap-2 text-sm text-primary font-medium mt-1">
                              <Clock className="h-4 w-4" />
                              <span>{meeting.time}</span>
                            </div>
                          
                            {isOverdue && (
                              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <span>Esta reunião está vencida.</span>
                              </div>
                            )}

                            {isCompleted && (
                               <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold mt-2">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Reunião realizada.</span>
                              </div>
                            )}
                            
                            {meeting.description && (
                                <p className={cn("text-sm text-muted-foreground mt-2", isCompleted && 'line-through')}>
                                  {meeting.description}
                                </p>
                            )}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  Nenhuma reunião agendada.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use o formulário acima para adicionar uma nova reunião.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
