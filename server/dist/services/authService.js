"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refreshTokens = refreshTokens;
exports.logout = logout;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.deleteAccount = deleteAccount;
const database_1 = require("../config/database");
const crypto_1 = require("../utils/crypto");
const jwt_1 = require("../utils/jwt");
async function register(input) {
    const existing = await database_1.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
    });
    if (existing) {
        throw new Error('Email já registado');
    }
    const passwordHash = await (0, crypto_1.hashPassword)(input.password);
    const result = await database_1.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
            data: {
                name: input.organizationName,
                plan: 'trial',
                maxLeads: 20,
                maxUsers: 1,
                trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days trial
            },
        });
        const user = await tx.user.create({
            data: {
                organizationId: org.id,
                name: input.name,
                email: input.email.toLowerCase(),
                passwordHash,
                role: 'admin',
            },
        });
        return { org, user };
    });
    const accessToken = (0, jwt_1.generateAccessToken)({
        sub: result.user.id,
        organizationId: result.org.id,
        role: result.user.role,
        name: result.user.name,
        email: result.user.email,
    });
    const refreshToken = (0, jwt_1.generateRefreshToken)(result.user.id);
    await database_1.prisma.refreshToken.create({
        data: {
            userId: result.user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    return {
        user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            company: result.user.company,
            organizationId: result.org.id,
            organizationName: result.org.name,
        },
        accessToken,
        refreshToken,
    };
}
async function login(input) {
    const user = await database_1.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
        include: { organization: true },
    });
    if (!user || !user.isActive) {
        throw new Error('Credenciais inválidas');
    }
    const isValid = await (0, crypto_1.comparePassword)(input.password, user.passwordHash);
    if (!isValid) {
        throw new Error('Credenciais inválidas');
    }
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    const accessToken = (0, jwt_1.generateAccessToken)({
        sub: user.id,
        organizationId: user.organizationId,
        role: user.role,
        name: user.name,
        email: user.email,
    });
    const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
    await database_1.prisma.refreshToken.deleteMany({
        where: { userId: user.id },
    });
    await database_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company: user.company,
            organizationId: user.organizationId,
            organizationName: user.organization.name,
        },
        accessToken,
        refreshToken,
    };
}
async function refreshTokens(userId, token) {
    const stored = await database_1.prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date() || stored.userId !== userId) {
        throw new Error('Refresh token inválido');
    }
    const decoded = (0, jwt_1.verifyRefreshToken)(token);
    if (!decoded || decoded.sub !== userId) {
        throw new Error('Refresh token inválido');
    }
    await database_1.prisma.refreshToken.delete({ where: { token } });
    const user = stored.user;
    const newAccessToken = (0, jwt_1.generateAccessToken)({
        sub: user.id,
        organizationId: user.organizationId,
        role: user.role,
        name: user.name,
        email: user.email,
    });
    const newRefreshToken = (0, jwt_1.generateRefreshToken)(user.id);
    await database_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: newRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
async function logout(userId, token) {
    await database_1.prisma.refreshToken.deleteMany({
        where: { userId, token },
    });
}
async function getProfile(userId) {
    const user = await database_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            company: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    plan: true,
                    maxLeads: true,
                    leadsConsumed: true,
                    maxUsers: true,
                    trialExpiresAt: true,
                    lastBillingDate: true,
                    stripeId: true,
                },
            },
        },
    });
    if (!user) {
        throw new Error('Utilizador não encontrado');
    }
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        company: user.company,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        organization: user.organization,
    };
}
async function updateProfile(userId, data) {
    const updateData = {};
    if (data.name !== undefined)
        updateData.name = data.name;
    if (data.email !== undefined)
        updateData.email = data.email.toLowerCase();
    if (data.company !== undefined)
        updateData.company = data.company;
    const user = await database_1.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            company: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    plan: true,
                    maxLeads: true,
                    leadsConsumed: true,
                    maxUsers: true,
                    trialExpiresAt: true,
                    lastBillingDate: true,
                    stripeId: true,
                },
            },
        },
    });
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        company: user.company,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        organization: user.organization,
    };
}
async function deleteAccount(userId, organizationId) {
    // Delete in order to respect foreign key constraints
    // 1. Delete refresh tokens
    await database_1.prisma.refreshToken.deleteMany({
        where: { userId },
    });
    // 2. Delete activities
    await database_1.prisma.activity.deleteMany({
        where: { userId },
    });
    // 3. Delete leads (and their notes via cascade)
    await database_1.prisma.lead.deleteMany({
        where: { organizationId },
    });
    // 4. Delete audit logs
    await database_1.prisma.auditLog.deleteMany({
        where: { organizationId },
    });
    // 5. Delete all users in the organization
    await database_1.prisma.user.deleteMany({
        where: { organizationId },
    });
    // 7. Finally, delete the organization
    await database_1.prisma.organization.delete({
        where: { id: organizationId },
    });
}
//# sourceMappingURL=authService.js.map