import { createTool } from '@mastra/core/tools';
import { TwitterApi } from 'twitter-api-v2';
import { z } from 'zod';

// Store oauth tokens temporarily (in production, use a proper session store)
const STATE_STORE = new Map<string, { oauth_token: string; oauth_token_secret: string }>();

export const twitterAuthTool = createTool({
  id: 'twitter-auth',
  description: 'Authenticate with Twitter to get access tokens for a bot account. First call with action="start" to get the auth URL, then visit the URL, get the PIN, and call again with action="callback" and the PIN.',
  inputSchema: z.object({
    action: z.enum(['start', 'callback']),
    pin: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    url: z.string().optional(),
    accessToken: z.string().optional(),
    accessSecret: z.string().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      if (context.action === 'start') {
        const client = new TwitterApi({
          appKey: process.env.TWITTER_API_KEY!,
          appSecret: process.env.TWITTER_API_SECRET!,
        });

        // Use oob (PIN-based) auth instead of callback URL
        const authLink = await client.generateAuthLink('oob');
        
        // Store the tokens
        STATE_STORE.set(authLink.oauth_token, {
          oauth_token: authLink.oauth_token,
          oauth_token_secret: authLink.oauth_token_secret,
        });

        return {
          success: true,
          url: authLink.url,
          message: 'Visit this URL and enter the PIN you receive to complete authentication'
        };
      } else if (context.action === 'callback') {
        if (!context.pin) {
          throw new Error('Missing PIN');
        }

        // Get the most recent token (since we can't match by oauth_token anymore)
        const stored = Array.from(STATE_STORE.entries())[STATE_STORE.size - 1]?.[1];
        if (!stored) {
          throw new Error('No stored tokens found. Please start the auth process again.');
        }

        const client = new TwitterApi({
          appKey: process.env.TWITTER_API_KEY!,
          appSecret: process.env.TWITTER_API_SECRET!,
          accessToken: stored.oauth_token,
          accessSecret: stored.oauth_token_secret,
        });

        const { accessToken, accessSecret } = await client.login(context.pin);

        // Clean up stored state
        STATE_STORE.clear();

        return {
          success: true,
          accessToken,
          accessSecret,
          message: 'Successfully authenticated! Use these tokens in your .env file'
        };
      }

      throw new Error('Invalid action');
    } catch (error) {
      console.error('Twitter auth error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}); 