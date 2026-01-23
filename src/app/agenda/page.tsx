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
  ExternalLink,
  Clock,
  Calendar as CalendarIcon,
  PlusCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Meeting {
  id: number;
  title: string;
  date: Date;
  time: string;
  description: string;
}

export default function AgendaPage() {
  const { toast } = useToast();
  // State for the form
  const [newMeetingDate, setNewMeetingDate] = useState<Date | undefined>();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('09:00');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle || !newMeetingDate || !newMeetingTime) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor, preencha o título, data e horário da reunião.',
      });
      return;
    }

    const newMeeting: Meeting = {
      id: Date.now(),
      title: newMeetingTitle,
      date: newMeetingDate,
      time: newMeetingTime,
      description: newMeetingDescription,
    };
    setMeetings(
      [...meetings, newMeeting].sort(
        (a, b) =>
          new Date(`${format(a.date, 'yyyy-MM-dd')}T${a.time}`).getTime() -
          new Date(`${format(b.date, 'yyyy-MM-dd')}T${b.time}`).getTime()
      )
    );

    // Generate Google Calendar URL
    const [hour, minute] = newMeetingTime.split(':').map(Number);
    const startDate = new Date(newMeetingDate);
    startDate.setHours(hour, minute, 0, 0);

    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Assume 1 hour duration

    const toGoogleISOString = (date: Date) =>
      date.toISOString().replace(/-|:|\.\d{3}/g, '');

    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      newMeeting.title
    )}&dates=${toGoogleISOString(startDate)}/${toGoogleISOString(
      endDate
    )}&details=${encodeURIComponent(newMeeting.description)}`;

    toast({
      title: 'Reunião Agendada!',
      description: 'Sua reunião foi adicionada com sucesso.',
      action: (
        <Button asChild variant="outline">
          <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir no Google Agenda
          </a>
        </Button>
      ),
    });

    // Reset form
    setNewMeetingTitle('');
    setNewMeetingDescription('');
    setNewMeetingTime('09:00');
    setNewMeetingDate(undefined);
  };

  const groupedMeetings = useMemo(() => {
    return meetings.reduce((acc, meeting) => {
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
          <CardTitle>Adicionar Nova Reunião</CardTitle>
          <CardDescription>
            Preencha os detalhes para agendar uma nova reunião.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMeeting} className="space-y-4">
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
              <Label htmlFor="meeting-description">
                Descrição (Opcional)
              </Label>
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
            <Button type="submit">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Reunião
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas Reuniões</CardTitle>
          <CardDescription>
            Visualize todas as reuniões agendadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {sortedDateKeys.length > 0 ? (
              sortedDateKeys.map((dateKey) => (
                <div key={dateKey}>
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                    {format(new Date(dateKey), 'PPP', { locale: ptBR })}
                  </h3>
                  <div className="space-y-4">
                    {groupedMeetings[dateKey].map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-semibold">{meeting.title}</p>
                          <div className="flex items-center gap-1 text-sm text-primary font-medium">
                            <Clock className="h-4 w-4" />
                            <span>{meeting.time}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {meeting.description}
                        </p>
                      </div>
                    ))}
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
