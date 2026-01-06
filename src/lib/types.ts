import { z } from 'zod';

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

export const paymentMethods = ['Boleto', 'Cartão de Crédito/Débito'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const contactSources = [
  'Meta',
  'Google',
  'Indicação',
  'BNI',
  'Marketing Offline',
] as const;
export type ContactSource = (typeof contactSources)[number];

export const paymentMethodSchema = z.object({
  method: z.enum(paymentMethods),
  cardFee: z.number().optional(),
});

export const leadSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'O nome é obrigatório.'),
  company: z.string().min(2, 'O nome da empresa é obrigatório.'),
  cnpj: z.string().min(14, 'O CNPJ deve ter 14 dígitos.'),
  proposalSummary: z.string().min(10, 'O resumo deve ter pelo menos 10 caracteres.'),
  value: z.number().positive('O valor deve ser positivo.'),
  paymentMethods: z.array(paymentMethodSchema).min(1, 'Selecione ao menos um método de pagamento.'),
  contactSource: z.object({
    source: z.enum(contactSources),
    indicatedBy: z.string().optional(),
  }),
  email: z.string().email('Email inválido.'),
  whatsapp: z.string().min(10, 'Número de WhatsApp inválido.'),
  status: z.enum(statuses),
  rejectionReason: z.string().optional(),
});


export type Lead = z.infer<typeof leadSchema>;
