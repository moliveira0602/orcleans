interface TokenPayload {
    sub: string;
    organizationId: string;
    role: string;
    name: string;
    email: string;
}
export declare function generateAccessToken(payload: TokenPayload): string;
export declare function generateRefreshToken(userId: string): string;
export declare function verifyRefreshToken(token: string): {
    sub: string;
} | null;
export {};
//# sourceMappingURL=jwt.d.ts.map