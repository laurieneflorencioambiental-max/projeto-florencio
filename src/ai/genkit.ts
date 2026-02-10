'use client';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {GenkitPlugin} from 'genkit/plugin';

const plugins: GenkitPlugin[] = [];
if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
} else {
  console.warn(
    'GEMINI_API_KEY is not set. AI features will be disabled. Please add it to your .env file.'
  );
}

export const ai = genkit({
  plugins,
  model: 'googleai/gemini-2.5-flash',
});
