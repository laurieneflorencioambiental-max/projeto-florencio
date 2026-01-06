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

export type PaymentMethod = 'Boleto' | 'Cartão de Crédito/Débito';

export type ContactSource =
  | 'Meta'
  | 'Google'
  | 'Indicação'
  | 'BNI'
  | 'Marketing Offline';

export type Lead = {
  id: string;
  name: string;
  company: string;
  cnpj: string;
  proposalSummary: string;
  value: number;
  paymentMethods: {
    method: PaymentMethod;
    cardFee?: number;
  }[];
  contactSource: {
    source: ContactSource;
    indicatedBy?: string;
  };
  email: string;
  whatsapp: string;
  status: Status;
  rejectionReason?: string;
};
