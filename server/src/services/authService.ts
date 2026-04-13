import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import type { RegisterInput, LoginInput } from '../types/auth.js';

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existing) {
    throw new Error('Email já registado');
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: input.organizationName,
        plan: 'starter',
        maxLeads: 500,
        maxUsers: 1,
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

  const accessToken = generateAccessToken({
    sub: result.user.id,
    organizationId: result.org.id,
    role: result.user.role,
    name: result.user.name,
    email: result.user.email,
  });

  const refreshToken = generateRefreshToken(result.user.id);

  await prisma.refreshToken.create({
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
      organizationId: result.org.id,
      organizationName: result.org.name,
    },
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: { organization: true },
  });

  if (!user || !user.isActive) {
    throw new Error('Credenciais inválidas');
  }

  const isValid = await comparePassword(input.password, user.passwordHash);

  if (!isValid) {
    throw new Error('Credenciais inválidas');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = generateAccessToken({
    sub: user.id,
    organizationId: user.organizationId,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.deleteMany({
    where: { userId: user.id },
  });

  await prisma.refreshToken.create({
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
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(userId: string, token: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date() || stored.userId !== userId) {
    throw new Error('Refresh token inválido');
  }

  const decoded = verifyRefreshToken(token);

  if (!decoded || decoded.sub !== userId) {
    throw new Error('Refresh token inválido');
  }

  await prisma.refreshToken.delete({ where: { token } });

  const user = stored.user;

  const newAccessToken = generateAccessToken({
    sub: user.id,
    organizationId: user.organizationId,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  const newRefreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string, token: string) {
  await prisma.refreshToken.deleteMany({
    where: { userId, token },
  });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          plan: true,
          maxLeads: true,
          maxUsers: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('Utilizador não encontrado');
  }

  return user;
}
