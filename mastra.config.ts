import { Mastra } from '@mastra/core';
import { VercelDeployer } from '@mastra/deployer-vercel';

export default new Mastra({
  deployer: new VercelDeployer({
    teamId: process.env.VERCEL_TEAM_ID,
    projectName: process.env.VERCEL_PROJECT_NAME,
    token: process.env.VERCEL_TOKEN
  })
}); 