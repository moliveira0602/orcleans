import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DEMO_MODE = true;

const DEMO_USERS = [
  { id: '1', email: 'demo@orcleans.pt', password: 'demo123', name: 'Demo User', role: 'admin', organizationId: 'org-1', organizationName: 'Demo Org' }
];

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: DEMO_MODE ? 'demo' : 'production' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password são obrigatórios' });
    }

    if (DEMO_MODE) {
      const user = DEMO_USERS.find(u => u.email === email && u.password === password);
      if (user) {
        const accessToken = 'demo-access-token-' + Date.now();
        const refreshToken = 'demo-refresh-token-' + Date.now();
        return res.json({
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: user.organizationName
          }
        });
      }
      return res.status(401).json({ error: 'Email ou password incorretos' });
    }

    res.json({ message: 'Configure DATABASE_URL in Vercel for production mode' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password e name são obrigatórios' });
    }

    if (DEMO_MODE) {
      const accessToken = 'demo-access-token-' + Date.now();
      const refreshToken = 'demo-refresh-token-' + Date.now();
      return res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          id: 'new-' + Date.now(),
          name,
          email,
          role: 'member',
          organizationId: 'org-1',
          organizationName: 'New Organization'
        }
      });
    }

    res.json({ message: 'Configure DATABASE_URL in Vercel for production mode' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer demo-')) {
    return res.json({
      id: '1',
      name: 'Demo User',
      email: 'demo@orcleans.pt',
      role: 'admin',
      organizationId: 'org-1',
      organizationName: 'Demo Org'
    });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

app.options('/api/*', (_req, res) => {
  res.status(200).end();
});

export default app;