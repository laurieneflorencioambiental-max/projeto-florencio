'use server';

import { generatePersonalizedFollowUp } from '@/ai/flows/generate-personalized-follow-up';
import { suggestCampaignGoal } from '@/ai/flows/suggest-campaign-goal';
import { analyzeCampaignPerformance } from '@/ai/flows/analyze-campaign-performance';
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

export async function analyzeCampaignPerformanceAction(
  roiHistory: RoiEntryForAI[]
) {
  try {
    if (roiHistory.length === 0) {
      return {
        analysis:
          'Não há dados de ROI suficientes para realizar uma análise. Por favor, adicione alguns cálculos de ROI primeiro.',
      };
    }

    const roiSummary = roiHistory
      .map(
        entry =>
          `Fonte: ${entry.source}, Investimento: R$ ${entry.investment.toFixed(
            2
          )}, Receita: R$ ${entry.revenue.toFixed(2)}, ROI: ${entry.roi.toFixed(
            2
          )}%`
      )
      .join('\n');

    const totalInvestment = roiHistory.reduce(
      (sum, entry) => sum + entry.investment,
      0
    );
    const totalRevenue = roiHistory.reduce(
      (sum, entry) => sum + entry.revenue,
      0
    );
    const overallRoi =
      totalInvestment > 0
        ? ((totalRevenue - totalInvestment) / totalInvestment) * 100
        : 0;

    const fullSummary = `Resumo Geral:
Investimento Total: R$ ${totalInvestment.toFixed(2)}
Receita Total: R$ ${totalRevenue.toFixed(2)}
ROI Consolidado: ${overallRoi.toFixed(2)}%

Detalhes por Fonte:
${roiSummary}`;

    const result = await analyzeCampaignPerformance({
      roiSummary: fullSummary,
    });

    return result;
  } catch (error) {
    console.error('Error analyzing campaign performance:', error);
    return {
      analysis:
        'Ocorreu um erro ao gerar a análise estratégica. Tente novamente.',
    };
  }
}
