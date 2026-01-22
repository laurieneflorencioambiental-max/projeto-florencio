'use server';

import { generatePersonalizedFollowUp } from '@/ai/flows/generate-personalized-follow-up';
import { suggestCampaignGoal } from '@/ai/flows/suggest-campaign-goal';
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

interface RoiEntryForAI {
  source: string;
  investment: number;
  revenue: number;
  roi: number;
}

export async function suggestCampaignGoalAction(
  source: string,
  investment: number | undefined,
  roiHistory: RoiEntryForAI[]
) {
  try {
    const sourceHistory = roiHistory.filter(entry => entry.source === source);

    let historicalPerformance = 'Nenhum dado histórico de ROI para esta fonte.';

    if (sourceHistory.length > 0) {
      const avgRoi =
        sourceHistory.reduce((acc, entry) => acc + entry.roi, 0) /
        sourceHistory.length;
      const totalRevenue = sourceHistory.reduce(
        (acc, entry) => acc + entry.revenue,
        0
      );
      const totalInvestment = sourceHistory.reduce(
        (acc, entry) => acc + entry.investment,
        0
      );

      historicalPerformance = `Para a fonte "${source}", foram realizados ${
        sourceHistory.length
      } investimentos, totalizando R$ ${totalInvestment.toFixed(
        2
      )} em investimentos e R$ ${totalRevenue.toFixed(
        2
      )} em receita. O ROI médio foi de ${avgRoi.toFixed(2)}%.`;
    }

    const result = await suggestCampaignGoal({
      source: source,
      totalInvestment: investment,
      historicalPerformance,
    });

    return result;
  } catch (error) {
    console.error('Error suggesting campaign goal:', error);
    return {
      suggestedPercentage: 0,
      justification:
        'Ocorreu um erro ao gerar a sugestão. Tente novamente.',
    };
  }
}
