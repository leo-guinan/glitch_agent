import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { glitchWorkflow } from './workflows';
import { glitchAgent } from './agents';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare';

const logger = createLogger({
  name: 'Mastra',
  level: 'info',
});

export const mastra = new Mastra({
  workflows: { glitchWorkflow },
  agents: { glitchAgent },
  logger,
  deployer: new CloudflareDeployer({
    scope: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    projectName: 'glitch-agents',
    auth: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      apiEmail: process.env.CLOUDFLARE_API_EMAIL || '',
    },
  }),
});
