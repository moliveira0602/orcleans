import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import scanRoutes from './routes/scan.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(helmet());

const origins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [...origins, 'https://orca.etos.pt', 'https://www.orca.etos.pt'];
    if (!origin || allowedOrigins.some((o) => o === origin || o === '*' || origin.endsWith('.vercel.app') || origin.endsWith('.vercel.com'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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