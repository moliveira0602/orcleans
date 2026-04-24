import type { RegisterInput, LoginInput } from '../types/auth.js';
export declare function register(input: RegisterInput): Promise<{
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        organizationId: string;
        organizationName: string;
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function login(input: LoginInput): Promise<{
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        organizationId: string;
        organizationName: string;
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function refreshTokens(userId: string, token: string): Promise<{
    accessToken: string;
    refreshToken: string;
}>;
export declare function logout(userId: string, token: string): Promise<void>;
export declare function getProfile(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    organization: {
        name: string;
        id: string;
        plan: string;
        maxLeads: number;
        maxUsers: number;
    };
}>;
//# sourceMappingURL=authService.d.ts.map