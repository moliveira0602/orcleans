"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.envSchema = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Load the correct .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), envFile) });
// Also try the default .env as fallback
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(3333),
    DATABASE_URL: zod_1.z.string().optional(),
    JWT_SECRET: zod_1.z.string().refine((val) => {
        if (process.env.NODE_ENV === 'production' && val === 'default-secret-change-in-production') {
            return false;
        }
        return true;
    }, { message: 'JWT_SECRET deve ser alterado e configurado com segurança em produção!' }).default('default-secret-change-in-production'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_SECRET: zod_1.z.string().refine((val) => {
        if (process.env.NODE_ENV === 'production' && val === 'default-refresh-secret') {
            return false;
        }
        return true;
    }, { message: 'JWT_REFRESH_SECRET deve ser alterado e configurado com segurança em produção!' }).default('default-refresh-secret'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(900000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().default(100),
    LOG_LEVEL: zod_1.z.string().default('info'),
    GOOGLE_API_KEY: zod_1.z.string().default(''),
    OPENROUTER_API_KEY: zod_1.z.string().default(''),
    STRIPE_SECRET_KEY: zod_1.z.string().default(''),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().default(''),
});
const result = exports.envSchema.safeParse(process.env);
if (!result.success) {
    console.warn('[ENV] Invalid env variables, using defaults:', result.error.issues);
}
exports.env = result.success ? result.data : exports.envSchema.parse({});
//# sourceMappingURL=env.js.map