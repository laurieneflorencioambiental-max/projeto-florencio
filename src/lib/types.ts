
'use client';

import { z } from 'zod';
import type { DocumentReference } from 'firebase/firestore';


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
  'Outro',
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

export const serviceSchema = z.object({
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

export const versionHistoryEntrySchema = z.object({
  version: z.number(),
  editedBy: z.string(),
  editedAt: z.any(), // For Firestore Timestamps or Date objects
});

export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userEmail: z.string(),
  action: z.string(),
  timestamp: z.any(),
  ipAddress: z.string().optional().nullable(),
  details: z.string().optional().nullable(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;


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
  createdAt: z.any(),
  createdBy: z.string(),
  createdByUid: z.string(),
  proposalGeneratedCount: z.number().default(0),
  whatsappSentCount: z.number().default(0),
  editCount: z.number().default(0),
  previousStatus: z.enum(statuses).optional().nullable(),
  proposalNumber: z.number().nullable().optional(),
  proposalVersion: z.number().default(0),
  observations: z.string().optional().nullable(),
  versionHistory: z.array(versionHistoryEntrySchema).optional().nullable(),
});

export const attendanceQueues = [
    'Orçamento/Comercial',
    'Agendamento de ASO',
    'Meio Ambiente',
    'Financeiro',
    'Área Técnica SST',
    'Resultado de Exame',
    'Geral'
] as const;
export type AttendanceQueue = (typeof attendanceQueues)[number];

export const userProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional().nullable(),
  isAdmin: z.boolean().default(false),
  presenceStatus: z.enum(['online', 'offline']).optional(),
  lastSeen: z.any().optional(),
  queues: z.array(z.enum(attendanceQueues)).optional(),
});


export type Lead = z.infer<typeof leadSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type VersionHistoryEntry = z.infer<typeof versionHistoryEntrySchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type { DocumentReference };

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
  exams: Service[];
};

export type ProposalState = Omit<ProposalTemplate, 'id' | 'name'>;

export type ProposalData = {
  id?: string;
  lead: Lead;
  proposalState: ProposalState;
  fullProposalNumber: string;
  createdAt: any; // Using `any` for Firestore serverTimestamp
  logoUrl?: string | null;
  proposalCoverUrl?: string | null;
  proposalClosingUrl?: string | null;
};

export const appSettingsSchema = z.object({
  sidebarLogoUrl: z.string().url().optional().nullable(),
  proposalLogoUrl: z.string().url().optional().nullable(),
  loginBackgroundUrl: z.string().url().optional().nullable(),
  proposalCoverUrl: z.string().url().optional().nullable(),
  proposalClosingUrl: z.string().url().optional().nullable(),
  staleLeadDays: z.number().optional().nullable(),
  monthlyGoal: z.number().optional().nullable(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;


// Pricing Page Types
export const serviceTypes = [
  'Higiene Ocupacional',
  'Laudo Ergonômico',
  'Planos',
  'Ruído Ambiental',
  'Perícia',
  'Serviços Diversos',
] as const;

export type ServiceType = (typeof serviceTypes)[number];

export interface CostFactors {
  fornecedor: number;
  art: number;
  honorarioMedico: number;
  honorarioEngenheiro: number;
  almoco: number;
  pedagio: number;
  aluguelEquipamento: number;
  calibracao: number;
}

export const costFactorsSchema = z.object({
  fornecedor: z.number(),
  art: z.number(),
  honorarioMedico: z.number(),
  honorarioEngenheiro: z.number(),
  almoco: z.number(),
  pedagio: z.number(),
  aluguelEquipamento: z.number(),
  calibracao: z.number(),
});

export const pricingTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    serviceType: z.enum(serviceTypes),
    costs: costFactorsSchema,
    boletoFee: z.number(),
    margin: z.number(),
    taxes: z.number(),
    finalPrice: z.number(),
});

export type PricingTemplate = z.infer<typeof pricingTemplateSchema>;


// Marketing Page Types
export const roiEntrySchema = z.object({
  id: z.string(),
  source: z.string(),
  investment: z.number(),
  revenue: z.number(),
  roi: z.number(),
  createdAt: z.any(),
});
export type RoiEntry = z.infer<typeof roiEntrySchema>;

export const campaignStatuses = ['Futura', 'Rodando', 'Pausada', 'Concluída'] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export const marketingActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  goal: z.string(),
  deadline: z.any(),
  status: z.enum(campaignStatuses),
  source: z.string().optional(),
  percentageGoal: z.number().optional(),
  createdAt: z.any(),
});
export type MarketingAction = z.infer<typeof marketingActionSchema>;

export const toolPeriodicityOptions = ['Mensal', 'Anual', 'Único'] as const;
export type ToolPeriodicity = (typeof toolPeriodicityOptions)[number];

export const digitalToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  periodicity: z.enum(toolPeriodicityOptions),
  dueDate: z.any(),
  observation: z.string().optional(),
  createdAt: z.any(),
});
export type DigitalTool = z.infer<typeof digitalToolSchema>;

// Commissions Page Types
export const commissionTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    partnerName: z.string().optional(),
    partnerWhatsapp: z.string().optional(),
    serviceName: z.string().optional(),
    baseServiceValue: z.number(),
    commissionPercentage: z.number(),
    taxPercentage: z.number(),
    finalClientPrice: z.number(),
    partnerCommissionValue: z.number(),
});

export type CommissionTemplate = z.infer<typeof commissionTemplateSchema>;

export const partnershipDocumentSchema = z.object({
  id: z.string(),
  partnerName: z.string(),
  templates: z.array(commissionTemplateSchema),
  createdAt: z.any(),
});
export type PartnershipDocument = z.infer<typeof partnershipDocumentSchema>;


// Inbox / WhatsApp Types
export const messageSchema = z.object({
    id: z.string(),
    waMessageId: z.string(),
    conversationId: z.string(),
    from: z.string(),
    body: z.string(),
    type: z.string(),
    timestamp: z.any(),
    status: z.enum(['sent', 'delivered', 'read', 'failed']),
    senderUid: z.string().optional().nullable(),
});

export type Message = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
    id: z.string(),
    contactWaId: z.string(),
    contactName: z.string(),
    lastMessage: messageSchema.optional().nullable(),
    unreadCount: z.number().default(0),
    assignedToUid: z.string().optional().nullable(),
    assignedToName: z.string().optional().nullable(),
    status: z.enum(['open', 'closed', 'archived']).default('open'),
    queue: z.enum(attendanceQueues).optional().nullable(),
    createdAt: z.any(),
    updatedAt: z.any(),
    within24hWindow: z.boolean().default(true),
    lastCustomerMessageAt: z.any().optional().nullable(),
    paidConversationCount: z.number().default(0),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const whatsAppTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    bodyText: z.string(),
    variables: z.array(z.string()),
    status: z.enum(['APPROVED', 'PENDING', 'REJECTED']),
    usageRules: z.string(),
    isActive: z.boolean().default(false),
    monthlyUsage: z.number().default(0),
  });
  
export type WhatsAppTemplate = z.infer<typeof whatsAppTemplateSchema>;
