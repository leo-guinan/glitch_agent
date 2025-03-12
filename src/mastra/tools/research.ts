import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

const inputSchema = z.object({
  query: z.string().describe('The research query about the investor'),
  systemPrompt: z.string().describe('System prompt to guide the research'),
}).required();

type InputType = z.infer<typeof inputSchema>;

export const researchTool = createTool({
  id: 'deep-research',
  description: 'Perform deep research on investors using Perplexity\'s advanced AI model. This tool can analyze investment history, track record, and market impact.',
  inputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    research: z.string(),
    error: z.string(),
    debug: z.string(),
  }).required().describe('Result of the research operation'),
  execute: async ({ context }: { context: InputType }) => {
    if (!process.env.PERPLEXITY_API_KEY) {
      return {
        success: false,
        research: '',
        error: 'PERPLEXITY_API_KEY environment variable is required',
        debug: 'Missing API key'
      };
    }

    try {
      const client = new OpenAI({
        apiKey: process.env.PERPLEXITY_API_KEY,
        baseURL: 'https://api.perplexity.ai'
      });

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: context.systemPrompt
        },
        {
          role: 'user',
          content: context.query
        }
      ];

      const response = await client.chat.completions.create({
        model: 'sonar-deep-research',
        messages
      });

      return {
        success: true,
        research: response.choices[0].message.content || '',
        error: '',
        debug: 'Research completed successfully'
      };
    } catch (error) {
      console.error('Error in research tool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        research: '',
        error: errorMessage,
        debug: `Full error: ${JSON.stringify(error, null, 2)}`
      };
    }
  }
}); 