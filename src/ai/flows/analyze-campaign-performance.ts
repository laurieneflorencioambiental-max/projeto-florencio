'use server';
/**
 * @fileOverview AI agent to analyze marketing campaign performance and provide strategic insights.
 *
 * - analyzeCampaignPerformance - A function that analyzes campaign data.
 * - AnalyzeCampaignPerformanceInput - The input type for the analyzeCampaignPerformance function.
 * - AnalyzeCampaignPerformanceOutput - The return type for the analyzeCampaignPerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCampaignPerformanceInputSchema = z.object({
  roiSummary: z
    .string()
    .describe(
      'A summary of historical ROI data across different marketing channels, including investments, revenues, and ROI percentages.'
    ),
});
export type AnalyzeCampaignPerformanceInput = z.infer<
  typeof AnalyzeCampaignPerformanceInputSchema
>;

const AnalyzeCampaignPerformanceOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      'A strategic analysis of the provided data, highlighting strengths, weaknesses, and actionable recommendations.'
    ),
});
export type AnalyzeCampaignPerformanceOutput = z.infer<
  typeof AnalyzeCampaignPerformanceOutputSchema
>;

export async function analyzeCampaignPerformance(
  input: AnalyzeCampaignPerformanceInput
): Promise<AnalyzeCampaignPerformanceOutput> {
  return analyzeCampaignPerformanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCampaignPerformancePrompt',
  input: {schema: AnalyzeCampaignPerformanceInputSchema},
  output: {schema: AnalyzeCampaignPerformanceOutputSchema},
  prompt: `Você é um Estrategista de Vendas e Marketing de classe mundial. Sua tarefa é analisar o resumo de desempenho de ROI fornecido e gerar insights estratégicos e acionáveis.

Dados de Desempenho:
{{{roiSummary}}}

Sua análise deve:
1.  Identificar o canal com o melhor e o pior desempenho de ROI.
2.  Apontar qual canal gerou a maior receita absoluta.
3.  Fornecer de 2 a 3 recomendações claras e práticas. Por exemplo: "Aumentar o investimento no canal X", "Otimizar o canal Y para melhorar o ROI", ou "Testar uma nova abordagem no canal Z".
4.  Manter um tom profissional, direto e encorajador.
5.  Formate a saída em parágrafos ou uma lista de pontos para fácil leitura.`,
});

const analyzeCampaignPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeCampaignPerformanceFlow',
    inputSchema: AnalyzeCampaignPerformanceInputSchema,
    outputSchema: AnalyzeCampaignPerformanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
