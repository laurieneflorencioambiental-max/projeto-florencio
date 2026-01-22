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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Meeting {
  id: number;
  title: string;
  date: Date;
  description: string;
}

export default function AgendaPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle || !date) return;

    const newMeeting: Meeting = {
      id: Date.now(),
      title: newMeetingTitle,
      date: date,
      description: newMeetingDescription,
    };
    setMeetings(
      [...meetings, newMeeting].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      )
    );
    setNewMeetingTitle('');
    setNewMeetingDescription('');
  };

  const selectedDateMeetings = meetings.filter(
    (meeting) =>
      date && meeting.date.toDateString() === date.toDateString()
  );

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 flex flex-col gap-8">
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
                        <p className="font-semibold">{meeting.title}</p>
                        <p className="text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
                Reunião será agendada para:{' '}
                <span className="font-bold">
                  {date ? format(date, 'PPP', { locale: ptBR }) : ''}
                </span>
              </p>
              <Button type="submit">Adicionar Reunião</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sobre a Integração com Google Agenda</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Integrar este sistema diretamente com a sua Google Agenda é um
              recurso poderoso, mas é um processo complexo que vai além de uma
              simples alteração na interface.
            </p>
            <p>Para que isso funcione de forma segura, seria necessário:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Configurar um projeto no Google Cloud Platform.</li>
              <li>Ativar a API do Google Calendar.</li>
              <li>Criar credenciais de acesso seguro (OAuth 2.0).</li>
              <li>
                Implementar um fluxo de autorização para que você permita que
                nosso app acesse sua agenda.
              </li>
              <li>
                Desenvolver um servidor backend para gerenciar as requisições de
                forma segura.
              </li>
            </ul>
            <p>
              Por enquanto, esta página serve como uma agenda interna para a
              equipe.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-4">
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir Google Agenda
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
