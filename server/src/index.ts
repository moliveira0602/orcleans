import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

// Load environment variables
import './config/env';
import { env } from './config/env';
import { prisma } from './config/database';

import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import adminRoutes from './routes/admin';
import scanRoutes from './routes/scan';

const app = express();

const corsOrigins = env.CORS_ORIGIN
  .split(',')
  .map(s => s.replaceAll('\\n', '').replaceAll('\n', '').trim())
  .filter(Boolean);
console.log('[ORCA API] CORS Origins:', corsOrigins);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl)
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200,
};

// Handle preflight requests BEFORE all other middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$connect();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v12' });
  } catch (err: any) {
    console.error('Health check error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Ensure super admin exists on first request (non-blocking, lazy)
let _superAdminChecked = false;
async function ensureSuperAdminOnce() {
  if (_superAdminChecked) return;
  try {
    const { ensureSuperAdminExists } = await import('./utils/ensureSuperAdmin');
    await ensureSuperAdminExists();
    _superAdminChecked = true;
  } catch (err) {
    console.error('Super admin check failed:', err);
  }
}

// Ensure super admin exists on first auth/admin request (fire-and-forget)
app.use('/api/auth', (_req: Request, _res: Response, next: NextFunction) => {
  ensureSuperAdminOnce();
  next();
});
app.use('/api/auth', authRoutes);

app.use('/api/admin', (_req: Request, _res: Response, next: NextFunction) => {
  ensureSuperAdminOnce();
  next();
});
app.use('/api/admin', adminRoutes);

app.use('/api/leads', leadRoutes);
app.use('/api/scan', scanRoutes);

const PORT = Number(process.env.PORT || env.PORT || 3333);

// Only start listening when not running in Vercel serverless mode
const server = process.env.VERCEL
  ? undefined
  : app.listen(PORT, '0.0.0.0', () => {
      console.log(`[ORCA API] Server running on http://0.0.0.0:${PORT}`);
      console.log(`[ORCA API] NODE_ENV=${process.env.NODE_ENV}`);
      console.log(`[ORCA API] DB configured: ${process.env.DATABASE_URL ? 'yes' : 'no'}`);
    });

export { app, server };
export default app;