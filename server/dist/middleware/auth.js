"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.tryAuthenticate = tryAuthenticate;
exports.authorize = authorize;
exports.requireSuperAdmin = requireSuperAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../config/jwt");
const auth_1 = require("../types/auth");
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.accessSecret);
        req.userId = decoded.sub;
        req.organizationId = decoded.organizationId;
        req.userRole = decoded.role;
        // Prevent aggressive caching of authenticated routes (CDN or Browser side)
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        return next();
    }
    catch {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}
async function tryAuthenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.accessSecret);
        req.userId = decoded.sub;
        req.organizationId = decoded.organizationId;
        req.userRole = decoded.role;
        // Compatibility with other middleware expectations
        req.user = {
            id: decoded.sub,
            role: decoded.role,
            organizationId: decoded.organizationId
        };
    }
    catch {
        // Ignore errors for tryAuthenticate
    }
    next();
}
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.userRole || !allowedRoles.includes(req.userRole)) {
            return res.status(403).json({ error: 'Permissão negada' });
        }
        return next();
    };
}
function requireSuperAdmin(req, res, next) {
    if (!req.userRole || !(0, auth_1.isSuperAdmin)(req.userRole)) {
        return res.status(403).json({ error: 'Acesso restrito a Super Admin' });
    }
    return next();
}
//# sourceMappingURL=auth.js.map