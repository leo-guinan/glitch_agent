import express from 'express';
import { mastra } from './mastra';
import { apiRouter } from './mastra/server';

const app = express();
const port = process.env.PORT || 4111;

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Mount API routes
app.use('/api', apiRouter);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Initialize Mastra after server starts
  console.log('Initializing Mastra...');
  const workflow = mastra.getWorkflow('glitchWorkflow');
  if (workflow) {
    console.log('Found glitchWorkflow, initializing...');
    // Just log workflow initialization for now
    console.log('Workflow initialized');
  } else {
    console.error('Failed to find glitchWorkflow');
  }
}); 