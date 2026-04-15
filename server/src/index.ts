import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DEMO_USERS = [
  { id: '1', email: 'demo@orcleans.pt', password: 'demo123', name: 'Demo User', role: 'admin', organizationId: 'org-1', organizationName: 'Demo Org' }
];

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'demo' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password são obrigatórios' });
  }

  const user = DEMO_USERS.find(u => u.email === email && u.password === password);
  if (user) {
    return res.json({
      accessToken: 'demo-access-' + Date.now(),
      refreshToken: 'demo-refresh-' + Date.now(),
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
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password e name são obrigatórios' });
  }
  return res.status(201).json({
    accessToken: 'demo-access-' + Date.now(),
    refreshToken: 'demo-refresh-' + Date.now(),
    user: {
      id: 'new-' + Date.now(),
      name,
      email,
      role: 'member',
      organizationId: 'org-1',
      organizationName: 'New Org'
    }
  });
});

app.get('/api/auth/me', (req, res) => {
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