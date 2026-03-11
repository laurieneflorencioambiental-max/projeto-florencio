'use client';

import type { Lead, Service, ProposalTemplate, ProposalArea } from './types';

export const seedSellers = [
  { id: 'seller-1', name: 'Ana Silva' },
  { id: 'seller-2', name: 'Carlos Martins' },
  { id: 'seller-3', name: 'Juliana Costa' },
];

export const seedProposalAreas: Omit<ProposalArea, 'id'>[] = [
  { name: 'Segurança do Trabalho', acronym: 'SST', serviceCode: '001', active: true },
  { name: 'Meio Ambiente', acronym: 'MA', serviceCode: '002', active: true },
];

export const seedServices: Omit<Service, 'id'>[] = [
  { service: 'ASO Clínico', description: 'Exame clínico admissional, demissional ou periódico.', value: 60 },
  { service: 'Audiometria', description: 'Avaliação da capacidade auditiva do trabalhador.', value: 45 },
  { service: 'Espirometria', description: 'Exame do sopro para avaliação da função pulmonar.', value: 70 },
  { service: 'Treinamento NR-35', description: 'Capacitação para trabalho em altura (8h).', value: 250 },
  { service: 'PGR', description: 'Programa de Gerenciamento de Riscos.', value: 800 },
  { service: 'PCMSO', description: 'Programa de Controle Médico de Saúde Ocupacional.', value: 650 },
  { service: 'LTCAT', description: 'Laudo Técnico das Condições Ambientais de Trabalho.', value: 950 },
];

export const seedTemplates: Omit<ProposalTemplate, 'id'>[] = [
    {
        name: 'Modelo Básico SST (PME)',
        proposalObject: 'Assessoria em Saúde e Segurança do Trabalho, com foco no cumprimento das Normas Regulamentadoras e eSocial.',
        serviceScope: 'Nossos serviços incluem a elaboração dos programas (PGR e PCMSO), a gestão dos exames ocupacionais (ASOs), e o envio dos eventos de SST para o eSocial.',
        clientResponsibilities: 'Disponibilizar a relação de funcionários e suas respectivas funções; Agendar os exames periódicos; Informar sobre acidentes de trabalho.',
        contractorResponsibilities: 'Realizar o levantamento de riscos; Elaborar e manter atualizados o PGR e o PCMSO; Realizar os exames clínicos e complementares; Enviar os eventos de SST para o eSocial.',
        deadline: 'O prazo para elaboração dos programas é de 30 dias após a assinatura do contrato. Os exames serão agendados conforme disponibilidade.',
        investment: 'O investimento total pode ser parcelado em até 3x sem juros no boleto bancário.',
        strategicVision: 'Garantir a conformidade legal da empresa, reduzir acidentes e doenças do trabalho, e evitar multas e passivos trabalhistas através de uma gestão de SST proativa e eficiente.',
        plans: [
            { 
              id: 'plan-1', 
              name: 'Plano Essencial', 
              employeeRange: 'Até 20 funcionários', 
              servicesIncluded: 'PGR (Programa de Gerenciamento de Riscos)\nPCMSO (Programa de Controle Médico de Saúde Ocupacional)\nGestão de ASOs', 
              investment: 1200,
              investments: [{ label: 'Investimento único', value: 1200 }],
              paymentType: 'unique',
              purpose: 'Cumprimento das obrigatoriedades básicas.',
              differentiator: 'Custo-benefício ideal para pequenas empresas.',
              focus: 'Eliminar riscos de multas imediatas.',
              auditSupport: 'Suporte remoto para fiscalizações básicas.',
              strategicManagement: 'Gestão focada em conformidade mínima obrigatória.',
              specificManagement: 'Acompanhamento técnico específico do plano.',
              extraServices: [
                { name: 'Envio ao eSocial', value: 300 }
              ]
            },
            { 
              id: 'plan-2', 
              name: 'Plano Completo', 
              employeeRange: 'Até 50 funcionários', 
              servicesIncluded: 'PGR + PCMSO\nGestão de ASOs\nEnvio eSocial\nLTCAT', 
              investment: 2500,
              investments: [{ label: 'Investimento integral', value: 2500 }],
              paymentType: 'unique',
              purpose: 'Gestão completa e blindagem jurídica.',
              differentiator: 'Acompanhamento mensal personalizado.',
              focus: 'Prevenção de passivos trabalhistas.',
              auditSupport: 'Acompanhamento presencial em auditorias e fiscalizações do trabalho.',
              strategicManagement: 'Gestão proativa com foco em redução de custos por sinistralidade.',
              specificManagement: 'Acompanhamento técnico específico do plano.',
              extraServices: []
            },
        ],
        exams: []
    }
];


export const getSeedLeads = (sellers: { id: string, name: string }[], uid: string) => {
    const today = new Date().toISOString().split('T')[0];
    const leads: Omit<Lead, 'id' | 'createdAt'>[] = [
        {
            name: 'Roberto Andrade',
            role: 'Gerente de TI',
            company: 'Nexus Tech',
            cnpj: '11.222.333/0001-44',
            proposalSummary: 'Implementação de sistema de gestão de SST e treinamento para 25 funcionários.',
            value: 7500,
            proposalViewed: false,
            proposalViewedAt: null,
            proposalViewCount: 0,
            proposalLastViewedAt: null,
            paymentMethods: [{ method: 'Boleto' }],
            contactSource: { source: 'Google', indicatedBy: '' },
            email: 'roberto@nexustech.com',
            whatsapp: '21988776655',
            status: 'Novos',
            createdBy: sellers[0]?.name || 'Ana Silva',
            createdByUid: uid,
            rejectionReason: null,
            proposalGeneratedCount: 0,
            whatsappSentCount: 0,
            editCount: 0,
            previousStatus: null,
            proposalNumber: 1,
            proposalVersion: 0,
            observations: 'Cliente parece bem interessado, precisa de agilidade na proposta.',
            versionHistory: [],
            budgetDate: today,
            proposalArea: 'SST',
            proposalAreaAcronym: 'SST',
            proposalServiceCode: '001',
        },
        {
            name: 'Fernanda Lima',
            role: 'Dona',
            company: 'Padaria Doce Sonho',
            cnpj: '44.555.666/0001-77',
            proposalSummary: 'Renovação do PGR e PCMSO para 15 funcionários.',
            value: 2800,
            proposalViewed: false,
            proposalViewedAt: null,
            proposalViewCount: 0,
            proposalLastViewedAt: null,
            paymentMethods: [{ method: 'Cartão de Débito (Maquininha)' }],
            contactSource: { source: 'Indicação', indicatedBy: 'Contador João' },
            email: 'fernanda@docesonho.com',
            whatsapp: '21999887766',
            status: 'Pendente/Em negociação',
            createdBy: sellers[1]?.name || 'Carlos Martins',
            createdByUid: uid,
            rejectionReason: null,
            proposalGeneratedCount: 1,
            whatsappSentCount: 1,
            editCount: 1,
            previousStatus: 'Novos',
            proposalNumber: 2,
            proposalVersion: 1,
            observations: 'Enviada proposta v1. Aguardando retorno sobre ajuste de valores.',
            versionHistory: [{ version: 1, editedBy: 'Carlos Martins', editedAt: new Date(new Date().setDate(new Date().getDate() - 2)) }],
            budgetDate: today,
            proposalArea: 'SST',
            proposalAreaAcronym: 'SST',
            proposalServiceCode: '001',
        }
    ];
    return leads;
};
