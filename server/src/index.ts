import express from 'express';
import cors from 'cors';

// Import routes — these do NOT connect to DB on import (Prisma is lazy)
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import adminRoutes from './routes/admin.js';
import scanRoutes from './routes/scan.js';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ensure super admin exists on first request (non-blocking, lazy)
let _superAdminChecked = false;
async function ensureSuperAdminOnce() {
  if (_superAdminChecked) return;
  try {
    const { ensureSuperAdminExists } = await import('./utils/ensureSuperAdmin.js');
    await ensureSuperAdminExists();
    _superAdminChecked = true;
  } catch {
    // ignore — will retry
  }
}

// Mount routes
// Ensure super admin exists on first auth/admin request (fire-and-forget)
app.use('/api/auth', (_req, _res, next) => {
  ensureSuperAdminOnce();
  next();
});
app.use('/api/auth', authRoutes);

app.use('/api/admin', (_req, _res, next) => {
  ensureSuperAdminOnce();
  next();
});
app.use('/api/admin', adminRoutes);

app.use('/api/leads', leadRoutes);
app.use('/api/scan', scanRoutes);

app.options('/api/*', (_req, res) => {
  res.status(200).end();
});

export default app;