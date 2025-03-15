import { Router } from 'express';
import { TwitterApi } from 'twitter-api-v2';

const router = Router();

// Store oauth tokens temporarily (in production, use a proper session store)
const STATE_STORE = new Map<string, { oauth_token: string; oauth_token_secret: string }>();

router.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Twitter Auth</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 0 20px; }
          button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Twitter Authentication</h1>
        <p>Click below to authenticate your Twitter bot account:</p>
        <button onclick="window.location.href='/twitter/auth'">Authenticate with Twitter</button>
      </body>
    </html>
  `);
});

router.get('/auth', async (req, res) => {
  try {
    const client = new TwitterApi({ 
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
    });

    const authLink = await client.generateAuthLink('http://localhost:4111/twitter/callback');
    
    // Store the tokens
    STATE_STORE.set(authLink.oauth_token, {
      oauth_token: authLink.oauth_token,
      oauth_token_secret: authLink.oauth_token_secret,
    });

    // Redirect user to Twitter auth page
    res.redirect(authLink.url);
  } catch (error) {
    console.error('Twitter auth error:', error);
    res.status(500).json({ error: 'Failed to initialize Twitter auth' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.query;
    
    if (!oauth_token || !oauth_verifier || typeof oauth_token !== 'string' || typeof oauth_verifier !== 'string') {
      throw new Error('Missing oauth_token or oauth_verifier');
    }

    // Get stored tokens
    const stored = STATE_STORE.get(oauth_token);
    if (!stored) {
      throw new Error('No stored tokens found');
    }

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: stored.oauth_token,
      accessSecret: stored.oauth_token_secret,
    });

    const { accessToken, accessSecret } = await client.login(oauth_verifier);

    // Clean up stored state
    STATE_STORE.delete(oauth_token);

    // Return the tokens
    res.json({
      success: true,
      accessToken,
      accessSecret,
      message: 'Successfully authenticated! Use these tokens in your .env file:',
      env_format: `TWITTER_ACCESS_TOKEN=${accessToken}\nTWITTER_ACCESS_SECRET=${accessSecret}`
    });
  } catch (error) {
    console.error('Twitter callback error:', error);
    res.status(500).json({ error: 'Failed to complete Twitter auth' });
  }
});

export const twitterAuthRouter = router; 