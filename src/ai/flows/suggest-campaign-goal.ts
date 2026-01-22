'use server';
/**
 * @fileOverview AI agent to suggest a realistic marketing campaign goal.
 *
 * - suggestCampaignGoal - A function that suggests a campaign goal.
 * - SuggestCampaignGoalInput - The input type for the suggestCampaignGoal function.
 * - SuggestCampaignGoalOutput - The return type for the suggestCampaignGoal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCampaignGoalInputSchema = z.object({
  source: z
    .string()
    .describe(
      'The investment source for the campaign (e.g., Google, Instagram).'
    ),
  historicalPerformance: z
    .string()
    .describe(
      'A summary of historical performance for this source, including past ROI, number of leads, and conversion rates if available.'
    ),
  totalInvestment: z
    .number()
    .optional()
    .describe('The planned investment amount for this new campaign.'),
});
export type SuggestCampaignGoalInput = z.infer<
  typeof SuggestCampaignGoalInputSchema
>;

const SuggestCampaignGoalOutputSchema = z.object({
  suggestedPercentage: z
    .number()
    .describe('The suggested percentage increase goal for the campaign.'),
  justification: z
    .string()
    .describe(
      'A brief explanation of why this goal is realistic based on the data provided.'
    ),
});
export type SuggestCampaignGoalOutput = z.infer<
  typeof SuggestCampaignGoalOutputSchema
>;

export async function suggestCampaignGoal(
  input: SuggestCampaignGoalInput
): Promise<SuggestCampaignGoalOutput> {
  return suggestCampaignGoalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCampaignGoalPrompt',
  input: {schema: SuggestCampaignGoalInputSchema},
  output: {schema: SuggestCampaignGoalOutputSchema},
  prompt: `Você é um especialista em estratégia de marketing. Com base nos dados de desempenho histórico fornecidos, sugira uma meta de aumento percentual realista para uma nova campanha.

Fonte da Campanha: {{source}}
{{#if totalInvestment}}
Investimento Planejado: R$ {{totalInvestment}}
{{/if}}
Desempenho Histórico:
{{{historicalPerformance}}}

Sua sugestão deve ser ambiciosa, mas alcançável. Forneça uma breve justificativa para sua sugestão. Considere benchmarks do setor se os dados históricos forem limitados, mas baseie seu raciocínio principalmente nos dados fornecidos. Forneça um único número percentual específico.`,
});

const suggestCampaignGoalFlow = ai.defineFlow(
  {
    name: 'suggestCampaignGoalFlow',
    inputSchema: SuggestCampaignGoalInputSchema,
    outputSchema: SuggestCampaignGoalOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
