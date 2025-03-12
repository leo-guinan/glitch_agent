import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { TwitterApi } from 'twitter-api-v2';

const inputSchema = z.object({
  text: z.string().max(280).describe('The text content of the tweet'),
  replyToTweetId: z.string().optional().describe('Optional ID of the tweet to reply to'),
  mediaIds: z.tuple([z.string()])
    .or(z.tuple([z.string(), z.string()]))
    .or(z.tuple([z.string(), z.string(), z.string()]))
    .or(z.tuple([z.string(), z.string(), z.string(), z.string()]))
    .optional()
    .describe('Optional array of media IDs to attach (1-4 items)'),
});

type InputType = z.infer<typeof inputSchema>;

export const twitterTool = createTool({
  id: 'send-tweet',
  description: 'Send tweets using the Twitter API v2. Can create new tweets or reply to existing ones.',
  inputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    tweetId: z.string().optional(),
    tweetUrl: z.string().optional(),
    error: z.string().optional(),
    debug: z.string().optional(),
  }).describe('Result of the tweet operation'),
  execute: async ({ context }: { context: InputType }) => {
    if (!process.env.TWITTER_API_KEY || 
        !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || 
        !process.env.TWITTER_ACCESS_SECRET) {
      return {
        success: false,
        error: 'Missing Twitter API credentials',
        debug: 'Required environment variables: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET'
      };
    }

    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
      });

      const tweet = await client.v2.tweet(context.text, {
        ...(context.replyToTweetId && { reply: { in_reply_to_tweet_id: context.replyToTweetId } }),
        ...(context.mediaIds && { media: { media_ids: context.mediaIds } })
      });

      return {
        success: true,
        tweetId: tweet.data.id,
        tweetUrl: `https://twitter.com/i/web/status/${tweet.data.id}`,
        debug: 'Tweet sent successfully'
      };
    } catch (error) {
      console.error('Error in Twitter tool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
        debug: `Full error: ${JSON.stringify(error, null, 2)}`
      };
    }
  }
}); 