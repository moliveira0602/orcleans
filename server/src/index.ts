import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const NODE_ENV = process.env.NODE_ENV || 'production';
const IS_DEMO = NODE_ENV === 'development';
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const DEMO_USERS = [
  { id: '1', email: 'demo@orcleans.pt', password: 'demo123', name: 'Demo User', role: 'admin', organizationId: 'org-1', organizationName: 'Demo Org' }
];

app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    nodeEnv: NODE_ENV,
    hasDb: !!DATABASE_URL,
    demoMode: IS_DEMO
  });
});

const findUserByEmail = async (email: string) => {
  if (!DATABASE_URL) return null;
  const { prisma } = await import('./config/database.js');
  return prisma.user.findUnique({ where: { email } });
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password são obrigatórios' });
    }

    if (IS_DEMO || !DATABASE_URL) {
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

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou password incorretos' });
    }

    const bcrypt = await import('bcrypt');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou password incorretos' });
    }

    const jwt = await import('jsonwebtoken');
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET || JWT_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: 'Org'
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password e name são obrigatórios' });
    }

    if (IS_DEMO || !DATABASE_URL) {
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

    const { hashPassword } = await import('./utils/crypto.js');
    const passwordHash = await hashPassword(password);
    const { prisma } = await import('./config/database.js');

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        organizationId: 'org-1',
        role: 'member'
      }
    });

    const jwt = await import('jsonwebtoken');
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET || JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: 'Org'
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (auth.startsWith('Bearer demo-')) {
    return res.json({
      id: '1',
      name: 'Demo User',
      email: 'demo@orcleans.pt',
      role: 'admin',
      organizationId: 'org-1',
      organizationName: 'Demo Org'
    });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const decoded: any = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { prisma } = await import('./config/database.js');
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: 'Org'
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.options('/api/*', (_req, res) => {
  res.status(200).end();
});

export default app;