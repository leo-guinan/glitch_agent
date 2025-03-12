import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const inputSchema = z.object({
  url: z.string().describe('URL of the webpage to scrape'),
  manifestoPrompt: z.string().optional().describe('Optional custom prompt for manifesto generation'),
}).required();

type InputType = z.infer<typeof inputSchema>;

export const scraperTool = createTool({
  id: 'scrape-and-manifest',
  description: 'Scrape a webpage using Jina Reader and generate a company manifesto from its content.',
  inputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    content: z.string(),
    manifesto: z.string(),
    error: z.string(),
    debug: z.string(),
  }).required().describe('Result of the scraping and manifesto generation'),
  execute: async ({ context }: { context: InputType }) => {
    try {
      // Use Jina Reader to get markdown content
      const jinaUrl = `https://r.jina.ai/${context.url}`;
      const response = await fetch(jinaUrl);

      if (!response.ok) {
        return {
          success: false,
          content: '',
          manifesto: '',
          error: `Failed to scrape webpage: ${response.statusText}`,
          debug: `HTTP status: ${response.status}`
        };
      }

      const content = await response.text();

      // Generate manifesto using the scraped content
      const defaultPrompt = `Based on the following website content, write a compelling company manifesto 
      that captures the company's mission, values, and vision in an inspiring way. The manifesto should be 
      concise but powerful, highlighting the company's unique perspective and commitment to its goals:

      ${content}`;

      const manifestoResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: context.manifestoPrompt || defaultPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!manifestoResponse.ok) {
        return {
          success: false,
          content,
          manifesto: '',
          error: 'Failed to generate manifesto',
          debug: `HTTP status: ${manifestoResponse.status}`
        };
      }

      const manifestoData = await manifestoResponse.json() as { choices: [{ message: { content: string } }] };
      const manifesto = manifestoData.choices[0].message.content;

      return {
        success: true,
        content,
        manifesto: manifesto || '',
        error: '',
        debug: 'Successfully scraped webpage and generated manifesto'
      };
    } catch (error) {
      console.error('Error in scraper tool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        content: '',
        manifesto: '',
        error: errorMessage,
        debug: `Full error: ${JSON.stringify(error, null, 2)}`
      };
    }
  }
}); 