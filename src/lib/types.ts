import { z } from 'zod';

export type Status =
  | 'Novos'
  | 'Pendente/Em negociação'
  | 'Aprovado'
  | 'Desistência'
  | 'Rejeitado';

export const statuses: Status[] = [
  'Novos',
  'Pendente/Em negociação',
  'Aprovado',
  'Desistência',
  'Rejeitado',
];

export const paymentMethods = [
  'Boleto',
  'Cartão de Crédito (Link)',
  'Cartão de Crédito (Maquininha)',
  'Cartão de Débito (Link)',
  'Cartão de Débito (Maquininha)',
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const contactSources = [
  'Instagram',
  'Google',
  'Indicação',
  'BNI',
  'Marketing Offline',
] as const;
export type ContactSource = (typeof contactSources)[number];

export const rejectionReasons = [
  'Preço elevado',
  'Concorrência com melhor oferta',
  'Escopo não atendido',
  'Cliente sem urgência/prioridade',
  'Cliente optou por solução interna',
  'Falta de resposta (Follow-up)',
] as const;
export type RejectionReason = (typeof rejectionReasons)[number];


export const paymentMethodSchema = z.object({
  method: z.enum(paymentMethods),
  cardFee: z.number().optional(),
});

export const examSchema = z.object({
    id: z.string(),
    service: z.string().min(1, 'O serviço é obrigatório.'),
    description: z.string().min(1, 'A descrição é obrigatória.'),
    value: z.number().min(0, 'O valor deve ser zero ou maior.'),
});

export const planSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'O nome do plano é obrigatório.'),
    employeeRange: z.string().min(1, 'A faixa de funcionários é obrigatória.'),
    servicesIncluded: z.string().min(1, 'Os serviços inclusos são obrigatórios.'),
    investment: z.number().positive('O valor do investimento deve ser positivo.'),
    paymentType: z.enum(['unique', 'monthly']),
});

export const leadSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'O nome é obrigatório.'),
  role: z.string().optional(),
  company: z.string().min(2, 'O nome da empresa é obrigatório.'),
  cnpj: z.string().min(14, 'O CNPJ deve ter 14 dígitos.'),
  proposalSummary: z.string().min(10, 'O resumo deve ter pelo menos 10 caracteres.'),
  value: z.number().min(0, 'O valor não pode ser negativo.'),
  paymentMethods: z.array(paymentMethodSchema).min(1, 'Selecione ao menos um método de pagamento.'),
  contactSource: z.object({
    source: z.enum(contactSources),
    indicatedBy: z.string().optional(),
  }),
  email: z.string().email('Email inválido.'),
  whatsapp: z.string().min(10, 'Número de WhatsApp inválido.'),
  status: z.enum(statuses),
  rejectionReason: z.enum(rejectionReasons).optional().nullable(),
  createdAt: z.coerce.date(),
  createdBy: z.string(),
  proposalGeneratedCount: z.number().default(0),
  whatsappSentCount: z.number().default(0),
  editCount: z.number().default(0),
  previousStatus: z.enum(statuses).optional().nullable(),
  proposalNumber: z.number().nullable().optional(),
  proposalVersion: z.number().default(0),
});


export type Lead = z.infer<typeof leadSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Exam = z.infer<typeof examSchema>;

export type ProposalTemplate = {
  id: string;
  name: string;
  proposalObject: string;
  serviceScope: string;
  clientResponsibilities: string;
  contractorResponsibilities: string;
  deadline: string;
  strategicVision: string;
  investment: string;
  plans: Plan[];
  exams: Exam[];
};

export type ProposalState = Omit<ProposalTemplate, 'id' | 'name'>;

export type ProposalData = {
  id?: string;
  lead: Lead;
  proposalState: ProposalState;
  fullProposalNumber: string;
  createdAt: any; // Using `any` for Firestore serverTimestamp
};

const defaultText = 'A ser definido na proposta.';

export const proposalTemplates: ProposalTemplate[] = [
  {
    id: 'consultoria-completa',
    name: 'Consultoria Completa em SST',
    proposalObject: `A presente proposta tem por objeto a prestação de serviços de consultoria completa em Saúde e Segurança do Trabalho (SST), incluindo:
- Elaboração e gestão do Programa de Gerenciamento de Riscos (PGR).
- Elaboração e gestão do Programa de Controle Médico de Saúde Ocupacional (PCMSO).
- Emissão de Laudos Técnicos (LTCAT, Laudo de Insalubridade e Periculosidade).
- Realização de Análise Ergonômica do Trabalho (AET).
- Suporte contínuo e assessoria para atendimento às Normas Regulamentadoras.`,
    serviceScope: defaultText,
    clientResponsibilities: defaultText,
    contractorResponsibilities: defaultText,
    deadline: defaultText,
    strategicVision: defaultText,
    investment: defaultText,
    plans: [],
    exams: [],
  },
  {
    id: 'treinamento-nr12',
    name: 'Treinamento NR-12 (Máquinas e Equipamentos)',
    proposalObject: `Objeto: Capacitação dos colaboradores para atendimento à Norma Regulamentadora nº 12 - Segurança no Trabalho em Máquinas e Equipamentos.

Conteúdo Programático:
- Apresentação da NR-12 e seus anexos.
- Identificação de riscos em máquinas e equipamentos.
- Sistemas de segurança e proteções.
- Procedimentos de trabalho e segurança.
- Práticas de operação segura e manutenção.`,
    serviceScope: defaultText,
    clientResponsibilities: defaultText,
    contractorResponsibilities: defaultText,
    deadline: defaultText,
    strategicVision: defaultText,
    investment: defaultText,
    plans: [],
    exams: [],
  },
  {
    id: 'avcb',
    name: 'AVCB e Brigada de Incêndio',
    proposalObject: `Esta proposta contempla os seguintes serviços para regularização e segurança contra incêndio:
- Elaboração ou renovação do Auto de Vistoria do Corpo de Bombeiros (AVCB).
- Análise e adequação do projeto de prevenção e combate a incêndio.
- Formação e treinamento de Brigada de Incêndio, em conformidade com a legislação vigente.`,
    serviceScope: defaultText,
    clientResponsibilities: defaultText,
    contractorResponsibilities: defaultText,
    deadline: defaultText,
    strategicVision: defaultText,
    investment: defaultText,
    plans: [],
    exams: [],
  },
];
