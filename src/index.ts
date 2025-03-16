import express from 'express';
import { mastra } from './mastra';

const app = express();
const port = process.env.PORT || 4111;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Initialize Mastra after server starts
  console.log('Initializing Mastra...');
  const workflow = mastra.getWorkflow('glitchWorkflow');
  if (workflow) {
    workflow.start().catch((error: Error) => {
      console.error('Failed to start Mastra workflow:', error);
    });
  } else {
    console.error('Failed to find glitchWorkflow');
  }
}); 