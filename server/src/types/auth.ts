import { z } from 'zod';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  RESET_PASSWORD: 'reset_password',
  VIEW_PLATFORM_STATUS: 'view_platform_status',
  VIEW_LOGS: 'view_logs',
  VIEW_ALL_ORGANIZATIONS: 'view_all_organizations',
  MANAGE_ORGANIZATIONS: 'manage_organizations',
  SUPPORT_TOOLS: 'support_tools',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [],
  [ROLES.MEMBER]: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isSuperAdmin(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
  organizationName: z.string().min(2, 'Nome da organização é obrigatório'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password é obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

export const resetPasswordSchema = z.object({
  userId: z.string().uuid('ID de utilizador inválido'),
  newPassword: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
