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
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refreshToken = refreshToken;
exports.logout = logout;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.deleteAccount = deleteAccount;
const authService = __importStar(require("../services/authService"));
const jwt_1 = require("../utils/jwt");
async function register(req, res) {
    try {
        const result = await authService.register(req.body);
        return res.status(201).json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function login(req, res) {
    try {
        const result = await authService.login(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(401).json({ error: error.message });
    }
}
async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;
        // Extract userId directly from the refresh token payload (no authenticate middleware on this route)
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        if (!decoded?.sub) {
            return res.status(401).json({ error: 'Refresh token inválido' });
        }
        const result = await authService.refreshTokens(decoded.sub, refreshToken);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(401).json({ error: error.message });
    }
}
async function logout(req, res) {
    try {
        const authReq = req;
        const { refreshToken } = req.body;
        await authService.logout(authReq.userId, refreshToken);
        return res.status(204).send();
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function getProfile(req, res) {
    try {
        const authReq = req;
        const profile = await authService.getProfile(authReq.userId);
        return res.status(200).json(profile);
    }
    catch (error) {
        return res.status(404).json({ error: error.message });
    }
}
async function updateProfile(req, res) {
    try {
        const authReq = req;
        const { name, email, company } = req.body;
        const profile = await authService.updateProfile(authReq.userId, { name, email, company });
        return res.status(200).json(profile);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function deleteAccount(req, res) {
    try {
        const authReq = req;
        const { userId, organizationId } = authReq;
        // Delete all user data (LGPD compliance)
        // This will cascade delete leads, activities, imports, audit logs, etc.
        await authService.deleteAccount(userId, organizationId);
        return res.status(204).send();
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
//# sourceMappingURL=authController.js.map