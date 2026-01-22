'use client';

import { useState } from 'react';
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
import { ExternalLink, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Meeting {
  id: number;
  title: string;
  date: Date;
  time: string;
  description: string;
}

export default function AgendaPage() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('09:00');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle || !date || !newMeetingTime) return;

    const newMeeting: Meeting = {
      id: Date.now(),
      title: newMeetingTitle,
      date: date,
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
    const startDate = new Date(date);
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
  };

  const selectedDateMeetings = meetings.filter(
    (meeting) =>
      date && meeting.date.toDateString() === date.toDateString()
  );

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Agenda de Reuniões</CardTitle>
          <CardDescription>
            Marque e visualize as reuniões da equipe comercial e de marketing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
                locale={ptBR}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Reuniões para{' '}
                {date ? format(date, 'PPP', { locale: ptBR }) : '...'}
              </h3>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {selectedDateMeetings.length > 0 ? (
                  selectedDateMeetings.map((meeting) => (
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
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma reunião para esta data.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
                <Label>Data Selecionada</Label>
                <p className="font-bold text-sm border rounded-md h-10 flex items-center px-3">
                  {date ? format(date, 'PPP', { locale: ptBR }) : ''}
                </p>
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
            <Button type="submit">Adicionar Reunião</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
