import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

let env;
try {
  const { env: e } = await import('./config/env.js');
  env = e;
} catch (e) {
  console.warn('[ENV] Using default env');
  env = {
    PORT: 3333,
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    NODE_ENV: 'production'
  };
}

import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import scanRoutes from './routes/scan.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined'));

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 900000,
  max: env.RATE_LIMIT_MAX_REQUESTS || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tente novamente mais tarde.' },
});

app.use('/api/', limiter);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

const port = env.PORT || 3333;

app.listen(port, () => {
  console.log(`[ORCA API] Server running on http://localhost:${port}`);
});

export default app;