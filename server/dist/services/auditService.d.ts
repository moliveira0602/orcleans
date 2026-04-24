import { Prisma } from '@prisma/client';
export interface AuditAction {
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
}
export declare function createAuditLog(params: {
    userId?: string;
    userEmail?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    organizationId: string | null;
    userId: string | null;
    userEmail: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    details: Prisma.JsonValue;
    ipAddress: string | null;
    userAgent: string | null;
}>;
export declare function getAuditLogs(params: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
}): Promise<{
    logs: {
        id: string;
        createdAt: Date;
        organizationId: string | null;
        userId: string | null;
        userEmail: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        details: Prisma.JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
    }[];
    total: number;
    page: number;
    limit: number;
}>;
export declare const AUDIT_ACTIONS: {
    readonly USER_CREATED: "user.created";
    readonly USER_UPDATED: "user.updated";
    readonly USER_DELETED: "user.deleted";
    readonly USER_ACTIVATED: "user.activated";
    readonly USER_DEACTIVATED: "user.deactivated";
    readonly PASSWORD_RESET: "password.reset";
    readonly LOGIN_SUCCESS: "login.success";
    readonly LOGIN_FAILED: "login.failed";
    readonly LOGOUT: "logout";
    readonly ORGANIZATION_CREATED: "organization.created";
    readonly LEAD_IMPORTED: "lead.imported";
    readonly LEAD_UPDATED: "lead.updated";
    readonly LEAD_DELETED: "lead.deleted";
    readonly SETTINGS_UPDATED: "settings.updated";
    readonly EXPORT_DATA: "export.data";
};
//# sourceMappingURL=auditService.d.ts.map