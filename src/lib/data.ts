import type { Lead } from './types';

export const initialLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Ana Silva',
    company: 'Construtora Segura',
    value: 15000,
    status: 'Novos',
  },
  {
    id: 'lead-2',
    name: 'Bruno Costa',
    company: 'Indústria Têxtil Faria',
    value: 22000,
    status: 'Novos',
  },
  {
    id: 'lead-3',
    name: 'Carla Dias',
    company: 'Metalúrgica Diniz',
    value: 8500,
    status: 'Pendente',
  },
  {
    id: 'lead-4',
    name: 'Daniel Martins',
    company: 'Hospital Vida Plena',
    value: 35000,
    status: 'Aprovado',
  },
  {
    id: 'lead-5',
    name: 'Eduarda Ferreira',
    company: 'Escola Aprender Mais',
    value: 12000,
    status: 'Desistência',
  },
  {
    id: 'lead-6',
    name: 'Fábio Gomes',
    company: 'Supermercado Central',
    value: 18000,
    status: 'Rejeitado',
    rejectionReason: 'O preço está acima do nosso orçamento atual.',
  },
  {
    id: 'lead-7',
    name: 'Gabriela Lima',
    company: 'Tecnologia Inova',
    value: 25000,
    status: 'Rejeitado',
    rejectionReason: 'Decidimos por uma solução interna para gestão de segurança.',
  },
];
