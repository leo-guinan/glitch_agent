import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const searchFieldsEnum = z.enum(['name', 'description', 'website', 'publisher_name']);
const orderByEnum = z.enum(['name', 'created_at', 'episode_count', 'rating', 'audience_size']);
const orderDirEnum = z.enum(['asc', 'desc']);

const inputSchema = z.object({
  query: z.string().describe('Search query. Use " for exact phrases, * for wildcards'),
  categoryIds: z.string().optional().describe('Comma-separated list of category IDs'),
  perPage: z.number().min(1).max(100).optional().default(10).describe('Results per page (1-100)'),
  orderBy: orderByEnum.optional().default('rating').describe('Field to order by'),
  orderDir: orderDirEnum.optional().default('desc').describe('Order direction'),
  searchFields: z.array(searchFieldsEnum).optional().describe('Fields to search in'),
  language: z.string().optional().describe('Language code (e.g., en, es, fr)'),
  region: z.string().optional().describe('Region code (e.g., US, GB, FR)'),
  minAudienceSize: z.number().optional().describe('Minimum audience size'),
  maxAudienceSize: z.number().optional().describe('Maximum audience size'),
  minEpisodeCount: z.number().optional().describe('Minimum number of episodes'),
  maxEpisodeCount: z.number().optional().describe('Maximum number of episodes'),
  hasGuests: z.boolean().optional().describe('Filter podcasts with interviews'),
  hasSponsors: z.boolean().optional().describe('Filter podcasts with sponsors'),
  page: z.number().min(1).optional().default(1).describe('Page number'),
});

type InputType = z.infer<typeof inputSchema>;

const podcastSchema = z.object({
  podcast_id: z.string(),
  podcast_guid: z.string(),
  podcast_name: z.string(),
  podcast_url: z.string(),
  podcast_description: z.string(),
  podcast_image_url: z.string(),
  podcast_categories: z.record(z.string()),
  publisher_name: z.string(),
  reach: z.object({
    itunes: z.object({
      itunes_rating_average: z.string().optional(),
      itunes_rating_count: z.string().optional(),
      itunes_rating_count_bracket: z.string().optional(),
    }).optional(),
    spotify: z.object({
      spotify_rating_average: z.string().optional(),
      spotify_rating_count: z.string().optional(),
      spotify_rating_count_bracket: z.string().optional(),
    }).optional(),
    audience_size: z.number().optional(),
    social_links: z.array(z.object({
      platform: z.string(),
      url: z.string(),
    })).optional(),
    email: z.string().optional(),
    website: z.string().optional(),
  }),
  is_active: z.boolean(),
  rss_url: z.string(),
  episode_count: z.number(),
  last_posted_at: z.string(),
  language: z.string(),
  region: z.string(),
  last_scanned_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const paginationSchema = z.object({
  total: z.string(),
  per_page: z.string(),
  current_page: z.string(),
  last_page: z.string(),
  from: z.string(),
  to: z.string(),
});

export const podcastTool = createTool({
  id: 'search-podcasts',
  description: 'Search for podcasts using the Podscan API with advanced filtering options.',
  inputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    podcasts: z.array(podcastSchema).optional(),
    pagination: paginationSchema.optional(),
    error: z.string().optional(),
    debug: z.string().optional(),
  }).describe('Result of the podcast search'),
  execute: async ({ context }: { context: InputType }) => {
    if (!process.env.PODSCAN_API_KEY) {
      return {
        success: false,
        error: 'Missing Podscan API key',
        debug: 'Required environment variable: PODSCAN_API_KEY'
      };
    }

    try {
      const params = new URLSearchParams({
        query: context.query,
        ...(context.categoryIds && { category_ids: context.categoryIds }),
        ...(context.perPage && { per_page: context.perPage.toString() }),
        ...(context.orderBy && { order_by: context.orderBy }),
        ...(context.orderDir && { order_dir: context.orderDir }),
        ...(context.searchFields && { search_fields: context.searchFields.join(',') }),
        ...(context.language && { language: context.language }),
        ...(context.region && { region: context.region }),
        ...(context.minAudienceSize && { min_audience_size: context.minAudienceSize.toString() }),
        ...(context.maxAudienceSize && { max_audience_size: context.maxAudienceSize.toString() }),
        ...(context.minEpisodeCount && { min_episode_count: context.minEpisodeCount.toString() }),
        ...(context.maxEpisodeCount && { max_episode_count: context.maxEpisodeCount.toString() }),
        ...(context.hasGuests !== undefined && { has_guests: context.hasGuests.toString() }),
        ...(context.hasSponsors !== undefined && { has_sponsors: context.hasSponsors.toString() }),
        ...(context.page && { page: context.page.toString() }),
      });

      const response = await fetch(`https://api.podscan.ai/podcasts/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${process.env.PODSCAN_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Podscan API error: ${response.statusText}`);
      }

      const data = await response.json() as { podcasts: any[]; pagination: any };

      return {
        success: true,
        podcasts: data.podcasts,
        pagination: data.pagination,
        error: '',
        debug: 'Search completed successfully'
      };
    } catch (error) {
      console.error('Error in podcast tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        debug: `Full error: ${JSON.stringify(error, null, 2)}`
      };
    }
  }
}); 