import { z } from 'zod';
export declare const ROLES: {
    readonly SUPER_ADMIN: "super_admin";
    readonly ADMIN: "admin";
    readonly MEMBER: "member";
};
export type Role = typeof ROLES[keyof typeof ROLES];
export declare const PERMISSIONS: {
    readonly MANAGE_USERS: "manage_users";
    readonly RESET_PASSWORD: "reset_password";
    readonly VIEW_PLATFORM_STATUS: "view_platform_status";
    readonly VIEW_LOGS: "view_logs";
    readonly VIEW_ALL_ORGANIZATIONS: "view_all_organizations";
    readonly MANAGE_ORGANIZATIONS: "manage_organizations";
    readonly SUPPORT_TOOLS: "support_tools";
};
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export declare const ROLE_PERMISSIONS: Record<Role, Permission[]>;
export declare function hasPermission(role: Role, permission: Permission): boolean;
export declare function isSuperAdmin(role: Role): boolean;
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    organizationName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    organizationName: string;
}, {
    name: string;
    email: string;
    password: string;
    organizationName: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    userId: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    newPassword: string;
}, {
    userId: string;
    newPassword: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
//# sourceMappingURL=auth.d.ts.map