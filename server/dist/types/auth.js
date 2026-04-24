"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = exports.ROLE_PERMISSIONS = exports.PERMISSIONS = exports.ROLES = void 0;
exports.hasPermission = hasPermission;
exports.isSuperAdmin = isSuperAdmin;
const zod_1 = require("zod");
exports.ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MEMBER: 'member',
};
exports.PERMISSIONS = {
    MANAGE_USERS: 'manage_users',
    RESET_PASSWORD: 'reset_password',
    VIEW_PLATFORM_STATUS: 'view_platform_status',
    VIEW_LOGS: 'view_logs',
    VIEW_ALL_ORGANIZATIONS: 'view_all_organizations',
    MANAGE_ORGANIZATIONS: 'manage_organizations',
    SUPPORT_TOOLS: 'support_tools',
};
exports.ROLE_PERMISSIONS = {
    [exports.ROLES.SUPER_ADMIN]: Object.values(exports.PERMISSIONS),
    [exports.ROLES.ADMIN]: [],
    [exports.ROLES.MEMBER]: [],
};
function hasPermission(role, permission) {
    return exports.ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
function isSuperAdmin(role) {
    return role === exports.ROLES.SUPER_ADMIN;
}
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
    organizationName: zod_1.z.string().min(2, 'Nome da organização é obrigatório'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(1, 'Password é obrigatória'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token é obrigatório'),
});
exports.resetPasswordSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('ID de utilizador inválido'),
    newPassword: zod_1.z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
});
//# sourceMappingURL=auth.js.map