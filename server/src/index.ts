import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Load environment variables
import './config/env';
import { env } from './config/env';
import { prisma } from './config/database';

import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import adminRoutes from './routes/admin';
import scanRoutes from './routes/scan';
import organizationRoutes from './routes/organizations';
import billingRoutes from './routes/billing';
import contactRoutes from './routes/contact';
import { maintenanceMode } from './middleware/maintenance';
import { tryAuthenticate } from './middleware/auth';

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

app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Auth endpoints: 20 attempts per 15 min per IP — brute force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas. Tente novamente em 15 minutos.' },
  skip: (req) => req.method === 'OPTIONS',
});

// API general: 300 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de pedidos atingido. Tente novamente em breve.' },
  skip: (req) => req.method === 'OPTIONS',
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);
app.use('/api', tryAuthenticate);
app.use('/api', maintenanceMode);
// ─────────────────────────────────────────────────────────────────────────────

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

// DEBUG: Route to list all registered routes
app.get('/api/debug-routes', (req: Request, res: Response) => {
  const routes: any[] = [];
  
  function print(path: string[], layer: any) {
    if (layer.route) {
      layer.route.stack.forEach((s: any) => {
        const method = s.method ? s.method.toUpperCase() : 'ANY';
        routes.push(`${method} ${path.concat(layer.route.path).filter(Boolean).join('')}`);
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach((l: any) => {
        print(path.concat(layer.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', '').replace('\\/', '/')), l);
      });
    }
  }

  (app as any)._router.stack.forEach((layer: any) => {
    print([], layer);
  });

  res.json({
    routes,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    path: req.path
  });
});

app.get('/ping', (_req: Request, res: Response) => {
  res.send(`pong - ${new Date().toISOString()} - v3`);
});

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$connect();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'V6_STRIPE_FIX' });
  } catch (err: any) {
    console.error('Health check error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

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
app.use('/api/organizations', organizationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/contact', contactRoutes);

// Error handling middleware - MUST BE LAST
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

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