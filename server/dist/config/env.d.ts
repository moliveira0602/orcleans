import 'dotenv/config';
import { z } from 'zod';
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    JWT_SECRET: z.ZodDefault<z.ZodString>;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_SECRET: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    CORS_ORIGIN: z.ZodDefault<z.ZodString>;
    RATE_LIMIT_WINDOW_MS: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_MAX_REQUESTS: z.ZodDefault<z.ZodNumber>;
    LOG_LEVEL: z.ZodDefault<z.ZodString>;
    GOOGLE_API_KEY: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
    CORS_ORIGIN: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    LOG_LEVEL: string;
    GOOGLE_API_KEY: string;
    DATABASE_URL?: string | undefined;
}, {
    NODE_ENV?: "development" | "production" | "test" | undefined;
    DATABASE_URL?: string | undefined;
    PORT?: number | undefined;
    JWT_SECRET?: string | undefined;
    JWT_EXPIRES_IN?: string | undefined;
    JWT_REFRESH_SECRET?: string | undefined;
    JWT_REFRESH_EXPIRES_IN?: string | undefined;
    CORS_ORIGIN?: string | undefined;
    RATE_LIMIT_WINDOW_MS?: number | undefined;
    RATE_LIMIT_MAX_REQUESTS?: number | undefined;
    LOG_LEVEL?: string | undefined;
    GOOGLE_API_KEY?: string | undefined;
}>;
export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
    CORS_ORIGIN: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    LOG_LEVEL: string;
    GOOGLE_API_KEY: string;
    DATABASE_URL?: string | undefined;
};
//# sourceMappingURL=env.d.ts.map