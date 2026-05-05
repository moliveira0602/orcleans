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
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const crypto_1 = require("../utils/crypto");
const auditService_1 = require("../services/auditService");
function getParamId(params) {
    const id = params.id;
    return Array.isArray(id) ? id[0] : id;
}
function getQueryString(query, key) {
    const val = query[key];
    if (!val)
        return undefined;
    return Array.isArray(val) ? val[0] : val;
}
const router = (0, express_1.Router)();
router.options('*', (_req, res) => res.status(200).end());
// Heartbeat: available to ANY authenticated user
router.post('/users/:id/heartbeat', auth_1.authenticate, async (req, res) => {
    try {
        const id = getParamId(req.params);
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        await database_1.prisma.user.update({
            where: { id },
            data: { lastSeenAt: new Date() },
        });
        res.json({ status: 'ok' });
    }
    catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Erro ao atualizar presença' });
    }
});
// All routes below require super_admin
router.use(auth_1.authenticate);
router.use(auth_1.requireSuperAdmin);
async function logAudit(req, action, entityType, entityId, details) {
    await (0, auditService_1.createAuditLog)({
        userId: req.userId,
        userEmail: req.headers['x-user-email'] || undefined,
        action,
        entityType,
        entityId,
        details,
        organizationId: req.organizationId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
    });
}
router.get('/stats', async (_req, res) => {
    try {
        const [totalOrganizations, totalUsers, totalLeads, activeUsers, recentLogs,] = await Promise.all([
            database_1.prisma.organization.count(),
            database_1.prisma.user.count(),
            database_1.prisma.lead.count(),
            database_1.prisma.user.count({ where: { isActive: true } }),
            database_1.prisma.auditLog.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
        ]);
        const organizations = await database_1.prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
                maxLeads: true,
                maxImportBatch: true,
                _count: {
                    select: { users: true, leads: true },
                },
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            totalOrganizations,
            totalUsers,
            totalLeads,
            activeUsers,
            recentLogs,
            organizations,
        });
    }
    catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
});
// Debug endpoint: Get current user's organization settings
router.get('/debug/org-settings', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.organizationId) {
            return res.status(400).json({ error: 'Organização não encontrada' });
        }
        const org = await database_1.prisma.organization.findUnique({
            where: { id: req.organizationId },
            select: {
                id: true,
                name: true,
                plan: true,
                maxLeads: true,
                maxImportBatch: true,
                maxUsers: true,
            },
        });
        res.json(org);
    }
    catch (error) {
        console.error('Debug org settings error:', error);
        res.status(500).json({ error: 'Erro ao obter settings' });
    }
});
// Advanced stats for Super Admin - métricas detalhadas de uso
router.get('/stats/advanced', async (_req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        // Leads stats
        const [totalLeads, leadsToday, leadsThisWeek, leadsThisMonth, leadsByUser, leadsByOrganization,] = await Promise.all([
            database_1.prisma.lead.count(),
            database_1.prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
            database_1.prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
            database_1.prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
            // Leads por usuário (com userId)
            database_1.prisma.lead.groupBy({
                by: ['userId'],
                _count: true,
                where: { userId: { not: null } },
            }),
            // Leads por organização
            database_1.prisma.lead.groupBy({
                by: ['organizationId'],
                _count: true,
            }),
        ]);
        // Users stats
        const [totalUsers, usersActive, usersToday, usersThisWeek,] = await Promise.all([
            database_1.prisma.user.count(),
            database_1.prisma.user.count({ where: { isActive: true } }),
            database_1.prisma.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
            database_1.prisma.user.count({ where: { lastLoginAt: { gte: weekStart } } }),
        ]);
        // Activities this week
        const activitiesThisWeek = await database_1.prisma.activity.count({
            where: { createdAt: { gte: weekStart } },
        });
        // Top users by leads created
        const userLeads = await database_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                organization: { select: { name: true } },
                _count: { select: { activities: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const usersWithLeadCount = await Promise.all(userLeads.map(async (user) => {
            const leadCount = await database_1.prisma.lead.count({
                where: { userId: user.id },
            });
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                organizationName: user.organization.name,
                leadsCreated: leadCount,
                activitiesCount: user._count.activities,
            };
        }));
        // Top organizations by leads
        const orgsWithLeads = await database_1.prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
                _count: { select: { leads: true, users: true } },
            },
            orderBy: { leads: { _count: 'desc' } },
            take: 10,
        });
        // Pipeline distribution
        const pipelineDistribution = await database_1.prisma.lead.groupBy({
            by: ['pipelineStage'],
            _count: true,
        });
        // Score distribution
        const scoreRanges = await Promise.all([
            database_1.prisma.lead.count({ where: { score: { gte: 9 } } }),
            database_1.prisma.lead.count({ where: { score: { gte: 7, lt: 9 } } }),
            database_1.prisma.lead.count({ where: { score: { gte: 5, lt: 7 } } }),
            database_1.prisma.lead.count({ where: { score: { lt: 5 } } }),
        ]);
        res.json({
            leads: {
                total: totalLeads,
                today: leadsToday,
                thisWeek: leadsThisWeek,
                thisMonth: leadsThisMonth,
                byUser: leadsByUser.map((u) => ({ userId: u.userId, count: u._count })),
                byOrganization: leadsByOrganization.map((o) => ({ organizationId: o.organizationId, count: o._count })),
            },
            users: {
                total: totalUsers,
                active: usersActive,
                loginToday: usersToday,
                loginThisWeek: usersThisWeek,
            },
            activities: {
                thisWeek: activitiesThisWeek,
            },
            topUsers: usersWithLeadCount
                .sort((a, b) => b.leadsCreated - a.leadsCreated)
                .slice(0, 10),
            topOrganizations: orgsWithLeads.map((o) => ({
                id: o.id,
                name: o.name,
                plan: o.plan,
                leads: o._count.leads,
                users: o._count.users,
            })),
            pipeline: pipelineDistribution.reduce((acc, p) => {
                acc[p.pipelineStage] = p._count;
                return acc;
            }, {}),
            scoreDistribution: {
                excellent: scoreRanges[0], // 9-10
                good: scoreRanges[1], // 7-8
                fair: scoreRanges[2], // 5-6
                poor: scoreRanges[3], // <5
            },
        });
    }
    catch (error) {
        console.error('Admin advanced stats error:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas avançadas' });
    }
});
router.get('/health', async (_req, res) => {
    try {
        const start = Date.now();
        await database_1.prisma.$queryRaw `SELECT 1`;
        const dbLatency = Date.now() - start;
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: 'connected',
                latency: dbLatency,
            },
            memory: process.memoryUsage(),
            nodeVersion: process.version,
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: 'Database connection failed',
        });
    }
});
router.get('/users', async (_req, res) => {
    try {
        const users = await database_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                lastSeenAt: true,
                createdAt: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        plan: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const usersWithLeads = await Promise.all(users.map(async (user) => {
            const leadCount = await database_1.prisma.lead.count({
                where: { organizationId: user.organization.id },
            });
            return { ...user, leadCount };
        }));
        res.json(usersWithLeads);
    }
    catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Erro ao listar utilizadores' });
    }
});
router.post('/users', async (req, res) => {
    try {
        const { name, email, password, organizationId, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }
        if (!organizationId) {
            return res.status(400).json({ error: 'Organização é obrigatória' });
        }
        const existing = await database_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existing) {
            return res.status(400).json({ error: 'Email já registado' });
        }
        const org = await database_1.prisma.organization.findUnique({ where: { id: organizationId } });
        if (!org) {
            return res.status(400).json({ error: 'Organização não encontrada' });
        }
        const userCount = await database_1.prisma.user.count({ where: { organizationId } });
        if (userCount >= org.maxUsers) {
            return res.status(400).json({ error: `Limite de ${org.maxUsers} utilizadores atingido para esta organização` });
        }
        const passwordHash = await (0, crypto_1.hashPassword)(password);
        const user = await database_1.prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                passwordHash,
                organizationId,
                role: role || 'member',
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                organization: {
                    select: { id: true, name: true, plan: true },
                },
            },
        });
        await logAudit(req, auditService_1.AUDIT_ACTIONS.USER_CREATED, 'user', user.id, { name: user.name, email: user.email, role: user.role });
        res.status(201).json(user);
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Erro ao criar utilizador' });
    }
});
router.patch('/users/:id/toggle', async (req, res) => {
    try {
        const id = getParamId(req.params);
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const user = await database_1.prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }
        const updated = await database_1.prisma.user.update({
            where: { id },
            data: { isActive: !user.isActive },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                organization: {
                    select: { id: true, name: true, plan: true },
                },
            },
        });
        await logAudit(req, updated.isActive ? auditService_1.AUDIT_ACTIONS.USER_ACTIVATED : auditService_1.AUDIT_ACTIONS.USER_DEACTIVATED, 'user', id, { name: user.name });
        res.json(updated);
    }
    catch (error) {
        console.error('Toggle user error:', error);
        res.status(500).json({ error: 'Erro ao atualizar utilizador' });
    }
});
router.patch('/users/:id/reset-password', async (req, res) => {
    try {
        const id = getParamId(req.params);
        const { newPassword } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'Password deve ter pelo menos 8 caracteres' });
        }
        const user = await database_1.prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }
        const passwordHash = await (0, crypto_1.hashPassword)(newPassword);
        await database_1.prisma.user.update({
            where: { id },
            data: { passwordHash },
        });
        await logAudit(req, auditService_1.AUDIT_ACTIONS.PASSWORD_RESET, 'user', id, { name: user.name, email: user.email });
        res.json({ message: 'Password redefinida com sucesso' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erro ao redefinir password' });
    }
});
router.patch('/users/:id', async (req, res) => {
    try {
        const id = getParamId(req.params);
        const { name, role, organizationId } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const user = await database_1.prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (role)
            updateData.role = role;
        if (organizationId) {
            const org = await database_1.prisma.organization.findUnique({ where: { id: organizationId } });
            if (!org) {
                return res.status(400).json({ error: 'Organização não encontrada' });
            }
            updateData.organizationId = organizationId;
        }
        const updated = await database_1.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                organization: {
                    select: { id: true, name: true, plan: true },
                },
            },
        });
        await logAudit(req, auditService_1.AUDIT_ACTIONS.USER_UPDATED, 'user', id, { name: user.name, updates: updateData });
        res.json(updated);
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Erro ao atualizar utilizador' });
    }
});
router.delete('/users/:id', async (req, res) => {
    try {
        const id = getParamId(req.params);
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const user = await database_1.prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }
        await database_1.prisma.user.delete({ where: { id } });
        await logAudit(req, auditService_1.AUDIT_ACTIONS.USER_DELETED, 'user', id, { name: user.name, email: user.email });
        res.json({ message: 'Utilizador removido com sucesso' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Erro ao remover utilizador' });
    }
});
router.get('/organizations', async (_req, res) => {
    try {
        const orgs = await database_1.prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
                maxLeads: true,
                maxImportBatch: true,
                maxUsers: true,
                _count: {
                    select: { users: true, leads: true },
                },
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });
        res.json(orgs);
    }
    catch (error) {
        console.error('Admin organizations error:', error);
        res.status(500).json({ error: 'Erro ao listar organizações' });
    }
});
router.get('/tenants', async (_req, res) => {
    try {
        const tenants = await database_1.prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
                maxLeads: true,
                maxUsers: true,
                createdAt: true,
                _count: {
                    select: { users: true, leads: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const tenantsWithStats = await Promise.all(tenants.map(async (tenant) => {
            const lastLogin = await database_1.prisma.user.findFirst({
                where: { organizationId: tenant.id },
                orderBy: { lastLoginAt: 'desc' },
                select: { lastLoginAt: true },
            });
            const lastLead = await database_1.prisma.lead.findFirst({
                where: { organizationId: tenant.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            });
            return {
                ...tenant,
                lastLoginAt: lastLogin?.lastLoginAt || null,
                lastLeadAt: lastLead?.createdAt || null,
            };
        }));
        res.json(tenantsWithStats);
    }
    catch (error) {
        console.error('Admin tenants error:', error);
        res.status(500).json({ error: 'Erro ao listar tenants' });
    }
});
router.post('/tenants', async (req, res) => {
    try {
        const { name, plan, maxLeads, maxUsers, maxImportBatch } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        const org = await database_1.prisma.organization.create({
            data: {
                name,
                plan: plan || 'starter',
                maxLeads: maxLeads || 500,
                maxImportBatch: maxImportBatch || 50,
                maxUsers: maxUsers || 1,
            },
        });
        await logAudit(req, auditService_1.AUDIT_ACTIONS.ORGANIZATION_CREATED, 'organization', org.id, { name: org.name });
        res.status(201).json(org);
    }
    catch (error) {
        console.error('Create tenant error:', error);
        res.status(500).json({ error: 'Erro ao criar tenant' });
    }
});
router.patch('/tenants/:id', async (req, res) => {
    try {
        const id = getParamId(req.params);
        const { name, plan, maxLeads, maxUsers, maxImportBatch } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const org = await database_1.prisma.organization.findUnique({ where: { id } });
        if (!org) {
            return res.status(404).json({ error: 'Tenant não encontrado' });
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (plan)
            updateData.plan = plan;
        if (maxLeads !== undefined)
            updateData.maxLeads = maxLeads;
        if (maxUsers !== undefined)
            updateData.maxUsers = maxUsers;
        if (maxImportBatch !== undefined)
            updateData.maxImportBatch = maxImportBatch;
        const updated = await database_1.prisma.organization.update({
            where: { id },
            data: updateData,
        });
        await logAudit(req, 'tenant.updated', 'organization', id, { name: org.name, updates: updateData });
        res.json(updated);
    }
    catch (error) {
        console.error('Update tenant error:', error);
        res.status(500).json({ error: 'Erro ao atualizar tenant' });
    }
});
router.delete('/tenants/:id', async (req, res) => {
    try {
        const id = getParamId(req.params);
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const org = await database_1.prisma.organization.findUnique({ where: { id } });
        if (!org) {
            return res.status(404).json({ error: 'Tenant não encontrado' });
        }
        await database_1.prisma.organization.delete({ where: { id } });
        await logAudit(req, 'tenant.deleted', 'organization', id, { name: org.name });
        res.json({ message: 'Tenant removido com sucesso' });
    }
    catch (error) {
        console.error('Delete tenant error:', error);
        res.status(500).json({ error: 'Erro ao remover tenant' });
    }
});
router.get('/tenants/:id/users', async (req, res) => {
    try {
        const id = getParamId(req.params);
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const users = await database_1.prisma.user.findMany({
            where: { organizationId: id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    }
    catch (error) {
        console.error('Tenant users error:', error);
        res.status(500).json({ error: 'Erro ao listar utilizadores do tenant' });
    }
});
router.post('/tenants/:id/users', async (req, res) => {
    try {
        const id = getParamId(req.params);
        const { name, email, password, role } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e password são obrigatórios' });
        }
        const org = await database_1.prisma.organization.findUnique({ where: { id } });
        if (!org) {
            return res.status(404).json({ error: 'Tenant não encontrado' });
        }
        const existing = await database_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existing) {
            return res.status(400).json({ error: 'Email já registado' });
        }
        const userCount = await database_1.prisma.user.count({ where: { organizationId: id } });
        if (userCount >= org.maxUsers) {
            return res.status(400).json({ error: `Limite de ${org.maxUsers} utilizadores atingido` });
        }
        const { hashPassword } = await Promise.resolve().then(() => __importStar(require('../utils/crypto')));
        const passwordHash = await hashPassword(password);
        const user = await database_1.prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                passwordHash,
                organizationId: id,
                role: role || 'member',
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
        await logAudit(req, auditService_1.AUDIT_ACTIONS.USER_CREATED, 'user', user.id, { name: user.name, email: user.email, tenant: org.name });
        res.status(201).json(user);
    }
    catch (error) {
        console.error('Create tenant user error:', error);
        res.status(500).json({ error: 'Erro ao criar utilizador' });
    }
});
router.post('/organizations', async (req, res) => {
    try {
        const { name, plan, maxLeads, maxUsers, maxImportBatch } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        const org = await database_1.prisma.organization.create({
            data: {
                name,
                plan: plan || 'starter',
                maxLeads: maxLeads || 500,
                maxImportBatch: maxImportBatch || 50,
                maxUsers: maxUsers || 1,
            },
        });
        await logAudit(req, auditService_1.AUDIT_ACTIONS.ORGANIZATION_CREATED, 'organization', org.id, { name: org.name });
        res.status(201).json(org);
    }
    catch (error) {
        console.error('Create organization error:', error);
        res.status(500).json({ error: 'Erro ao criar organização' });
    }
});
router.get('/logs', async (req, res) => {
    try {
        const userId = getQueryString(req.query, 'userId');
        const action = getQueryString(req.query, 'action');
        const entityType = getQueryString(req.query, 'entityType');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const result = await (0, auditService_1.getAuditLogs)({ userId, action, entityType, page, limit });
        res.json(result);
    }
    catch (error) {
        console.error('Admin logs error:', error);
        res.status(500).json({ error: 'Erro ao obter logs' });
    }
});
router.get('/support/diagnostics', async (_req, res) => {
    try {
        const diagnostics = {
            database: {
                users: await database_1.prisma.user.count(),
                organizations: await database_1.prisma.organization.count(),
                leads: await database_1.prisma.lead.count(),
                activities: await database_1.prisma.activity.count(),
                auditLogs: await database_1.prisma.auditLog.count(),
            },
            recentErrors: await database_1.prisma.auditLog.findMany({
                where: {
                    action: { in: ['login.failed', 'user.deleted'] },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            system: {
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
            },
        };
        res.json(diagnostics);
    }
    catch (error) {
        console.error('Diagnostics error:', error);
        res.status(500).json({ error: 'Erro ao obter diagnósticos' });
    }
});
router.get('/users/:id/leads', async (req, res) => {
    try {
        const userId = getParamId(req.params);
        const filterByUserId = req.query.filterByUserId === 'true';
        if (!userId) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const targetUser = await database_1.prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }
        // Se filterByUserId=true, mostra apenas leads criados por este usuário
        // Se false (default), mostra todos os leads da organização
        const whereClause = filterByUserId
            ? { organizationId: targetUser.organizationId, userId: userId }
            : { organizationId: targetUser.organizationId };
        const leads = await database_1.prisma.lead.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });
        res.json({
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                organization: targetUser.organization.name,
            },
            leads,
            totalLeads: leads.length,
            filterApplied: filterByUserId ? 'userId' : 'organization',
        });
    }
    catch (error) {
        console.error('View as user leads error:', error);
        res.status(500).json({ error: 'Erro ao obter leads do utilizador' });
    }
});
router.get('/users/:id/dashboard', async (req, res) => {
    try {
        const userId = getParamId(req.params);
        if (!userId) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const targetUser = await database_1.prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }
        const organizationId = targetUser.organizationId;
        const [totalLeads, leadsByStage, recentLeads, activities,] = await Promise.all([
            database_1.prisma.lead.count({ where: { organizationId } }),
            database_1.prisma.lead.groupBy({
                by: ['pipelineStage'],
                where: { organizationId },
                _count: true,
            }),
            database_1.prisma.lead.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            database_1.prisma.activity.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
        ]);
        res.json({
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                organization: targetUser.organization.name,
            },
            stats: {
                totalLeads,
                leadsByStage,
            },
            recentLeads,
            activities,
        });
    }
    catch (error) {
        console.error('View as user dashboard error:', error);
        res.status(500).json({ error: 'Erro ao obter dashboard do utilizador' });
    }
});
router.get('/users/:id/pipeline', async (req, res) => {
    try {
        const userId = getParamId(req.params);
        if (!userId) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const targetUser = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }
        const leads = await database_1.prisma.lead.findMany({
            where: { organizationId: targetUser.organizationId },
            select: {
                id: true,
                nome: true,
                pipelineStage: true,
                score: true,
            },
        });
        const pipeline = {
            novo: [],
            qualificado: [],
            proposta: [],
            negociacao: [],
            ganho: [],
            perdido: [],
        };
        for (const lead of leads) {
            if (pipeline[lead.pipelineStage]) {
                pipeline[lead.pipelineStage].push({
                    id: lead.id,
                    nome: lead.nome,
                    score: lead.score,
                });
            }
        }
        res.json({
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
            },
            pipeline,
        });
    }
    catch (error) {
        console.error('View as user pipeline error:', error);
        res.status(500).json({ error: 'Erro ao obter pipeline do utilizador' });
    }
});
// System Config Routes
router.get('/config', async (_req, res) => {
    try {
        const config = await database_1.prisma.systemConfig.findUnique({
            where: { id: 'global' }
        });
        res.json(config);
    }
    catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({ error: 'Erro ao obter configuração' });
    }
});
router.patch('/config', async (req, res) => {
    try {
        const { maintenanceMode, maintenanceMsg } = req.body;
        const config = await database_1.prisma.systemConfig.upsert({
            where: { id: 'global' },
            update: {
                maintenanceMode,
                maintenanceMsg,
            },
            create: {
                id: 'global',
                maintenanceMode: maintenanceMode ?? false,
                maintenanceMsg: maintenanceMsg ?? 'Estamos em manutenção para melhorar a sua experiência. Voltamos em breve!',
            },
        });
        await logAudit(req, 'config.updated', 'system_config', 'global', { maintenanceMode, maintenanceMsg });
        res.json(config);
    }
    catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
});
// ORCA LEADS (Inbound from Landing Page)
router.get('/orca-leads', async (_req, res) => {
    try {
        const leads = await database_1.prisma.orcaLead.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(leads);
    }
    catch (error) {
        console.error('Admin orca-leads error:', error);
        res.status(500).json({ error: 'Erro ao listar leads da ORCA' });
    }
});
router.patch('/orca-leads/:id/status', async (req, res) => {
    try {
        const id = getParamId(req.params);
        const { status } = req.body;
        if (!id)
            return res.status(400).json({ error: 'ID é obrigatório' });
        const lead = await database_1.prisma.orcaLead.update({
            where: { id },
            data: { status },
        });
        res.json(lead);
    }
    catch (error) {
        console.error('Update orca-lead status error:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});
router.delete('/orca-leads/:id', async (req, res) => {
    try {
        const id = getParamId(req.params);
        if (!id)
            return res.status(400).json({ error: 'ID é obrigatório' });
        await database_1.prisma.orcaLead.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete orca-lead error:', error);
        res.status(500).json({ error: 'Erro ao remover lead' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map