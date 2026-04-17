import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

// Load environment variables
import './config/env';
import { env } from './config/env';

import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import adminRoutes from './routes/admin';
import scanRoutes from './routes/scan';

const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v12' });
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

app.options('/api/*', (_req: Request, res: Response) => {
  res.status(200).end();
});

export default app;