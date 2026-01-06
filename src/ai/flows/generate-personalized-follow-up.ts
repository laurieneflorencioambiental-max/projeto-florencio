'use server';
/**
 * @fileOverview AI agent to generate personalized follow-up messages for rejected leads.
 *
 * - generatePersonalizedFollowUp - A function that generates a personalized follow-up message.
 * - GeneratePersonalizedFollowUpInput - The input type for the generatePersonalizedFollowUp function.
 * - GeneratePersonalizedFollowUpOutput - The return type for the generatePersonalizedFollowUp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonalizedFollowUpInputSchema = z.object({
  rejectionReason: z
    .string()
    .describe(
      'The reason why the lead was rejected. Include any relevant context from previous conversations.'
    ),
  clientName: z.string().describe('The name of the client.'),
  productOrService: z
    .string()
    .describe('The product or service that was offered.'),
});
export type GeneratePersonalizedFollowUpInput = z.infer<
  typeof GeneratePersonalizedFollowUpInputSchema
>;

const GeneratePersonalizedFollowUpOutputSchema = z.object({
  followUpMessage: z
    .string()
    .describe('A personalized follow-up message for the rejected lead.'),
});
export type GeneratePersonalizedFollowUpOutput = z.infer<
  typeof GeneratePersonalizedFollowUpOutputSchema
>;

export async function generatePersonalizedFollowUp(
  input: GeneratePersonalizedFollowUpInput
): Promise<GeneratePersonalizedFollowUpOutput> {
  return generatePersonalizedFollowUpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedFollowUpPrompt',
  input: {schema: GeneratePersonalizedFollowUpInputSchema},
  output: {schema: GeneratePersonalizedFollowUpOutputSchema},
  prompt: `You are a sales expert tasked with re-engaging rejected leads. A lead has rejected our {{productOrService}} offering. The client's name is {{clientName}}. The reason for rejection is: {{rejectionReason}}.\n\nGenerate a personalized and friendly follow-up message to send to the client. The message should:\n- Acknowledge their initial rejection.\n- Briefly address the reason for rejection, suggesting a potential improvement or solution.\n- Offer a small discount or incentive to reconsider our offering.\n- Maintain a positive and professional tone.\n\nFollow-up Message:`,
});

const generatePersonalizedFollowUpFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedFollowUpFlow',
    inputSchema: GeneratePersonalizedFollowUpInputSchema,
    outputSchema: GeneratePersonalizedFollowUpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
