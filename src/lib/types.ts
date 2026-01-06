export type Status =
  | 'Novos'
  | 'Pendente'
  | 'Aprovado'
  | 'Desistência'
  | 'Rejeitado';

export const statuses: Status[] = [
  'Novos',
  'Pendente',
  'Aprovado',
  'Desistência',
  'Rejeitado',
];

export type Lead = {
  id: string;
  name: string;
  value: number;
  company: string;
  status: Status;
  rejectionReason?: string;
};
