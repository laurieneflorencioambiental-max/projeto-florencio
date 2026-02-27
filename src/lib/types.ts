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
  'Pendente/Em negociação' as any,
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
    service: z.string().default(''),
    description: z.string().default(''),
    value: z.number().min(0).default(0),
});

export const extraServiceSchema = z.object({
    name: z.string().default(''),
    value: z.number().min(0).default(0)
});

export const investmentItemSchema = z.object({
    label: z.string().default(''),
    value: z.number().min(0).default(0)
});

export const complexityDefinitionSchema = z.object({
    id: z.string(),
    title: z.string().default(''),
    description: z.string().default(''),
});

export const planStructureItemSchema = z.object({
    id: z.string(),
    plan: z.string().default(''),
    profile: z.string().default(''),
    objective: z.string().default(''),
});

export const planSchema = z.object({
    id: z.string(),
    name: z.string().default(''),
    employeeRange: z.string().default(''),
    servicesIncluded: z.string().default(''),
    investments: z.array(investmentItemSchema).optional().default([]),
    investment: z.number().optional().default(0),
    paymentType: z.enum(['unique', 'monthly', 'active_contract_monthly']).default('unique'),
    purpose: z.string().optional().default(''),
    differentiator: z.string().optional().default(''),
    focus: z.string().optional().default(''),
    auditSupport: z.string().optional().default(''),
    strategicManagement: z.string().optional().default(''),
    specificManagement: z.string().optional().default(''),
    extraServices: z.array(extraServiceSchema).optional().default([]),
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
  selectedTemplateId: z.string().optional().nullable(),
  status: z.enum(statuses as any),
  rejectionReason: z.enum(rejectionReasons).optional().nullable(),
  createdAt: z.any(),
  createdBy: z.string(),
  createdByUid: z.string(),
  proposalGeneratedCount: z.number().default(0),
  whatsappSentCount: z.number().default(0),
  editCount: z.number().default(0),
  previousStatus: z.enum(statuses as any).optional().nullable(),
  proposalNumber: z.number().nullable().optional(),
  proposalVersion: z.number().default(0),
  observations: z.string().optional().nullable(),
  versionHistory: z.array(versionHistoryEntrySchema).optional().nullable(),
});

export const userProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional().nullable(),
  isAdmin: z.boolean().default(false),
  presenceStatus: z.enum(['online', 'offline']).optional(),
  lastSeen: z.any().optional(),
});


export type Lead = z.infer<typeof leadSchema>;
export type Plan = z.infer<typeof planSchema>;
export type ExtraService = z.infer<typeof extraServiceSchema>;
export type InvestmentItem = z.infer<typeof investmentItemSchema>;
export type ComplexityDefinition = z.infer<typeof complexityDefinitionSchema>;
export type PlanStructureItem = z.infer<typeof planStructureItemSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type VersionHistoryEntry = z.infer<typeof versionHistoryEntrySchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type { DocumentReference };

export type ProposalTemplate = {
  id: string;
  name: string;
  proposalObject: string;
  serviceScope: string;
  methodology?: string;
  psychosocialTools?: string;
  lgpdSecurity?: string;
  clientResponsibilities: string;
  contractorResponsibilities: string;
  preliminaryErgonomicAnalysis?: string;
  postErgonomicImplementation?: string;
  deadline: string;
  strategicVision: string;
  investment: string;
  paymentTerms?: string;
  plans: Plan[];
  exams: Service[];
  complexityDefinitions?: ComplexityDefinition[];
  planStructure?: PlanStructureItem[];
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
  proposalLocationUrl?: string | null;
  proposalClosingUrl?: string | null;
};

export const appSettingsSchema = z.object({
  sidebarLogoUrl: z.string().url().optional().nullable(),
  proposalLogoUrl: z.string().url().optional().nullable(),
  loginBackgroundUrl: z.string().url().optional().nullable(),
  proposalCoverUrl: z.string().url().optional().nullable(),
  proposalLocationUrl: z.string().url().optional().nullable(),
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
  laboratorio: number;
  gasolinaLocomocao: number;
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
  laboratorio: z.number(),
  gasolinaLocomocao: z.number(),
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
