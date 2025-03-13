import express, { Request, Response, Router, RequestHandler } from 'express';
import { validateApiKey, loadApiKeys } from './middleware/auth';
import { mastra } from './index';

// API request interfaces
interface GenerateRequest {
  messages: Array<{
    content: string;
    role: string;
    id: string;
  }>;
}

interface GenerateParams {
  agentId: string;
}

interface GenerateResponse {
  text: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

const app = express();
const port = process.env.PORT || 4111;

// Load API keys from environment
loadApiKeys();

// Middleware
app.use(express.json());

// Health check endpoint (no auth required)
const healthCheck: RequestHandler = (_req, res) => {
  res.json({ status: 'ok' });
};
app.get('/health', healthCheck);

// Apply API key validation to all /api routes
const apiRouter = Router();
apiRouter.use(validateApiKey);

// Protected routes
const generateResponse: RequestHandler<
  GenerateParams,
  GenerateResponse | ErrorResponse,
  GenerateRequest
> = async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = (mastra as any).agents[agentId];
    
    if (!agent) {
      res.status(404).json({ error: `Agent ${agentId} not found` });
      return;
    }

    const response = await agent.stream(req.body.messages[0].content);
    res.json({ text: response.text });
  } catch (error) {
    console.error('Error in generate endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

apiRouter.post('/agents/:agentId/generate', generateResponse);

// Mount API routes
app.use('/api', apiRouter);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 