"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
// Load environment variables
require("./config/env");
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const auth_1 = __importDefault(require("./routes/auth"));
const leads_1 = __importDefault(require("./routes/leads"));
const admin_1 = __importDefault(require("./routes/admin"));
const scan_1 = __importDefault(require("./routes/scan"));
const organizations_1 = __importDefault(require("./routes/organizations"));
const billing_1 = __importDefault(require("./routes/billing"));
const contact_1 = __importDefault(require("./routes/contact"));
const ai_1 = __importDefault(require("./routes/ai"));
const maintenance_1 = require("./middleware/maintenance");
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
exports.app = app;
// Enable secure HTTP headers via Helmet
app.use((0, helmet_1.default)());
const corsOrigins = env_1.env.CORS_ORIGIN
    .split(',')
    .map(s => s.replaceAll('\\n', '').replaceAll('\n', '').trim())
    .filter(Boolean);
console.log('[ORCA API] CORS Origins:', corsOrigins);
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl)
        if (!origin)
            return callback(null, true);
        if (corsOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200,
};
// Handle preflight requests BEFORE all other middleware
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({
    limit: '5mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express_1.default.urlencoded({ extended: true }));
// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Auth endpoints: 20 attempts per 15 min per IP — brute force protection
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas tentativas. Tente novamente em 15 minutos.' },
    skip: (req) => req.method === 'OPTIONS',
});
// API general: 300 requests per minute per IP
const apiLimiter = (0, express_rate_limit_1.default)({
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
app.use('/api', auth_2.tryAuthenticate);
app.use('/api', maintenance_1.maintenanceMode);
// ─────────────────────────────────────────────────────────────────────────────
// Ensure super admin exists on first request (non-blocking, lazy)
let _superAdminChecked = false;
async function ensureSuperAdminOnce() {
    if (_superAdminChecked)
        return;
    try {
        const { ensureSuperAdminExists } = await Promise.resolve().then(() => __importStar(require('./utils/ensureSuperAdmin')));
        await ensureSuperAdminExists();
        _superAdminChecked = true;
    }
    catch (err) {
        console.error('Super admin check failed:', err);
    }
}
// DEBUG: Route to list all registered routes
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug-routes', (req, res) => {
        const routes = [];
        function print(path, layer) {
            if (layer.route) {
                layer.route.stack.forEach((s) => {
                    const method = s.method ? s.method.toUpperCase() : 'ANY';
                    routes.push(`${method} ${path.concat(layer.route.path).filter(Boolean).join('')}`);
                });
            }
            else if (layer.name === 'router' && layer.handle.stack) {
                layer.handle.stack.forEach((l) => {
                    print(path.concat(layer.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', '').replace('\\/', '/')), l);
                });
            }
        }
        app._router.stack.forEach((layer) => {
            print([], layer);
        });
        res.json({
            routes,
            baseUrl: req.baseUrl,
            originalUrl: req.originalUrl,
            path: req.path
        });
    });
}
app.get('/ping', (_req, res) => {
    res.send(`pong - ${new Date().toISOString()} - v3`);
});
app.get('/api/health', async (_req, res) => {
    try {
        await database_1.prisma.$connect();
        res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'V6_STRIPE_FIX' });
    }
    catch (err) {
        console.error('Health check error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
// Ensure super admin exists on first auth/admin request (fire-and-forget)
app.use('/api/auth', (_req, _res, next) => {
    ensureSuperAdminOnce();
    next();
});
app.use('/api/auth', auth_1.default);
app.use('/api/admin', (_req, _res, next) => {
    ensureSuperAdminOnce();
    next();
});
app.use('/api/admin', admin_1.default);
app.use('/api/leads', leads_1.default);
app.use('/api/scan', scan_1.default);
app.use('/api/organizations', organizations_1.default);
app.use('/api/billing', billing_1.default);
app.use('/api/contact', contact_1.default);
app.use('/api/ai', ai_1.default);
// Error handling middleware - MUST BE LAST
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
const PORT = Number(process.env.PORT || env_1.env.PORT || 3333);
// Only start listening when not running in Vercel serverless mode
const server = process.env.VERCEL
    ? undefined
    : app.listen(PORT, '0.0.0.0', () => {
        console.log(`[ORCA API] Server running on http://0.0.0.0:${PORT}`);
        console.log(`[ORCA API] NODE_ENV=${process.env.NODE_ENV}`);
        console.log(`[ORCA API] DB configured: ${process.env.DATABASE_URL ? 'yes' : 'no'}`);
    });
exports.server = server;
exports.default = app;
//# sourceMappingURL=index.js.map