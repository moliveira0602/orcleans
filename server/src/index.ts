import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import type { Router as ExpressRouter } from 'express';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check - always available
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Lazy route loaders — cache the router after first load
let _authRouter: ExpressRouter | null = null;
let _leadRouter: ExpressRouter | null = null;
let _adminRouter: ExpressRouter | null = null;
let _scanRouter: ExpressRouter | null = null;

async function getAuthRouter(): Promise<ExpressRouter> {
  if (!_authRouter) {
    const m = await import('./routes/auth.js');
    _authRouter = m.default;
  }
  return _authRouter;
}

async function getLeadRouter(): Promise<ExpressRouter> {
  if (!_leadRouter) {
    const m = await import('./routes/leads.js');
    _leadRouter = m.default;
  }
  return _leadRouter;
}

async function getAdminRouter(): Promise<ExpressRouter> {
  if (!_adminRouter) {
    const m = await import('./routes/admin.js');
    _adminRouter = m.default;
  }
  return _adminRouter;
}

async function getScanRouter(): Promise<ExpressRouter> {
  if (!_scanRouter) {
    const m = await import('./routes/scan.js');
    _scanRouter = m.default;
  }
  return _scanRouter;
}

// Route handlers that lazy-load on first request
app.use('/api/auth', async (req: Request, res: Response, next: NextFunction) => {
  const router = await getAuthRouter();
  router(req, res, next);
});

app.use('/api/leads', async (req: Request, res: Response, next: NextFunction) => {
  const router = await getLeadRouter();
  router(req, res, next);
});

app.use('/api/admin', async (req: Request, res: Response, next: NextFunction) => {
  const router = await getAdminRouter();
  router(req, res, next);
});

app.use('/api/scan', async (req: Request, res: Response, next: NextFunction) => {
  const router = await getScanRouter();
  router(req, res, next);
});

// OPTIONS handler
app.options('/api/*', (_req: Request, res: Response) => {
  res.status(200).end();
});

export default app;