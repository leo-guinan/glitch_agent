import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
  external: [
    // Node.js built-in modules
    'path',
    'fs',
    'crypto',
    'util',
    'stream',
    'events',
    'http',
    'https',
    'net',
    'tls',
    'os',
    'child_process',
    // External packages
    '@mastra/core/*',
    'dotenv',
    'express',
    'body-parser',
    'zod',
    'openai',
    'twitter-api-v2',
    '@upstash/redis',
    '@ai-sdk/openai',
    'loops',
  ]
}); 