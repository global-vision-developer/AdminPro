
// src/ai/flows/suggest-content-on-schedule.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting content snippets related to a scheduled entry.
 *
 * - suggestContent - A function that takes entry content and suggests improvements.
 * - SuggestContentInput - The input type for the suggestContent function.
 * - SuggestContentOutput - The return type for the suggestContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestContentInputSchema = z.object({
  entryContent: z
    .string()
    .describe('The content of the entry being scheduled.'),
  category: z.string().describe('Бичлэгийн ангилал.'),
});
export type SuggestContentInput = z.infer<typeof SuggestContentInputSchema>;

const SuggestContentOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of suggested content snippets to improve the entry.'),
});
export type SuggestContentOutput = z.infer<typeof SuggestContentOutputSchema>;

export async function suggestContent(input: SuggestContentInput): Promise<SuggestContentOutput> {
  return suggestContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestContentPrompt',
  input: {schema: SuggestContentInputSchema},
  output: {schema: SuggestContentOutputSchema},
  prompt: `You are an AI assistant that helps content creators improve their entries before publishing.

  Based on the entry content and category provided, suggest content snippets that could enhance the entry's quality and engagement.
  Provide a list of suggestions.

  Ангилал: {{{category}}}
  Entry Content: {{{entryContent}}}

  Suggestions:`, // Removed Handlebars {{each}} loop here because the model handles producing a list directly.
});

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
