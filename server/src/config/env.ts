import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().default('default-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('default-refresh-secret'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  LOG_LEVEL: z.string().default('info'),
  GOOGLE_API_KEY: z.string().default(''),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.warn('[ENV] Invalid env variables, using defaults:', result.error.issues);
}

export const env = result.success ? result.data : envSchema.parse({});