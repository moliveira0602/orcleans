import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

export interface AuditAction {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export async function createAuditLog(params: {
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details as Prisma.InputJsonValue || {},
      organizationId: params.organizationId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function getAuditLogs(params: {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};

  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action;
  if (params.entityType) where.entityType = params.entityType;
  if (params.entityId) where.entityId = params.entityId;

  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) (where.createdAt as Record<string, Date>).gte = params.from;
    if (params.to) (where.createdAt as Record<string, Date>).lte = params.to;
  }

  const page = params.page || 1;
  const limit = params.limit || 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}

export const AUDIT_ACTIONS = {
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
} as const;