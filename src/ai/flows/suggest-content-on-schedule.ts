
// src/ai/flows/suggest-content-on-schedule.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting content snippets related to a scheduled entry.
 *
 * - suggestContent - A function that takes entry content and suggests improvements.
 * - SuggestContentInput - The input type for the suggestContent function.
 * - SuggestContentOutput - The return type for the suggestContent function.
 * 
 * Энэ файл нь Genkit ашиглан хиймэл оюуны "flow" тодорхойлдог.
 * `suggestContent` функц нь оруулсан контентын агуулга, категорид үндэслэн
 * сайжруулах саналуудыг үүсгэдэг.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Хиймэл оюуны функцийн оролтын төрлийг `zod` ашиглан тодорхойлох
const SuggestContentInputSchema = z.object({
  entryContent: z
    .string()
    .describe('The content of the entry being scheduled.'),
  category: z.string().describe('The category of the entry.'),
});
export type SuggestContentInput = z.infer<typeof SuggestContentInputSchema>;

// Хиймэл оюуны функцийн гаралтын төрлийг `zod` ашиглан тодорхойлох
const SuggestContentOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of suggested content snippets to improve the entry.'),
});
export type SuggestContentOutput = z.infer<typeof SuggestContentOutputSchema>;

/**
 * Оруулсан контент болон категорид үндэслэн сайжруулах саналуудыг буцаана.
 * @param input - Оролтын өгөгдөл (entryContent, category).
 * @returns Сайжруулах саналуудын жагсаалт.
 */
export async function suggestContent(input: SuggestContentInput): Promise<SuggestContentOutput> {
  return suggestContentFlow(input);
}

// Хиймэл оюуны загварт өгөх зааварчилгааг (prompt) тодорхойлох
const prompt = ai.definePrompt({
  name: 'suggestContentPrompt',
  input: {schema: SuggestContentInputSchema},
  output: {schema: SuggestContentOutputSchema},
  prompt: `You are an AI assistant that helps content creators improve their entries before publishing.

  Based on the entry content and category provided, suggest content snippets that could enhance the entry's quality and engagement.
  Provide a list of suggestions.

  Category: {{{category}}}
  Entry Content: {{{entryContent}}}

  Suggestions:`,
});

// Genkit flow-г тодорхойлох. Энэ нь prompt-г дуудаж, үр дүнг буцаадаг.
const suggestContentFlow = ai.defineFlow(
  {
    name: 'suggestContentFlow',
    inputSchema: SuggestContentInputSchema,
    outputSchema: SuggestContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
