"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_ACTIONS = void 0;
exports.createAuditLog = createAuditLog;
exports.getAuditLogs = getAuditLogs;
const database_1 = require("../config/database");
async function createAuditLog(params) {
    return database_1.prisma.auditLog.create({
        data: {
            userId: params.userId,
            userEmail: params.userEmail,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            details: params.details || {},
            organizationId: params.organizationId,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        },
    });
}
async function getAuditLogs(params) {
    const where = {};
    if (params.userId)
        where.userId = params.userId;
    if (params.action)
        where.action = params.action;
    if (params.entityType)
        where.entityType = params.entityType;
    if (params.entityId)
        where.entityId = params.entityId;
    if (params.from || params.to) {
        where.createdAt = {};
        if (params.from)
            where.createdAt.gte = params.from;
        if (params.to)
            where.createdAt.lte = params.to;
    }
    const page = params.page || 1;
    const limit = params.limit || 50;
    const [logs, total] = await Promise.all([
        database_1.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        database_1.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, limit };
}
exports.AUDIT_ACTIONS = {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_ACTIVATED: 'user.activated',
    USER_DEACTIVATED: 'user.deactivated',
    PASSWORD_RESET: 'password.reset',
    LOGIN_SUCCESS: 'login.success',
    LOGIN_FAILED: 'login.failed',
    LOGOUT: 'logout',
    ORGANIZATION_CREATED: 'organization.created',
    LEAD_IMPORTED: 'lead.imported',
    LEAD_UPDATED: 'lead.updated',
    LEAD_DELETED: 'lead.deleted',
    SETTINGS_UPDATED: 'settings.updated',
    EXPORT_DATA: 'export.data',
};
//# sourceMappingURL=auditService.js.map