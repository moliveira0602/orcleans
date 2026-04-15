import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import scanRoutes from './routes/scan.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/error.js';

console.log('[SERVER] Starting...');

const app = express();

const ALLOWED_ORIGINS = [
  'https://orca.etos.pt',
  'http://localhost:5173',
  'http://localhost:3333',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else if (ALLOWED_ORIGINS.some(o => origin.endsWith(o.replace('https://', '')))) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
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