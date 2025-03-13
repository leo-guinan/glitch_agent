import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { glitchWorkflow } from './workflows';
import { glitchAgent } from './agents';
import { GCPDeployer } from './gcp-deployer.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const logger = createLogger({
  name: 'Mastra',
  level: 'info',
});

export const mastra = new Mastra({
  workflows: { glitchWorkflow },
  agents: { glitchAgent },
  logger,
  //@ts-ignore
  deployer: new GCPDeployer({
      projectId: process.env.GCP_PROJECT_ID || 'your-gcp-project-id',
      zone: process.env.GCP_ZONE || 'us-central1-a',
      instanceName: process.env.GCP_INSTANCE_NAME || 'mastra-app',
      machineType: process.env.GCP_MACHINE_TYPE || 'e2-micro',
      tags: ['http-server', 'https-server', 'mastra-app'],
      metadata: {
        'enable-oslogin': 'false'
      }
    }),
});

