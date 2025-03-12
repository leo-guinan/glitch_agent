import { createTool } from '@mastra/core/tools';
import { LoopsClient, APIError } from 'loops';
import { z } from 'zod';

export const emailTool = createTool({
  id: 'send-email',
  description: 'Send emails and manage contacts through Loops. Use this to send transactional emails, manage your contact list, or trigger email-based events.',
  inputSchema: z.object({
    action: z.enum(['sendTransactional', 'createContact', 'sendEvent']),
    email: z.string(),
    transactionalId: z.literal('cm83wsxf1048xemss24c0ub6e'),
    dataVariables: z.string(),
    addToAudience: z.boolean(),
    properties: z.string(),
    mailingLists: z.string(),
    eventName: z.string(),
    userId: z.string(),
    contactProperties: z.string(),
    eventProperties: z.string(),
  }).describe('Input parameters for the email tool'),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
    debug: z.string().optional(),
  }).describe('Result of the email operation'),
  execute: async ({ context }) => {
    console.log('Email tool called with context:', JSON.stringify(context, null, 2));
    
    if (!process.env.LOOPS_API_KEY) {
      console.error('Missing LOOPS_API_KEY environment variable');
      return { success: false, error: 'LOOPS_API_KEY environment variable is required', debug: 'Missing API key' };
    }
    
    const client = new LoopsClient(process.env.LOOPS_API_KEY);
    console.log('Initialized Loops client');

    try {
      switch (context.action) {
        case 'sendTransactional': {
          console.log('Attempting to send transactional email');
          if (!context.email || !context.transactionalId) {
            console.error('Missing required fields for sendTransactional:', { email: context.email, transactionalId: context.transactionalId });
            return { 
              success: false, 
              error: 'Email and transactionalId are required for sending transactional emails',
              debug: `Missing fields: ${!context.email ? 'email ' : ''}${!context.transactionalId ? 'transactionalId' : ''}`
            };
          }
          
          const payload = {
            transactionalId: context.transactionalId,
            email: context.email,
            dataVariables: context.dataVariables ? safeJsonParse(context.dataVariables) : {},
            addToAudience: context.addToAudience ?? false,
          };
          console.log('Sending transactional email with payload:', JSON.stringify(payload, null, 2));
          
          const response = await client.sendTransactionalEmail(payload);
          console.log('Transactional email response:', JSON.stringify(response, null, 2));
          return { success: true, debug: 'Email sent successfully' };
        }

        case 'createContact': {
          console.log('Attempting to create contact');
          if (!context.email) {
            console.error('Missing email for createContact');
            return { success: false, error: 'Email is required for creating contacts', debug: 'Missing email field' };
          }
          
          const properties = context.properties ? safeJsonParse(context.properties) : undefined;
          const mailingLists = context.mailingLists ? safeJsonParse(context.mailingLists) : undefined;
          console.log('Creating contact with:', { 
            email: context.email, 
            properties, 
            mailingLists 
          });
          
          const response = await client.createContact(
            context.email,
            properties,
            mailingLists
          );
          console.log('Create contact response:', JSON.stringify(response, null, 2));
          return { success: true, debug: 'Contact created successfully' };
        }

        case 'sendEvent': {
          console.log('Attempting to send event');
          if (!context.eventName) {
            console.error('Missing eventName for sendEvent');
            return { success: false, error: 'Event name is required for sending events', debug: 'Missing eventName field' };
          }
          if (!context.email && !context.userId) {
            console.error('Missing email/userId for sendEvent');
            return { success: false, error: 'Either email or userId is required for sending events', debug: 'Missing both email and userId fields' };
          }
          
          const payload = {
            email: context.email,
            userId: context.userId,
            eventName: context.eventName,
            ...(context.contactProperties ? { contactProperties: safeJsonParse(context.contactProperties) } : {}),
            ...(context.eventProperties ? { eventProperties: safeJsonParse(context.eventProperties) } : {}),
            ...(context.mailingLists ? { mailingLists: safeJsonParse(context.mailingLists) } : {})
          };
          console.log('Sending event with payload:', JSON.stringify(payload, null, 2));
          
          const response = await client.sendEvent(payload);
          console.log('Send event response:', JSON.stringify(response, null, 2));
          return { success: true, debug: 'Event sent successfully' };
        }

        default:
          console.error('Invalid action specified:', context.action);
          return { success: false, error: 'Invalid action specified', debug: `Unknown action: ${context.action}` };
      }
    } catch (error) {
      console.error('Error in email tool:', error);
      if (error instanceof APIError) {
        const errorMessage = error.json?.message || error.message || 'Unknown error';
        const errorDetails = error.json?.details ? `: ${JSON.stringify(error.json.details)}` : '';
        const debug = `Full error: ${JSON.stringify(error, null, 2)}`;
        return { 
          success: false, 
          error: `Loops API error: ${errorMessage}${errorDetails}`,
          debug
        };
      }
      throw error;
    }
  },
});

function safeJsonParse(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    // If it's not valid JSON, return the string as is
    return str;
  }
} 