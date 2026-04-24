"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.envSchema = void 0;
require("dotenv/config");
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(3333),
    DATABASE_URL: zod_1.z.string().optional(),
    JWT_SECRET: zod_1.z.string().default('default-secret-change-in-production'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_SECRET: zod_1.z.string().default('default-refresh-secret'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(900000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().default(100),
    LOG_LEVEL: zod_1.z.string().default('info'),
    GOOGLE_API_KEY: zod_1.z.string().default(''),
});
const result = exports.envSchema.safeParse(process.env);
if (!result.success) {
    console.warn('[ENV] Invalid env variables, using defaults:', result.error.issues);
}
exports.env = result.success ? result.data : exports.envSchema.parse({});
//# sourceMappingURL=env.js.map