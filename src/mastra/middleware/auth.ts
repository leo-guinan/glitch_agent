import { Request, Response, NextFunction, RequestHandler } from 'express';

interface ApiKey {
  key: string;
  name: string;
  permissions: string[];
}

const API_KEYS: ApiKey[] = [];

export function loadApiKeys() {
  const apiKeysStr = process.env.API_KEYS;
  if (!apiKeysStr) {
    console.warn('No API keys configured');
    return;
  }

  try {
    // Format: key1:name1:perm1,perm2|key2:name2:perm1,perm2
    const keyConfigs = apiKeysStr.split('|');
    keyConfigs.forEach(config => {
      const [key, name, permsStr] = config.split(':');
      if (key && name) {
        API_KEYS.push({
          key,
          name,
          permissions: permsStr ? permsStr.split(',') : ['*']
        });
      }
    });
    console.log(`Loaded ${API_KEYS.length} API keys`);
  } catch (error) {
    console.error('Error loading API keys:', error);
  }
}

export const validateApiKey: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  const keyConfig = API_KEYS.find(k => k.key === apiKey);
  if (!keyConfig) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  // Add key info to request for logging/tracking
  (req as any).apiKeyName = keyConfig.name;
  
  // Check permissions if specified
  const requiredPermission = req.path.split('/')[1]; // e.g., /agents -> agents
  if (keyConfig.permissions[0] !== '*' && !keyConfig.permissions.includes(requiredPermission)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  next();
}; 