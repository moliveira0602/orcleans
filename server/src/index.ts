import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import adminRoutes from './routes/admin.js';
import scanRoutes from './routes/scan.js';
import { ensureSuperAdminExists } from './utils/ensureSuperAdmin.js';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure super admin exists on startup
ensureSuperAdminExists().catch((err) => console.error('Super admin setup error:', err));

// Mount routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scan', scanRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'production' });
});

// OPTIONS handler for all API routes
app.options('/api/*', (_req, res) => {
  res.status(200).end();
});

export default app;