'use server';

import { generatePersonalizedFollowUp } from '@/ai/flows/generate-personalized-follow-up';
import type { Lead } from '@/lib/types';

export async function getFollowUpMessageAction(lead: Lead) {
  try {
    if (!lead.rejectionReason) {
      return {
        followUpMessage:
          'Motivo da rejeição não informado. Não foi possível gerar uma mensagem.',
      };
    }

    const result = await generatePersonalizedFollowUp({
      clientName: lead.name,
      rejectionReason: lead.rejectionReason,
      productOrService: 'Consultoria em Segurança do Trabalho',
    });

    return result;
  } catch (error) {
    console.error('Error generating follow-up message:', error);
    return {
      followUpMessage:
        'Ocorreu um erro ao gerar a mensagem de follow-up. Tente novamente.',
    };
  }
}
